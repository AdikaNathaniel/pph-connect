import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { format, subDays, startOfMonth } from 'date-fns'
import {
  User,
  Mail,
  MapPin,
  Globe,
  Calendar,
  Briefcase,
  Shield,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Monitor,
  Clock,
} from 'lucide-react'

type WorkerProfile = {
  id: string
  hr_id: string
  full_name: string
  email_personal: string
  email_pph: string | null
  country_residence: string | null
  locale_primary: string | null
  locale_all: string[] | null
  engagement_model: string | null
  worker_role: string | null
  status: string
  hire_date: string | null
  rtw_datetime: string | null
  bgc_expiration_date: string | null
  created_at: string
  supervisor_id: string | null
}

type SupervisorInfo = {
  id: string
  full_name: string
}

type WorkerAccount = {
  id: string
  platform_type: string
  worker_account_email: string
  worker_account_id: string
  is_current: boolean
  activated_at: string
}

type EarningsSummary = {
  allTime: number
  thisMonth: number
  last30Days: number
  totalUnits: number
  totalHours: number
}

export function WorkerProfile() {
  const { user } = useAuth()

  // Find the worker record linked to this user
  const { data: workerProfile, isLoading: isLoadingWorker } = useQuery({
    queryKey: ['my-full-worker-profile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null

      const { data, error } = await supabase
        .from('workers')
        .select(`
          id,
          hr_id,
          full_name,
          email_personal,
          email_pph,
          country_residence,
          locale_primary,
          locale_all,
          engagement_model,
          worker_role,
          status,
          hire_date,
          rtw_datetime,
          bgc_expiration_date,
          created_at,
          supervisor_id
        `)
        .or(`email_personal.eq.${user.email},email_pph.eq.${user.email}`)
        .single()

      if (error) {
        console.error('Error finding linked worker:', error)
        return null
      }
      return data as WorkerProfile
    },
    enabled: !!user?.email,
  })

  // Fetch supervisor info separately
  const { data: supervisorInfo } = useQuery({
    queryKey: ['my-supervisor', workerProfile?.supervisor_id],
    queryFn: async () => {
      if (!workerProfile?.supervisor_id) return null

      const { data, error } = await supabase
        .from('workers')
        .select('id, full_name')
        .eq('id', workerProfile.supervisor_id)
        .single()

      if (error) {
        console.error('Error fetching supervisor:', error)
        return null
      }
      return data as SupervisorInfo
    },
    enabled: !!workerProfile?.supervisor_id,
  })

  // Fetch platform accounts
  const { data: platformAccounts } = useQuery({
    queryKey: ['my-platform-accounts', workerProfile?.id],
    queryFn: async () => {
      if (!workerProfile?.id) return []

      const { data, error } = await supabase
        .from('worker_accounts')
        .select('id, platform_type, worker_account_email, worker_account_id, is_current, activated_at')
        .eq('worker_id', workerProfile.id)
        .order('activated_at', { ascending: false })

      if (error) throw error
      return data as WorkerAccount[]
    },
    enabled: !!workerProfile?.id,
  })

  // Fetch earnings summary
  const { data: earningsSummary } = useQuery({
    queryKey: ['my-earnings-summary', workerProfile?.id],
    queryFn: async () => {
      if (!workerProfile?.id) return null

      const today = new Date()
      const monthStart = format(startOfMonth(today), 'yyyy-MM-dd')
      const last30Start = format(subDays(today, 30), 'yyyy-MM-dd')

      // All time earnings
      const { data: allTimeData } = await supabase
        .from('work_stats')
        .select('earnings, units_completed, hours_worked')
        .eq('worker_id', workerProfile.id)

      // This month earnings
      const { data: thisMonthData } = await supabase
        .from('work_stats')
        .select('earnings')
        .eq('worker_id', workerProfile.id)
        .gte('work_date', monthStart)

      // Last 30 days earnings
      const { data: last30Data } = await supabase
        .from('work_stats')
        .select('earnings')
        .eq('worker_id', workerProfile.id)
        .gte('work_date', last30Start)

      const allTime = allTimeData?.reduce((sum, s) => sum + (s.earnings || 0), 0) || 0
      const thisMonth = thisMonthData?.reduce((sum, s) => sum + (s.earnings || 0), 0) || 0
      const last30Days = last30Data?.reduce((sum, s) => sum + (s.earnings || 0), 0) || 0
      const totalUnits = allTimeData?.reduce((sum, s) => sum + (s.units_completed || 0), 0) || 0
      const totalHours = allTimeData?.reduce((sum, s) => sum + (s.hours_worked || 0), 0) || 0

      return {
        allTime,
        thisMonth,
        last30Days,
        totalUnits,
        totalHours,
      } as EarningsSummary
    },
    enabled: !!workerProfile?.id,
  })

  // Format engagement model for display
  const formatEngagementModel = (model: string | null) => {
    if (!model) return 'Not specified'
    return model.charAt(0).toUpperCase() + model.slice(1).replace('_', ' ')
  }

  // Check if BGC is expiring soon or expired
  const bgcStatus = useMemo(() => {
    if (!workerProfile?.bgc_expiration_date) return null
    const expDate = new Date(workerProfile.bgc_expiration_date)
    const today = new Date()
    const daysUntilExpiry = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) return { status: 'expired', days: Math.abs(daysUntilExpiry) }
    if (daysUntilExpiry <= 30) return { status: 'expiring', days: daysUntilExpiry }
    return { status: 'valid', days: daysUntilExpiry }
  }, [workerProfile?.bgc_expiration_date])

  if (isLoadingWorker) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-48" />
      </div>
    )
  }

  if (!workerProfile) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Worker Profile Found</AlertTitle>
          <AlertDescription>
            Your user account ({user?.email}) is not linked to a worker profile in the system.
            Please contact your administrator to set up your worker profile.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">
          View your personal information, accounts, and earnings
        </p>
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-10 w-10 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{workerProfile.full_name}</h2>
                <Badge variant={workerProfile.status === 'active' ? 'default' : 'secondary'}>
                  {workerProfile.status}
                </Badge>
              </div>
              <p className="text-muted-foreground">{workerProfile.hr_id}</p>
              {workerProfile.worker_role && (
                <p className="text-sm text-muted-foreground mt-1">{workerProfile.worker_role}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Personal Email</p>
                <p className="font-medium">{workerProfile.email_personal}</p>
              </div>
            </div>
            {workerProfile.email_pph && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">PPH Email</p>
                  <p className="font-medium">{workerProfile.email_pph}</p>
                </div>
              </div>
            )}
            {workerProfile.country_residence && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Country of Residence</p>
                  <p className="font-medium">{workerProfile.country_residence}</p>
                </div>
              </div>
            )}
            {workerProfile.locale_primary && (
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Primary Locale</p>
                  <p className="font-medium">{workerProfile.locale_primary}</p>
                </div>
              </div>
            )}
            {workerProfile.locale_all && workerProfile.locale_all.length > 0 && (
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">All Locales</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {workerProfile.locale_all.map((locale) => (
                      <Badge key={locale} variant="outline" className="text-xs">
                        {locale}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Employment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Engagement Model</p>
                <p className="font-medium">{formatEngagementModel(workerProfile.engagement_model)}</p>
              </div>
            </div>
            {workerProfile.hire_date && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Hire Date</p>
                  <p className="font-medium">{format(new Date(workerProfile.hire_date), 'MMMM d, yyyy')}</p>
                </div>
              </div>
            )}
            {workerProfile.rtw_datetime && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">RTW Date</p>
                  <p className="font-medium">{format(new Date(workerProfile.rtw_datetime), 'MMMM d, yyyy')}</p>
                </div>
              </div>
            )}
            {supervisorInfo && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Supervisor</p>
                  <p className="font-medium">{supervisorInfo.full_name}</p>
                </div>
              </div>
            )}
            {workerProfile.bgc_expiration_date && (
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">BGC Expiration</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {format(new Date(workerProfile.bgc_expiration_date), 'MMMM d, yyyy')}
                    </p>
                    {bgcStatus?.status === 'expired' && (
                      <Badge variant="destructive">Expired</Badge>
                    )}
                    {bgcStatus?.status === 'expiring' && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Expires in {bgcStatus.days} days
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Platform Accounts
          </CardTitle>
          <CardDescription>Your assigned platform accounts for work</CardDescription>
        </CardHeader>
        <CardContent>
          {platformAccounts && platformAccounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {platformAccounts.map((account) => (
                <div
                  key={account.id}
                  className="p-4 border rounded-lg bg-muted/30"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium capitalize">
                        {account.platform_type.replace('_', ' ')}
                      </span>
                    </div>
                    <Badge variant={account.is_current ? 'default' : 'secondary'}>
                      {account.is_current ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {account.worker_account_email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ID: {account.worker_account_id}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Activated: {format(new Date(account.activated_at), 'MMM d, yyyy')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No platform accounts assigned yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Earnings Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Earnings Summary
          </CardTitle>
          <CardDescription>Your earnings overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 border rounded-lg text-center">
              <DollarSign className="h-6 w-6 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold text-green-600">
                ${earningsSummary?.allTime.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-muted-foreground">All Time</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <DollarSign className="h-6 w-6 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-blue-600">
                ${earningsSummary?.thisMonth.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-muted-foreground">This Month</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <DollarSign className="h-6 w-6 mx-auto text-purple-600 mb-2" />
              <p className="text-2xl font-bold text-purple-600">
                ${earningsSummary?.last30Days.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-muted-foreground">Last 30 Days</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <TrendingUp className="h-6 w-6 mx-auto text-orange-600 mb-2" />
              <p className="text-2xl font-bold">
                {earningsSummary?.totalUnits.toLocaleString() || '0'}
              </p>
              <p className="text-sm text-muted-foreground">Total Units</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <Clock className="h-6 w-6 mx-auto text-cyan-600 mb-2" />
              <p className="text-2xl font-bold">
                {earningsSummary?.totalHours.toFixed(1) || '0'}h
              </p>
              <p className="text-sm text-muted-foreground">Total Hours</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Profile created: {format(new Date(workerProfile.created_at), 'MMMM d, yyyy')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default WorkerProfile
