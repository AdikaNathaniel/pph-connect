import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Loader2, Upload, Download, FileCheck, AlertCircle, CheckCircle2 } from 'lucide-react'
import Papa from 'papaparse'

type ValidationError = {
  row: number
  field: string
  message: string
  value?: string
}

type WorkerRow = {
  hr_id: string
  full_name: string
  engagement_model: 'core' | 'upwork' | 'external' | 'internal'
  email_personal: string
  email_pph?: string
  country_residence: string
  locale_primary: string
  locale_all?: string[] // Additional locales (comma-separated in CSV)
  hire_date: string
  status: 'pending' | 'active' | 'inactive' | 'terminated'
  worker_role?: string
  rtw_datetime?: string // Ready to work datetime (required for active/inactive workers)
  termination_date?: string // Required for terminated workers
  bgc_expiration_date?: string // Background check expiration date
}

const REQUIRED_COLUMNS = [
  'hr_id',
  'full_name',
  'engagement_model',
  'email_personal',
  'country_residence',
  'locale_primary',
  'hire_date',
  'status',
]

const VALID_ENGAGEMENT_MODELS = ['core', 'upwork', 'external', 'internal']
const VALID_STATUSES = ['pending', 'active', 'inactive', 'terminated']

type BulkUploadDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BulkUploadDialog({ open, onOpenChange }: BulkUploadDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [file, setFile] = useState<File | null>(null)
  const [validRows, setValidRows] = useState<WorkerRow[]>([])
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResults, setImportResults] = useState<{
    successful: number
    failed: number
    errors: Array<{ row: number; error: string }>
  } | null>(null)
  const [showRtwFix, setShowRtwFix] = useState(false)
  const [applyRtwFix, setApplyRtwFix] = useState(false)

  // Generate CSV template
  const downloadTemplate = () => {
    // Generate unique example IDs to avoid conflicts
    const timestamp = Date.now()
    const exampleHrId1 = `HR-${timestamp}-001`
    const exampleHrId2 = `HR-${timestamp}-002`
    const exampleEmail1 = `worker1.${timestamp}@example.com`
    const exampleEmail2 = `worker2.${timestamp}@example.com`

    // All columns including optional ones for migration data
    const allColumns = [
      ...REQUIRED_COLUMNS,
      'locale_all',
      'email_pph',
      'worker_role',
      'rtw_datetime',
      'termination_date',
      'bgc_expiration_date',
    ]

    const template = [
      allColumns.join(','),
      // Example 1: Pending worker (new hire - rtw_datetime, termination_date, bgc empty)
      `${exampleHrId1},John Doe,core,${exampleEmail1},US,en,2025-01-15,pending,,john.doe@pph.com,Annotator,,,`,
      // Example 2: Active worker (must have rtw_datetime, has multiple locales and BGC)
      `${exampleHrId2},Jane Smith,upwork,${exampleEmail2},CA,en,2024-06-01,active,"en,es,fr",,Senior Annotator,2024-06-15T09:00:00Z,,2025-06-15`,
      // Example 3: Terminated worker (must have both rtw_datetime and termination_date)
      `HR-${timestamp}-003,Bob Wilson,core,worker3.${timestamp}@example.com,US,en,2023-01-10,terminated,en,,Annotator,2023-01-20T09:00:00Z,2024-12-01,`,
    ].join('\n')

    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'workers_bulk_upload_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: 'Template Downloaded',
      description: 'CSV template downloaded successfully',
    })
  }

  // Validate email format
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  // Validate date format (YYYY-MM-DD)
  const isValidDate = (dateString: string): boolean => {
    const regex = /^\d{4}-\d{2}-\d{2}$/
    if (!regex.test(dateString)) return false
    const date = new Date(dateString)
    return !isNaN(date.getTime())
  }

  // Validate ISO datetime format (YYYY-MM-DDTHH:MM:SSZ or similar)
  const isValidDatetime = (datetimeString: string): boolean => {
    const date = new Date(datetimeString)
    return !isNaN(date.getTime())
  }

  // Validate CSV data
  const validateCSV = async (data: any[]) => {
    setIsValidating(true)
    const validationErrors: ValidationError[] = []
    const validWorkers: WorkerRow[] = []

    // Check if file has required columns
    if (data.length === 0) {
      validationErrors.push({
        row: 0,
        field: 'file',
        message: 'CSV file is empty',
      })
      setErrors(validationErrors)
      setIsValidating(false)
      return
    }

    const headers = Object.keys(data[0])
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

    // Check for existing HR IDs and emails
    const { data: existingWorkers } = await supabase
      .from('workers')
      .select('hr_id, email_personal, email_pph')

    const existingHRIds = new Set(existingWorkers?.map((w) => w.hr_id) || [])
    const existingEmails = new Set(
      existingWorkers?.flatMap((w) => [w.email_personal, w.email_pph].filter(Boolean)) || []
    )

    // Validate each row
    data.forEach((row, index) => {
      const rowNumber = index + 2 // +2 because Excel rows start at 1 and we have header row

      // Check required fields
      REQUIRED_COLUMNS.forEach((field) => {
        if (!row[field] || row[field].toString().trim() === '') {
          validationErrors.push({
            row: rowNumber,
            field,
            message: `${field} is required`,
            value: row[field],
          })
        }
      })

      // Validate email format
      if (row.email_personal && !isValidEmail(row.email_personal)) {
        validationErrors.push({
          row: rowNumber,
          field: 'email_personal',
          message: 'Invalid email format',
          value: row.email_personal,
        })
      }

      if (row.email_pph && row.email_pph.trim() !== '' && !isValidEmail(row.email_pph)) {
        validationErrors.push({
          row: rowNumber,
          field: 'email_pph',
          message: 'Invalid email format',
          value: row.email_pph,
        })
      }

      // Check for duplicate HR ID
      if (existingHRIds.has(row.hr_id)) {
        validationErrors.push({
          row: rowNumber,
          field: 'hr_id',
          message: `HR ID already exists: ${row.hr_id}`,
          value: row.hr_id,
        })
      }

      // Check for duplicate email
      if (existingEmails.has(row.email_personal)) {
        validationErrors.push({
          row: rowNumber,
          field: 'email_personal',
          message: 'Email already exists',
          value: row.email_personal,
        })
      }

      // Validate engagement model
      if (row.engagement_model && !VALID_ENGAGEMENT_MODELS.includes(row.engagement_model)) {
        validationErrors.push({
          row: rowNumber,
          field: 'engagement_model',
          message: `Invalid engagement model. Must be one of: ${VALID_ENGAGEMENT_MODELS.join(', ')}`,
          value: row.engagement_model,
        })
      }

      // Validate status
      if (row.status && !VALID_STATUSES.includes(row.status)) {
        validationErrors.push({
          row: rowNumber,
          field: 'status',
          message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          value: row.status,
        })
      }

      // Validate date format
      if (row.hire_date && !isValidDate(row.hire_date)) {
        validationErrors.push({
          row: rowNumber,
          field: 'hire_date',
          message: 'Invalid date format. Use YYYY-MM-DD',
          value: row.hire_date,
        })
      }

      // Validate country code (2 letters)
      if (row.country_residence && row.country_residence.length !== 2) {
        validationErrors.push({
          row: rowNumber,
          field: 'country_residence',
          message: 'Country must be 2-letter ISO code (e.g., US, CA, MX)',
          value: row.country_residence,
        })
      }

      // Validate rtw_datetime format if provided
      const rtwDatetime = row.rtw_datetime?.trim()
      if (rtwDatetime && !isValidDatetime(rtwDatetime)) {
        validationErrors.push({
          row: rowNumber,
          field: 'rtw_datetime',
          message: 'Invalid datetime format. Use ISO format (e.g., 2024-06-15T09:00:00Z)',
          value: rtwDatetime,
        })
      }

      // Validate termination_date format if provided
      const terminationDate = row.termination_date?.trim()
      if (terminationDate && !isValidDate(terminationDate)) {
        validationErrors.push({
          row: rowNumber,
          field: 'termination_date',
          message: 'Invalid date format. Use YYYY-MM-DD',
          value: terminationDate,
        })
      }

      // Validate bgc_expiration_date format if provided
      const bgcExpirationDate = row.bgc_expiration_date?.trim()
      if (bgcExpirationDate && !isValidDate(bgcExpirationDate)) {
        validationErrors.push({
          row: rowNumber,
          field: 'bgc_expiration_date',
          message: 'Invalid date format. Use YYYY-MM-DD',
          value: bgcExpirationDate,
        })
      }

      // Parse locale_all (comma-separated string to array)
      const localeAllRaw = row.locale_all?.trim()
      const localeAll: string[] = localeAllRaw
        ? localeAllRaw.split(',').map((l: string) => l.trim()).filter((l: string) => l.length > 0)
        : []

      // Validate status-specific requirements (database constraint: workers_status_requirements_check)
      const status = row.status?.trim()
      if (status === 'pending') {
        // Pending workers must NOT have rtw_datetime or termination_date
        if (rtwDatetime) {
          validationErrors.push({
            row: rowNumber,
            field: 'rtw_datetime',
            message: 'Pending workers must not have rtw_datetime set',
            value: rtwDatetime,
          })
        }
        if (terminationDate) {
          validationErrors.push({
            row: rowNumber,
            field: 'termination_date',
            message: 'Pending workers must not have termination_date set',
            value: terminationDate,
          })
        }
      } else if (status === 'active' || status === 'inactive') {
        // Active/inactive workers MUST have rtw_datetime, must NOT have termination_date
        if (!rtwDatetime) {
          validationErrors.push({
            row: rowNumber,
            field: 'rtw_datetime',
            message: `${status} workers must have rtw_datetime set`,
          })
        }
        if (terminationDate) {
          validationErrors.push({
            row: rowNumber,
            field: 'termination_date',
            message: `${status} workers must not have termination_date set`,
            value: terminationDate,
          })
        }
      } else if (status === 'terminated') {
        // Terminated workers MUST have both rtw_datetime AND termination_date
        if (!rtwDatetime) {
          validationErrors.push({
            row: rowNumber,
            field: 'rtw_datetime',
            message: 'Terminated workers must have rtw_datetime set',
          })
        }
        if (!terminationDate) {
          validationErrors.push({
            row: rowNumber,
            field: 'termination_date',
            message: 'Terminated workers must have termination_date set',
          })
        }
      }

      // If row has no errors, add to valid rows
      const rowErrors = validationErrors.filter((e) => e.row === rowNumber)
      if (rowErrors.length === 0) {
        validWorkers.push({
          hr_id: row.hr_id,
          full_name: row.full_name,
          engagement_model: row.engagement_model,
          email_personal: row.email_personal,
          email_pph: row.email_pph || null,
          country_residence: row.country_residence,
          locale_primary: row.locale_primary,
          locale_all: localeAll.length > 0 ? localeAll : undefined,
          hire_date: row.hire_date,
          status: row.status,
          worker_role: row.worker_role || null,
          rtw_datetime: rtwDatetime || undefined,
          termination_date: terminationDate || undefined,
          bgc_expiration_date: bgcExpirationDate || undefined,
        } as WorkerRow)
      }
    })

    setErrors(validationErrors)
    setValidRows(validWorkers)
    setIsValidating(false)
  }

  // Handle file upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (!uploadedFile) return

    // Check file type
    if (!uploadedFile.name.endsWith('.csv')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload a CSV file',
        variant: 'destructive',
      })
      return
    }

    setFile(uploadedFile)
    setErrors([])
    setValidRows([])
    setImportResults(null)

    // Parse CSV
    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      comments: '#', // Skip lines starting with #
      complete: (results) => {
        // Filter out any remaining comment-like rows
        const cleanData = results.data.filter((row: any) => {
          // Skip rows where first field starts with # or is a comment
          const firstValue = Object.values(row)[0]
          return firstValue && !String(firstValue).trim().startsWith('#')
        })
        validateCSV(cleanData)
      },
      error: (error) => {
        toast({
          title: 'Parse Error',
          description: `Failed to parse CSV: ${error.message}`,
          variant: 'destructive',
        })
      },
    })
  }


  // Import mutation
  const importMutation = useMutation({
    mutationFn: async ({ workers, withRtwFix }: { workers: WorkerRow[]; withRtwFix: boolean }) => {
      if (!user) throw new Error('User not authenticated')

      const results = {
        successful: 0,
        failed: 0,
        errors: [] as Array<{ row: number; error: string }>,
        hasConstraintError: false,
      }

      // Insert in batches of 10
      const batchSize = 10
      for (let i = 0; i < workers.length; i += batchSize) {
        const batch = workers.slice(i, i + batchSize)

        const workersToInsert = batch.map((w) => {
          // Determine rtw_datetime value:
          // 1. Use CSV-provided value if present
          // 2. If withRtwFix is enabled and status is active/inactive, use current time
          // 3. Otherwise null
          let rtwDatetime: string | null = null
          if (w.rtw_datetime) {
            rtwDatetime = new Date(w.rtw_datetime).toISOString()
          } else if (withRtwFix && (w.status === 'active' || w.status === 'inactive')) {
            rtwDatetime = new Date().toISOString()
          }

          // Build locale_all: use CSV-provided values if present, otherwise default to [locale_primary]
          const localeAllFinal = w.locale_all && w.locale_all.length > 0
            ? w.locale_all
            : [w.locale_primary]

          return {
            hr_id: w.hr_id,
            full_name: w.full_name,
            engagement_model: w.engagement_model,
            email_personal: w.email_personal,
            email_pph: w.email_pph || null,
            country_residence: w.country_residence,
            locale_primary: w.locale_primary,
            locale_all: localeAllFinal,
            hire_date: w.hire_date,
            status: w.status,
            worker_role: w.worker_role || null,
            created_at: new Date().toISOString(),
            created_by: user.id,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
            rtw_datetime: rtwDatetime,
            termination_date: w.termination_date || null,
            bgc_expiration_date: w.bgc_expiration_date || null,
          }
        })

        const { error } = await supabase.from('workers').insert(workersToInsert as any)

        if (error) {
          results.failed += batch.length
          batch.forEach((_, index) => {
            results.errors.push({
              row: i + index + 2,
              error: error.message,
            })
          })
          // Check if this is the status constraint error
          if (error.message.includes('workers_status_requirements_check')) {
            results.hasConstraintError = true
          }
        } else {
          results.successful += batch.length
        }

        // Update progress
        setImportProgress(Math.round(((i + batch.length) / workers.length) * 100))
      }

      return results
    },
    onSuccess: (results) => {
      setImportResults(results)

      // If constraint error detected, show the fix option
      if (results.hasConstraintError && !applyRtwFix) {
        setShowRtwFix(true)
      }

      queryClient.invalidateQueries({ queryKey: ['workers'] })

      if (results.failed === 0) {
        toast({
          title: 'Import Successful',
          description: `Successfully imported ${results.successful} worker(s)`,
        })
      } else if (results.hasConstraintError && !applyRtwFix) {
        toast({
          title: 'Import Failed - Status Constraint',
          description: 'Workers with active/inactive status require Ready To Work datetime.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Partial Success',
          description: `Imported ${results.successful} workers. ${results.failed} failed.`,
          variant: 'default',
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Handle retry with RTW fix
  const handleRetryWithRtwFix = () => {
    setApplyRtwFix(true)
    setShowRtwFix(false)
    setImportResults(null)
    setImportProgress(0)
    importMutation.mutate({ workers: validRows, withRtwFix: true })
  }

  // Download error report
  const downloadErrorReport = () => {
    if (errors.length === 0) return

    const errorCSV = [
      ['Row', 'Field', 'Error', 'Value'].join(','),
      ...errors.map((e) =>
        [e.row, e.field, `"${e.message}"`, e.value ? `"${e.value}"` : ''].join(',')
      ),
    ].join('\n')

    const blob = new Blob([errorCSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bulk_upload_errors.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: 'Error Report Downloaded',
      description: 'Download the error report to fix issues',
    })
  }

  // Reset dialog
  const handleClose = () => {
    setFile(null)
    setValidRows([])
    setErrors([])
    setImportProgress(0)
    setImportResults(null)
    setShowRtwFix(false)
    setApplyRtwFix(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Bulk Upload Workers</DialogTitle>
          <DialogDescription>
            Upload a CSV file to add multiple workers at once. Maximum 500 rows per upload.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          {/* Step 1: Download Template */}
          {!file && !importResults && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Download className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Step 1: Download Template</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Download the CSV template with proper column headers and example data
                </p>
                <Button onClick={downloadTemplate} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV Template
                </Button>
              </div>

              {/* Step 2: Upload File */}
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Step 2: Upload CSV</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select your completed CSV file to upload
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload">
                  <Button variant="default" asChild>
                    <span>
                      <Upload className="mr-2 h-4 w-4" />
                      Select CSV File
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          )}

          {/* Validation in progress */}
          {isValidating && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Validating CSV data...</p>
            </div>
          )}

          {/* Validation Results */}
          {!isValidating && file && !importResults && (
            <div className="flex flex-col h-full min-h-0 overflow-hidden">
              {/* Summary - Fixed height, no scroll */}
              <div className="grid grid-cols-2 gap-4 flex-shrink-0 mb-4">
                <div className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-sm">Valid Rows</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{validRows.length}</p>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="font-semibold text-sm">Errors</span>
                  </div>
                  <p className="text-2xl font-bold text-destructive">{errors.length}</p>
                </div>
              </div>

              {/* Error Details - Fixed height */}
              {errors.length > 0 && (
                <div className="flex-shrink-0 space-y-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-semibold">
                          Found {errors.length} validation error(s). Please fix these issues before
                          importing.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadErrorReport}
                          className="mt-2"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download Error Report
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>

                  {/* Error Table */}
                  <div>
                    <h3 className="font-semibold mb-2">Error Details</h3>
                    <ScrollArea className="h-[150px] border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">Row</TableHead>
                            <TableHead className="w-[150px]">Field</TableHead>
                            <TableHead>Error</TableHead>
                            <TableHead>Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {errors.slice(0, 50).map((error, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{error.row}</TableCell>
                              <TableCell>{error.field}</TableCell>
                              <TableCell className="text-sm">{error.message}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {error.value || '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                    {errors.length > 50 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Showing first 50 errors. Download full report for complete list.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Valid Rows Preview - Scrollable area */}
              {validRows.length > 0 && (
                <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
                  <h3 className="font-semibold mb-2 flex-shrink-0">Preview Valid Rows ({validRows.length})</h3>
                  <div className="border rounded-lg overflow-auto flex-1 min-h-0 max-h-[300px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="whitespace-nowrap">HR ID</TableHead>
                          <TableHead className="whitespace-nowrap">Name</TableHead>
                          <TableHead className="whitespace-nowrap">Engagement</TableHead>
                          <TableHead className="whitespace-nowrap">Personal Email</TableHead>
                          <TableHead className="whitespace-nowrap">PPH Email</TableHead>
                          <TableHead className="whitespace-nowrap">Country</TableHead>
                          <TableHead className="whitespace-nowrap">Primary Locale</TableHead>
                          <TableHead className="whitespace-nowrap">All Locales</TableHead>
                          <TableHead className="whitespace-nowrap">Hire Date</TableHead>
                          <TableHead className="whitespace-nowrap">Status</TableHead>
                          <TableHead className="whitespace-nowrap">Role</TableHead>
                          <TableHead className="whitespace-nowrap">RTW Datetime</TableHead>
                          <TableHead className="whitespace-nowrap">Termination Date</TableHead>
                          <TableHead className="whitespace-nowrap">BGC Expiration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validRows.slice(0, 20).map((worker, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium whitespace-nowrap">{worker.hr_id}</TableCell>
                            <TableCell className="whitespace-nowrap">{worker.full_name}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant="outline">{worker.engagement_model}</Badge>
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{worker.email_personal}</TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {worker.email_pph || '—'}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{worker.country_residence}</TableCell>
                            <TableCell className="whitespace-nowrap">{worker.locale_primary}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {worker.locale_all?.join(', ') || worker.locale_primary}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{worker.hire_date}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{worker.status}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {worker.worker_role || '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {worker.rtw_datetime || '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {worker.termination_date || '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {worker.bgc_expiration_date || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {validRows.length > 20 && (
                    <p className="text-sm text-muted-foreground mt-2 flex-shrink-0">
                      Showing first 20 rows. {validRows.length - 20} more will be imported.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Import Progress */}
          {importMutation.isPending && (
            <div className="space-y-4">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                <p className="font-semibold mb-2">Importing workers...</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {importProgress}% complete
                </p>
              </div>
              <Progress value={importProgress} className="w-full" />
            </div>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="space-y-4">
              <Alert variant={importResults.failed > 0 ? 'default' : 'default'}>
                <FileCheck className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">Import Complete</p>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Successful</p>
                        <p className="text-2xl font-bold text-green-600">
                          {importResults.successful}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Failed</p>
                        <p className="text-2xl font-bold text-destructive">
                          {importResults.failed}
                        </p>
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {importResults.errors.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Failed Rows</h3>
                  <ScrollArea className="h-[150px] border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResults.errors.map((error, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{error.row}</TableCell>
                            <TableCell className="text-sm">{error.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}

              {/* RTW Fix Option */}
              {showRtwFix && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p className="font-semibold">Status Constraint Violation Detected</p>
                      <p className="text-sm">
                        Workers with <Badge variant="secondary">active</Badge> or{' '}
                        <Badge variant="secondary">inactive</Badge> status require a "Ready To Work"
                        datetime to be set. This is enforced by the database to ensure data integrity.
                      </p>
                      <p className="text-sm">
                        Would you like to automatically set the Ready To Work datetime to <strong>now</strong> for
                        all active/inactive workers and retry the import?
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" onClick={handleRetryWithRtwFix}>
                          Yes, Set RTW & Retry Import
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowRtwFix(false)}>
                          No, I'll Fix the CSV
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          {!importResults && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              {validRows.length > 0 && errors.length === 0 && (
                <Button
                  onClick={() => importMutation.mutate({ workers: validRows, withRtwFix: false })}
                  disabled={importMutation.isPending}
                >
                  {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Import {validRows.length} Worker{validRows.length !== 1 ? 's' : ''}
                </Button>
              )}
              {errors.length > 0 && (
                <Button variant="outline" onClick={() => setFile(null)}>
                  Upload Different File
                </Button>
              )}
            </>
          )}
          {importResults && (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
