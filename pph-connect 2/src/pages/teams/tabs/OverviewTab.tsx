import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { format } from 'date-fns'
import { Globe, Building2 } from 'lucide-react'

type Team = {
  id: string
  team_name: string
  department_id: string
  locale_primary: string
  locale_secondary: string | null
  locale_region: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  department?: {
    id: string
    department_name: string
  }
}

type OverviewTabProps = {
  team: Team
}

export function OverviewTab({ team }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Team Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Team Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Team Name</label>
              <p className="text-base">{team.team_name}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Department</label>
              <p className="text-base">{team.department?.department_name || 'Not assigned'}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div>
                <Badge variant={team.is_active ? 'default' : 'secondary'}>
                  {team.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Locale Information */}
          <div>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Locale Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Primary Locale</label>
                <div>
                  <Badge variant="default">{team.locale_primary}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Secondary Locale</label>
                <div>
                  {team.locale_secondary ? (
                    <Badge variant="secondary">{team.locale_secondary}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not set</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Region</label>
                <div>
                  {team.locale_region ? (
                    <Badge variant="outline">{team.locale_region}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not set</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Metadata */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Metadata</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="text-sm">{format(new Date(team.created_at), 'PPP')}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="text-sm">{format(new Date(team.updated_at), 'PPP')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
