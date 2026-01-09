import { useQuery } from '@tanstack/react-query';
import supabase from '../integrations/supabase/client';
import type { Database } from '../integrations/supabase/types';

type TeamRow = Database['public']['Tables']['teams']['Row'];

const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 10 * 60 * 1000;

const fetchTeams = async (): Promise<TeamRow[]> => {
  const { data, error } = await supabase
    .from('teams')
    .select('id, team_name, department_id, locale_primary, locale_secondary, locale_region, is_active');

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const useTeams = () =>
  useQuery({
    queryKey: ['teams'],
    queryFn: fetchTeams,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false
  });

export default useTeams;
