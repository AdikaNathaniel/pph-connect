import { useQuery } from '@tanstack/react-query';
import supabase from '../integrations/supabase/client';
import type { Database } from '../integrations/supabase/types';

type DepartmentRow = Database['public']['Tables']['departments']['Row'];

const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 10 * 60 * 1000;

const fetchDepartments = async (): Promise<DepartmentRow[]> => {
  const { data, error } = await supabase
    .from('departments')
    .select('id, department_name, department_code, is_active');

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const useDepartments = () =>
  useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false
  });

export default useDepartments;
