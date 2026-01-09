import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft } from 'lucide-react'
import { ProfileTab } from './tabs/ProfileTab'
import { AccountsTab } from './tabs/AccountsTab'
import { ProjectsTab } from './tabs/ProjectsTab'
import { ActivityTab } from './tabs/ActivityTab'
import { EarningsTab } from './tabs/EarningsTab'

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

export function WorkerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  // Get active tab from URL hash (e.g., #accounts)
  const hash = location.hash.replace('#', '') || 'profile'

  // Fetch worker data with relationships
  const { data: worker, isLoading, isError, error } = useQuery({
    queryKey: ['worker', id],
    queryFn: async () => {
      if (!id) throw new Error('Worker ID is required')

      // Fetch main worker data
      const { data, error } = await supabase
        .from('workers')
        .select(`*`)
        .eq('id', id)
        .single()

      if (error) throw error

      const workerData = data as unknown as Worker

      // Fetch supervisor name (references workers table)
      if (workerData.supervisor_id) {
        const { data: supervisor } = await supabase
          .from('workers')
          .select('full_name')
          .eq('id', workerData.supervisor_id)
          .single()

        if (supervisor) {
          workerData.supervisor_name = supervisor.full_name
        }
      }

      // Fetch created_by and updated_by names (reference auth.users via profiles)
      const userIds = [workerData.created_by, workerData.updated_by].filter(
        (uid): uid is string => !!uid
      )

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds)

        if (profiles) {
          const profileMap = new Map(profiles.map((p) => [p.id, p.full_name]))
          if (workerData.created_by) {
            workerData.created_by_name = profileMap.get(workerData.created_by) || null
          }
          if (workerData.updated_by) {
            workerData.updated_by_name = profileMap.get(workerData.updated_by) || null
          }
        }
      }

      return workerData
    },
    enabled: !!id,
  })

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      pending: 'secondary',
      inactive: 'outline',
      terminated: 'destructive',
    }
    return variants[status] || 'secondary'
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // Error state
  if (isError || !worker) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load worker: {error?.message || 'Worker not found'}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => navigate('/workers')}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Workers
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/workers')}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Workers
        </Button>

        {/* Worker Name and Status */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">{worker.full_name}</h1>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span>{worker.email_personal}</span>
              <span>•</span>
              <span>HR ID: {worker.hr_id}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(worker.status)} className="text-sm px-3 py-1">
              {worker.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/workers/${id}/edit`)}
          >
            Edit Worker
          </Button>
          <Button variant="outline" disabled>
            Replace Account
          </Button>
          <Button variant="outline" disabled>
            Assign to Project
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={hash} onValueChange={(value) => navigate(`#${value}`)}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileTab worker={worker} />
        </TabsContent>

        <TabsContent value="accounts" className="mt-6">
          <AccountsTab workerId={worker.id} workerName={worker.full_name} />
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <ProjectsTab workerId={worker.id} workerName={worker.full_name} />
        </TabsContent>

        <TabsContent value="earnings" className="mt-6">
          <EarningsTab workerId={worker.id} workerName={worker.full_name} />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <ActivityTab workerId={worker.id} workerName={worker.full_name} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
