import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BGCAlert {
  id: string;
  fullName: string;
  hrId: string;
  expirationDate: string;
}

export interface BGCAlertsState {
  expiringSoon: BGCAlert[];
  expired: BGCAlert[];
  isLoadingAlerts: boolean;
  isErrorAlerts: boolean;
  errorMessageAlerts: string | null;
  refreshAlerts: () => Promise<void>;
}

const serializeRow = (row: { id: string; full_name: string; hr_id: string; bgc_expiration_date: string }): BGCAlert => ({
  id: row.id,
  fullName: row.full_name,
  hrId: row.hr_id,
  expirationDate: row.bgc_expiration_date
});

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export const useBGCAlerts = (): BGCAlertsState => {
  const [expiringSoon, setExpiringSoon] = useState<BGCAlert[]>([]);
  const [expired, setExpired] = useState<BGCAlert[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [isErrorAlerts, setIsErrorAlerts] = useState(false);
  const [errorMessageAlerts, setErrorMessageAlerts] = useState<string | null>(null);

  const refreshAlerts = useCallback(async () => {
    setIsLoadingAlerts(true);
    setIsErrorAlerts(false);
    setErrorMessageAlerts(null);

    const today = new Date();
    const thirtyDaysOut = new Date(today);
    thirtyDaysOut.setDate(today.getDate() + 30);

    try {
      const [
        expiringResult,
        expiredResult
      ] = await Promise.all([
        supabase
          .from('workers')
          .select('id, full_name, hr_id, bgc_expiration_date')
          .not('bgc_expiration_date', 'is', null)
          .gte('bgc_expiration_date', isoDate(today))
          .lte('bgc_expiration_date', isoDate(thirtyDaysOut))
          .order('bgc_expiration_date', { ascending: true }),
        supabase
          .from('workers')
          .select('id, full_name, hr_id, bgc_expiration_date')
          .not('bgc_expiration_date', 'is', null)
          .lt('bgc_expiration_date', isoDate(today))
          .order('bgc_expiration_date', { ascending: true })
      ]);

      if (expiringResult.error) {
        throw expiringResult.error;
      }
      if (expiredResult.error) {
        throw expiredResult.error;
      }

      setExpiringSoon((expiringResult.data ?? []).map(serializeRow));
      setExpired((expiredResult.data ?? []).map(serializeRow));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load background check alerts.';
      setIsErrorAlerts(true);
      setErrorMessageAlerts(message);
      setExpiringSoon([]);
      setExpired([]);
    } finally {
      setIsLoadingAlerts(false);
    }
  }, []);

  useEffect(() => {
    refreshAlerts();
  }, [refreshAlerts]);

  return {
    expiringSoon,
    expired,
    isLoadingAlerts,
    isErrorAlerts,
    errorMessageAlerts,
    refreshAlerts
  };
};
