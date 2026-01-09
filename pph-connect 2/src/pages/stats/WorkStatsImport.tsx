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
import {
  workStatCsvRowSchema,
  type WorkStatCsvRow,
  type WorkStatRow,
  type WorkStatValidationError
} from '@/lib/schemas/workStats'
import {
  resolveWorkStatRow,
  validateWorkStatRow,
  insertWorkStats,
  lookupRate,
  calculateEarnings,
} from '@/services/workStatsService'

const REQUIRED_COLUMNS = [
  'worker_account_email',
  'project_code',
  'work_date',
]

const OPTIONAL_COLUMNS = [
  'locale_code',
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

  // Generate CSV template with user-friendly columns and dynamic dates
  const downloadTemplate = () => {
    const allColumns = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]

    // Generate unique dates based on current timestamp to avoid duplicates
    const now = new Date()
    const baseDate = new Date(now)
    // Use random offset starting from 30 days back (to avoid seed data which uses 7, 14, 21 days)
    // Range: 30-200 days back to ensure no collision with existing data
    const randomOffset = Math.floor(Math.random() * 170) + 30

    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0]
    }

    // Generate 3 different dates going backwards from the random offset
    const date1 = new Date(baseDate)
    date1.setDate(date1.getDate() - randomOffset)
    const date2 = new Date(baseDate)
    date2.setDate(date2.getDate() - randomOffset - 1)
    const date3 = new Date(baseDate)
    date3.setDate(date3.getDate() - randomOffset - 2)

    // Uses real emails and project codes from seed data with dynamic dates
    // Format: worker_account_email,project_code,work_date,locale_code,units_completed,hours_worked,earnings
    const template = [
      allColumns.join(','),
      // Example 1: John Doe - with explicit earnings
      `john.doe@pph.com,VA-ENG-2024,${formatDate(date1)},en-US,150,8,200.00`,
      // Example 2: Jane Smith - earnings will be auto-calculated (empty earnings field)
      `jane.smith@pph.com,VA-ENG-2024,${formatDate(date2)},en-GB,180,8,`,
      // Example 3: Carlos Garcia - with locale that may need mapping
      `carlos.garcia@pph.com,AUD-SPA-2024,${formatDate(date3)},es-MX,100,6,150.00`,
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
      worker_account_email: err.data?.worker_account_email || '',
      project_code: err.data?.project_code || '',
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
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'No File Selected',
        description: 'Please select a CSV file first',
      })
      return
    }

    setIsValidating(true)
    setErrors([])
    setValidRows([])

    try {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const validationErrors: WorkStatValidationError[] = []
            const parsedValidRows: WorkStatRow[] = []

            // Check if file has any data
            if (!results.data || results.data.length === 0) {
              validationErrors.push({
                row: 0,
                field: 'file',
                message: 'CSV file is empty or has no data rows',
              })
              setErrors(validationErrors)
              setIsValidating(false)
              toast({
                variant: 'destructive',
                title: 'Empty File',
                description: 'The CSV file contains no data rows',
              })
              return
            }

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
              toast({
                variant: 'destructive',
                title: 'Missing Columns',
                description: `Required columns missing: ${missingColumns.join(', ')}`,
              })
              return
            }

            // Validate each row
            for (let i = 0; i < results.data.length; i++) {
              const rawRow = results.data[i]
              const rowNumber = i + 2 // +2 for 1-based index and header row

              try {
                // Schema validation for CSV row (includes locale_code)
                const csvRow: WorkStatCsvRow = workStatCsvRowSchema.parse({
                  worker_account_email: rawRow.worker_account_email?.trim(),
                  project_code: rawRow.project_code?.trim(),
                  work_date: rawRow.work_date?.trim(),
                  locale_code: rawRow.locale_code?.trim() || null,
                  units_completed: rawRow.units_completed?.trim() || null,
                  hours_worked: rawRow.hours_worked?.trim() || null,
                  earnings: rawRow.earnings?.trim() || null,
                })

                // Resolve email/code to IDs (also handles locale mapping)
                const { result: lookupResult, errors: lookupErrors } = await resolveWorkStatRow(csvRow, rowNumber)

                if (lookupErrors.length > 0) {
                  validationErrors.push(...lookupErrors)
                  continue
                }

                if (!lookupResult) {
                  continue
                }

                // Determine earnings - use provided value or auto-calculate from rates
                let finalEarnings = csvRow.earnings
                if (!finalEarnings && (csvRow.units_completed || csvRow.hours_worked)) {
                  // Auto-calculate earnings from rates_payable
                  const rate = await lookupRate(
                    lookupResult.worker_locale,
                    lookupResult.worker_country,
                    lookupResult.project_expert_tier,
                    csvRow.work_date
                  )
                  if (rate) {
                    finalEarnings = calculateEarnings(
                      csvRow.units_completed,
                      csvRow.hours_worked,
                      rate
                    )
                  }
                }

                // Create resolved row with IDs
                const resolvedRow: WorkStatRow = {
                  worker_id: lookupResult.worker_id,
                  worker_account_id: lookupResult.worker_account_id,
                  project_id: lookupResult.project_id,
                  work_date: csvRow.work_date,
                  units_completed: csvRow.units_completed,
                  hours_worked: csvRow.hours_worked,
                  earnings: finalEarnings,
                }

                // Business logic validation
                const businessErrors = await validateWorkStatRow(resolvedRow, csvRow, rowNumber)
                if (businessErrors.length > 0) {
                  validationErrors.push(...businessErrors)
                } else {
                  parsedValidRows.push(resolvedRow)
                }
              } catch (error: any) {
                // Handle Zod validation errors
                if (error.errors && Array.isArray(error.errors)) {
                  error.errors.forEach((zodError: any) => {
                    const fieldName = Array.isArray(zodError.path)
                      ? zodError.path.join('.')
                      : zodError.path || 'unknown'

                    validationErrors.push({
                      row: rowNumber,
                      field: fieldName,
                      message: zodError.message || 'Invalid value',
                      data: rawRow as any,
                    })
                  })
                } else if (error.issues && Array.isArray(error.issues)) {
                  error.issues.forEach((issue: any) => {
                    const fieldName = Array.isArray(issue.path)
                      ? issue.path.join('.')
                      : 'unknown'

                    validationErrors.push({
                      row: rowNumber,
                      field: fieldName,
                      message: issue.message || 'Invalid value',
                      data: rawRow as any,
                    })
                  })
                } else {
                  validationErrors.push({
                    row: rowNumber,
                    field: 'unknown',
                    message: typeof error.message === 'string' ? error.message : 'Validation error',
                    data: rawRow as any,
                  })
                }
              }
            }

            setErrors(validationErrors)
            setValidRows(parsedValidRows)
            setIsValidating(false)

            if (validationErrors.length === 0 && parsedValidRows.length > 0) {
              toast({
                title: 'Validation Successful',
                description: `${parsedValidRows.length} rows are valid and ready to import`,
              })
            } else if (parsedValidRows.length > 0) {
              toast({
                variant: 'destructive',
                title: 'Validation Completed',
                description: `${parsedValidRows.length} valid rows, ${validationErrors.length} error(s) found`,
              })
            } else {
              toast({
                variant: 'destructive',
                title: 'Validation Failed',
                description: `All ${validationErrors.length} rows have errors`,
              })
            }
          } catch (err: any) {
            setIsValidating(false)
            toast({
              variant: 'destructive',
              title: 'Validation Error',
              description: err.message || 'An error occurred during validation',
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
    } catch (err: any) {
      setIsValidating(false)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'An unexpected error occurred',
      })
    }
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
                        <TableHead className="w-16">Row</TableHead>
                        <TableHead className="w-32">Field</TableHead>
                        <TableHead>Error Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errors.slice(0, 50).map((error, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-sm">{error.row}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {error.field || 'general'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-md">
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

            {/* Import Button - Show when there are valid rows */}
            {validRows.length > 0 && (
              <div className="space-y-2">
                {errors.length > 0 && (
                  <p className="text-sm text-amber-600">
                    Note: {errors.length} row(s) have errors and will be skipped. Only {validRows.length} valid row(s) will be imported.
                  </p>
                )}
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
                      Import {validRows.length} Valid Work Stat Record(s)
                    </>
                  )}
                </Button>
              </div>
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
                <code className="text-xs bg-muted px-1 py-0.5 rounded">worker_account_email</code> - Worker's PPH email (e.g., john.doe@pph.com)
              </li>
              <li>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">project_code</code> - Project code (e.g., VA-ENG-2024)
              </li>
              <li>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">work_date</code> - Date in YYYY-MM-DD or DD/MM/YYYY format
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Optional Columns:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">locale_code</code> - Client locale code (will be mapped to ISO standard)
              </li>
              <li>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">units_completed</code> - Number of units completed
              </li>
              <li>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">hours_worked</code> - Decimal hours worked (max 24)
              </li>
              <li>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">earnings</code> - Decimal earnings amount (auto-calculated if not provided)
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Auto-Calculation Features:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Locale Mapping:</strong> Client locale codes are automatically mapped to ISO standard codes</li>
              <li><strong>Earnings Calculation:</strong> If earnings is not provided, it will be auto-calculated using the rates_payable table based on worker locale, country, project tier, and work date</li>
              <li>Rate lookup uses: worker's locale + country + project expert tier + effective date</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Validation Rules:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Worker email must match an active worker account</li>
              <li>Project code must exist in the database</li>
              <li>Work date cannot be in the future</li>
              <li>Hours worked must be between 0 and 24</li>
              <li>Duplicate entries (same worker, project, and date) are not allowed</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Example Project Codes:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">VA-ENG-2024</code> - Voice Assistant Training - English</li>
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">MED-IMG-2024</code> - Medical Image Annotation</li>
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">AUD-SPA-2024</code> - Spanish Audio Transcription</li>
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">NLP-SENT-2024</code> - Sentiment Analysis Dataset</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
