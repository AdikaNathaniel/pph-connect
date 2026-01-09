import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ManagerLayout from '@/components/layout/ManagerLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { RefreshCcw } from 'lucide-react';

interface ProjectListingRow {
  id: string;
  project_id: string;
  is_active: boolean;
  capacity_max: number;
  capacity_current: number;
  required_skills: string[];
  required_locales: string[];
  required_tier: string;
  description: string | null;
  projects?: { name: string | null; project_code: string | null } | null;
}

export const ProjectListingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState<ProjectListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('project_listings')
      .select('id, project_id, is_active, capacity_max, capacity_current, required_skills, required_locales, required_tier, description, projects:projects(name, project_code)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('ProjectListingsPage: failed to load listings', error);
      toast.error('Unable to load project listings');
      setListings([]);
    } else {
      setListings((data ?? []) as ProjectListingRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchListings().catch((error) => console.warn('ProjectListingsPage: unexpected error', error));
  }, [fetchListings]);

  const filteredListings = useMemo(() => {
    if (!search) return listings;
    return listings.filter((listing) => {
      const projectName = listing.projects?.name ?? '';
      const projectCode = listing.projects?.project_code ?? '';
      return projectName.toLowerCase().includes(search.toLowerCase()) || projectCode.toLowerCase().includes(search.toLowerCase());
    });
  }, [listings, search]);

  return (
    <ManagerLayout pageTitle="Project Listings">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between" data-testid="project-listings-header">
          <div>
            <p className="text-sm text-muted-foreground">Marketplace infrastructure</p>
            <h1 className="text-2xl font-bold">Project Listings</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchListings} disabled={loading}>
              <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button size="sm" onClick={() => navigate('/m/project-listings/new')}>
              New Listing
            </Button>
          </div>
        </div>

        <Card data-testid="project-listings-filters">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="Search projects"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button variant="outline" size="sm" disabled>
              Status filter
            </Button>
            <Button variant="outline" size="sm" disabled>
              Capacity filter
            </Button>
          </CardContent>
        </Card>

        <Card data-testid="project-listings-table">
          <CardHeader>
            <CardTitle>Listings</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading listings…</p>
            ) : filteredListings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No listings found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead>Locales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredListings.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell>
                        <div className="font-medium">{listing.projects?.name ?? 'Project'}</div>
                        <div className="text-xs text-muted-foreground">{listing.projects?.project_code ?? listing.project_id}</div>
                      </TableCell>
                      <TableCell>
                        {listing.capacity_current} / {listing.capacity_max}
                      </TableCell>
                      <TableCell className="capitalize">{listing.required_tier}</TableCell>
                      <TableCell>
                        <Badge variant={listing.is_active ? 'default' : 'secondary'}>
                          {listing.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {listing.required_skills.length > 0 ? listing.required_skills.join(', ') : '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {listing.required_locales.length > 0 ? listing.required_locales.join(', ') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ManagerLayout>
  );
};

export default ProjectListingsPage;
