import { useQuery } from '@tanstack/react-query';
import supabase from '../integrations/supabase/client';
import type { Database } from '../integrations/supabase/types';

type ProjectRow = Database['public']['Tables']['projects']['Row'];

const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 10 * 60 * 1000;

const fetchProjects = async (): Promise<ProjectRow[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('id, project_code, project_name, status, department_id, start_date, end_date');

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const useProjects = () =>
  useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false
  });

export default useProjects;
