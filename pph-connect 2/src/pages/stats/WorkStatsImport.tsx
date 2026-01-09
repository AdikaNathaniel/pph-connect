import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  Upload,
  Download,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react'
import Papa from 'papaparse'
import { workStatRowSchema, type WorkStatRow, type WorkStatValidationError } from '@/lib/schemas/workStats'
import {
  validateWorkStatRow,
  insertWorkStats,
} from '@/services/workStatsService'

const REQUIRED_COLUMNS = [
  'worker_id',
  'project_id',
  'work_date',
]

const OPTIONAL_COLUMNS = [
  'worker_account_id',
  'units_completed',
  'hours_worked',
  'earnings',
]

export default function WorkStatsImport() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [file, setFile] = useState<File | null>(null)
  const [validRows, setValidRows] = useState<WorkStatRow[]>([])
  const [errors, setErrors] = useState<WorkStatValidationError[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResults, setImportResults] = useState<{
    successful: number
    failed: number
    errors: WorkStatValidationError[]
  } | null>(null)

  // Generate CSV template
  const downloadTemplate = () => {
    const allColumns = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]

    // Example rows with realistic data from seed file
    const template = [
      allColumns.join(','),
      // Example 1: Complete row with all fields
      'b1111111-1111-1111-1111-111111111111,c1111111-1111-1111-1111-111111111111,d1111111-1111-1111-1111-111111111111,2025-01-08,150,8,200.00',
      // Example 2: Row with optional fields as empty
      'b2222222-2222-2222-2222-222222222222,,d1111111-1111-1111-1111-111111111111,2025-01-07,180,8,200.00',
      // Example 3: Minimal required fields only
      'b3333333-3333-3333-3333-333333333333,,d3333333-3333-3333-3333-333333333333,2025-01-06,,,',
    ].join('\n')

    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'work_stats_import_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: 'Template Downloaded',
      description: 'CSV template downloaded successfully',
    })
  }

  // Download error report
  const downloadErrorReport = () => {
    if (errors.length === 0) return

    const errorRows = errors.map((err) => ({
      row: err.row,
      field: err.field || 'general',
      message: err.message,
      worker_id: err.data?.worker_id || '',
      project_id: err.data?.project_id || '',
      work_date: err.data?.work_date || '',
    }))

    const csv = Papa.unparse(errorRows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'work_stats_import_errors.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: 'Error Report Downloaded',
      description: `Downloaded error report with ${errors.length} error(s)`,
    })
  }

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setErrors([])
      setValidRows([])
      setImportResults(null)
    }
  }

  // Validate CSV file
  const validateFile = async () => {
    if (!file) return

    setIsValidating(true)
    setErrors([])
    setValidRows([])

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const validationErrors: WorkStatValidationError[] = []
        const parsedValidRows: WorkStatRow[] = []

        // Check for required columns
        const headers = Object.keys(results.data[0] || {})
        const missingColumns = REQUIRED_COLUMNS.filter((col) => !headers.includes(col))

        if (missingColumns.length > 0) {
          validationErrors.push({
            row: 0,
            field: 'headers',
            message: `Missing required columns: ${missingColumns.join(', ')}`,
          })
          setErrors(validationErrors)
          setIsValidating(false)
          return
        }

        // Validate each row
        for (let i = 0; i < results.data.length; i++) {
          const rawRow = results.data[i]
          const rowNumber = i + 2 // +2 for 1-based index and header row

          try {
            // Schema validation
            const validatedRow = workStatRowSchema.parse({
              worker_id: rawRow.worker_id?.trim(),
              worker_account_id: rawRow.worker_account_id?.trim() || null,
              project_id: rawRow.project_id?.trim(),
              work_date: rawRow.work_date?.trim(),
              units_completed: rawRow.units_completed?.trim() || null,
              hours_worked: rawRow.hours_worked?.trim() || null,
              earnings: rawRow.earnings?.trim() || null,
            })

            // Business logic validation
            const businessErrors = await validateWorkStatRow(validatedRow, rowNumber)
            if (businessErrors.length > 0) {
              validationErrors.push(...businessErrors)
            } else {
              parsedValidRows.push(validatedRow)
            }
          } catch (error: any) {
            const zodErrors = error.errors || []
            zodErrors.forEach((zodError: any) => {
              validationErrors.push({
                row: rowNumber,
                field: zodError.path.join('.'),
                message: zodError.message,
                data: rawRow as any,
              })
            })
          }
        }

        setErrors(validationErrors)
        setValidRows(parsedValidRows)
        setIsValidating(false)

        if (validationErrors.length === 0) {
          toast({
            title: 'Validation Successful',
            description: `${parsedValidRows.length} rows are valid and ready to import`,
          })
        } else {
          toast({
            variant: 'destructive',
            title: 'Validation Errors Found',
            description: `Found ${validationErrors.length} error(s) in the CSV file`,
          })
        }
      },
      error: (error) => {
        setIsValidating(false)
        toast({
          variant: 'destructive',
          title: 'Parse Error',
          description: `Failed to parse CSV: ${error.message}`,
        })
      },
    })
  }

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (rows: WorkStatRow[]) => {
      setImportProgress(0)
      const result = await insertWorkStats(rows, user?.id || null)
      setImportProgress(100)
      return result
    },
    onSuccess: (result) => {
      setImportResults({
        successful: result.successCount,
        failed: result.errorCount,
        errors: result.errors,
      })

      if (result.errorCount > 0) {
        setErrors(result.errors)
      }

      queryClient.invalidateQueries({ queryKey: ['work-stats'] })

      toast({
        title: result.errorCount === 0 ? 'Import Successful' : 'Import Completed with Errors',
        description:
          result.errorCount === 0
            ? `Successfully imported ${result.successCount} work stat record(s)`
            : `Imported ${result.successCount} record(s), ${result.errorCount} failed`,
        variant: result.errorCount === 0 ? 'default' : 'destructive',
      })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: error.message,
      })
    },
  })

  // Handle import
  const handleImport = () => {
    if (validRows.length === 0) return
    importMutation.mutate(validRows)
  }

  // Reset form
  const handleReset = () => {
    setFile(null)
    setValidRows([])
    setErrors([])
    setImportResults(null)
    setImportProgress(0)
    const fileInput = document.getElementById('csv-upload') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Work Stats Import</h1>
        <p className="text-muted-foreground">
          Bulk import work statistics from CSV files
        </p>
      </div>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            CSV File Upload
          </CardTitle>
          <CardDescription>
            Download the template, fill in your work stats data, and upload the file for validation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={downloadTemplate} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>

          <div className="space-y-2">
            <label htmlFor="csv-upload" className="text-sm font-medium">
              Select CSV File
            </label>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90
                file:cursor-pointer cursor-pointer"
            />
          </div>

          {file && (
            <div className="flex items-center gap-2 text-sm">
              <FileCheck className="h-4 w-4 text-green-600" />
              <span>Selected: {file.name}</span>
              <Badge variant="secondary">{(file.size / 1024).toFixed(2)} KB</Badge>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={validateFile} disabled={!file || isValidating}>
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <FileCheck className="mr-2 h-4 w-4" />
                  Validate File
                </>
              )}
            </Button>

            {(validRows.length > 0 || errors.length > 0) && (
              <Button onClick={handleReset} variant="outline">
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {(validRows.length > 0 || errors.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {errors.length === 0 ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Validation Successful
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  Validation Results
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Valid Rows</p>
                <p className="text-2xl font-bold text-green-600">{validRows.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Errors</p>
                <p className="text-2xl font-bold text-red-600">{errors.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Total Rows</p>
                <p className="text-2xl font-bold">{validRows.length + errors.length}</p>
              </div>
            </div>

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Found {errors.length} validation error(s). Please fix the errors before importing.
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-4"
                    onClick={downloadErrorReport}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Error Report
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Error Details */}
            {errors.length > 0 && errors.length <= 50 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Error Details:</h4>
                <ScrollArea className="h-[300px] rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errors.slice(0, 50).map((error, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{error.row}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{error.field || 'general'}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {error.message}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                {errors.length > 50 && (
                  <p className="text-sm text-muted-foreground">
                    Showing first 50 errors. Download the error report to see all errors.
                  </p>
                )}
              </div>
            )}

            {/* Import Button */}
            {validRows.length > 0 && errors.length === 0 && (
              <Button
                onClick={handleImport}
                disabled={importMutation.isPending}
                className="w-full"
                size="lg"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing {validRows.length} Record(s)...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import {validRows.length} Work Stat Record(s)
                  </>
                )}
              </Button>
            )}

            {/* Import Progress */}
            {importMutation.isPending && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Import Progress</span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Successfully Imported</p>
                <p className="text-2xl font-bold text-green-600">{importResults.successful}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Failed</p>
                <p className="text-2xl font-bold text-red-600">{importResults.failed}</p>
              </div>
            </div>

            {importResults.failed > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {importResults.failed} record(s) failed to import. Check the error details below.
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-4"
                    onClick={downloadErrorReport}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Error Report
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={handleReset} variant="outline" className="w-full">
              Import Another File
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Import Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Required Columns:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">worker_id</code> - UUID of
                the worker
              </li>
              <li>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">project_id</code> - UUID of
                the project
              </li>
              <li>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">work_date</code> - Date in
                YYYY-MM-DD format
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Optional Columns:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">worker_account_id</code> -
                UUID of the worker account
              </li>
              <li>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">units_completed</code> -
                Number of units completed
              </li>
              <li>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">hours_worked</code> - Decimal
                hours worked (max 24)
              </li>
              <li>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">earnings</code> - Decimal
                earnings amount
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Validation Rules:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Worker ID must exist in the database</li>
              <li>Project ID must exist in the database</li>
              <li>Worker account ID must exist if provided</li>
              <li>Work date cannot be in the future</li>
              <li>Hours worked must be between 0 and 24</li>
              <li>Duplicate entries (same worker, project, and date) are not allowed</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
