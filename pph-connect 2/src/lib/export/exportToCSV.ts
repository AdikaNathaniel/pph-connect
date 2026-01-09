import Papa from 'papaparse'
import { format } from 'date-fns'

type Worker = {
  id: string
  first_name: string
  last_name: string
  email_personal: string
  email_pph: string | null
  phone: string | null
  status: string
  department_id: string | null
  team_id: string | null
  hire_date: string | null
  termination_date: string | null
  bgc_expiration_date: string | null
  country_residence: string | null
  locale_primary: string | null
  [key: string]: any
}

export function exportWorkersToCSV(workers: Worker[], departmentMap?: Map<string, string>, teamMap?: Map<string, string>) {
  // Transform workers data for CSV export
  const csvData = workers.map((worker) => ({
    'First Name': worker.first_name,
    'Last Name': worker.last_name,
    'Personal Email': worker.email_personal,
    'PPH Email': worker.email_pph || '',
    'Phone': worker.phone || '',
    'Status': worker.status,
    'Department': departmentMap?.get(worker.department_id || '') || '',
    'Team': teamMap?.get(worker.team_id || '') || '',
    'Hire Date': worker.hire_date ? format(new Date(worker.hire_date), 'yyyy-MM-dd') : '',
    'Termination Date': worker.termination_date ? format(new Date(worker.termination_date), 'yyyy-MM-dd') : '',
    'BGC Expiration': worker.bgc_expiration_date ? format(new Date(worker.bgc_expiration_date), 'yyyy-MM-dd') : '',
    'Country': worker.country_residence || '',
    'Locale': worker.locale_primary || '',
  }))

  // Convert to CSV
  const csv = Papa.unparse(csvData)

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `workers_export_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
