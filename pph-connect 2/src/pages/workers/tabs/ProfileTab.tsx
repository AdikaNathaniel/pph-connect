import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Edit, AlertTriangle, CheckCircle } from 'lucide-react'

type Worker = {
  id: string
  hr_id: string
  full_name: string
  engagement_model: 'core' | 'upwork' | 'external' | 'internal'
  worker_role: string | null
  email_personal: string
  email_pph: string | null
  country_residence: string
  locale_primary: string
  locale_all: string[]
  hire_date: string
  rtw_datetime: string | null
  supervisor_id: string | null
  termination_date: string | null
  bgc_expiration_date: string | null
  status: 'pending' | 'active' | 'inactive' | 'terminated'
  created_at: string
  created_by: string | null
  updated_at: string
  updated_by: string | null
  // Resolved names (fetched separately)
  supervisor_name?: string | null
  created_by_name?: string | null
  updated_by_name?: string | null
}

type ProfileTabProps = {
  worker: Worker
}

export function ProfileTab({ worker }: ProfileTabProps) {
  const navigate = useNavigate()

  // Calculate BGC status
  const getBGCStatus = () => {
    if (!worker.bgc_expiration_date) {
      return { status: 'none', text: 'Not set', variant: 'outline' as const, icon: null }
    }

    const expirationDate = new Date(worker.bgc_expiration_date)
    const today = new Date()
    const daysUntilExpiration = Math.ceil(
      (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysUntilExpiration < 0) {
      return {
        status: 'expired',
        text: `Expired ${Math.abs(daysUntilExpiration)} days ago`,
        variant: 'destructive' as const,
        icon: <AlertTriangle className="h-4 w-4" />,
      }
    } else if (daysUntilExpiration < 30) {
      return {
        status: 'expiring',
        text: `Expiring in ${daysUntilExpiration} days`,
        variant: 'secondary' as const,
        icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
      }
    } else {
      return {
        status: 'valid',
        text: `Valid (${daysUntilExpiration} days remaining)`,
        variant: 'default' as const,
        icon: <CheckCircle className="h-4 w-4 text-green-600" />,
      }
    }
  }

  const bgcStatus = getBGCStatus()

  // Format engagement model for display
  const formatEngagementModel = (model: string) => {
    return model.charAt(0).toUpperCase() + model.slice(1)
  }

  return (
    <div className="space-y-6">
      {/* Edit Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => navigate(`/workers/${worker.id}/edit`)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Basic contact and identification details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
              <p className="text-sm mt-1">{worker.full_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">HR ID</label>
              <p className="text-sm mt-1">{worker.hr_id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Personal Email</label>
              <p className="text-sm mt-1">{worker.email_personal}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">PPH Email</label>
              <p className="text-sm mt-1">{worker.email_pph || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Country of Residence</label>
              <p className="text-sm mt-1">{worker.country_residence}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Primary Locale</label>
              <p className="text-sm mt-1">{worker.locale_primary}</p>
            </div>
            {worker.locale_all && worker.locale_all.length > 0 && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">All Locales</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {worker.locale_all.map((locale) => (
                    <Badge key={locale} variant="outline">
                      {locale}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Employment Information */}
      <Card>
        <CardHeader>
          <CardTitle>Employment Information</CardTitle>
          <CardDescription>Work status and engagement details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1">
                <Badge
                  variant={
                    worker.status === 'active'
                      ? 'default'
                      : worker.status === 'pending'
                      ? 'secondary'
                      : worker.status === 'terminated'
                      ? 'destructive'
                      : 'outline'
                  }
                >
                  {worker.status.toUpperCase()}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Engagement Model</label>
              <p className="text-sm mt-1">{formatEngagementModel(worker.engagement_model)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Worker Role</label>
              <p className="text-sm mt-1">{worker.worker_role || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Hire Date</label>
              <p className="text-sm mt-1">{format(new Date(worker.hire_date), 'MMMM d, yyyy')}</p>
            </div>
            {worker.rtw_datetime && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Ready to Work Date</label>
                <p className="text-sm mt-1">
                  {format(new Date(worker.rtw_datetime), 'MMMM d, yyyy')}
                </p>
              </div>
            )}
            {worker.termination_date && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Termination Date</label>
                <p className="text-sm mt-1 text-destructive">
                  {format(new Date(worker.termination_date), 'MMMM d, yyyy')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Organizational */}
      <Card>
        <CardHeader>
          <CardTitle>Organizational</CardTitle>
          <CardDescription>Reporting structure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Supervisor</label>
              <p className="text-sm mt-1">
                {worker.supervisor_name || (worker.supervisor_id ? 'Unknown' : 'No supervisor assigned')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Background Check */}
      <Card>
        <CardHeader>
          <CardTitle>Background Check</CardTitle>
          <CardDescription>BGC compliance status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Expiration Date</label>
              <p className="text-sm mt-1">
                {worker.bgc_expiration_date
                  ? format(new Date(worker.bgc_expiration_date), 'MMMM d, yyyy')
                  : 'Not set'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="flex items-center gap-2 mt-1">
                {bgcStatus.icon}
                <Badge variant={bgcStatus.variant}>{bgcStatus.text}</Badge>
              </div>
            </div>
          </div>

          {(bgcStatus.status === 'expired' || bgcStatus.status === 'expiring') && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Action Required
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    {bgcStatus.status === 'expired'
                      ? 'This worker\'s background check has expired. They should not be assigned to new projects until renewed.'
                      : 'This worker\'s background check is expiring soon. Please schedule a renewal.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Trail */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>Record creation and modification history</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created At</label>
              <p className="text-sm mt-1">
                {format(new Date(worker.created_at), 'MMMM d, yyyy h:mm a')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created By</label>
              <p className="text-sm mt-1">
                {worker.created_by_name || (worker.created_by ? 'Unknown' : 'System')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
              <p className="text-sm mt-1">
                {format(new Date(worker.updated_at), 'MMMM d, yyyy h:mm a')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Updated By</label>
              <p className="text-sm mt-1">
                {worker.updated_by_name || (worker.updated_by ? 'Unknown' : 'System')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
