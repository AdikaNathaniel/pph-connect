export type BGCWorkerRecord = {
  id: string;
  full_name?: string | null;
  email_personal?: string | null;
  status?: string | null;
  bgc_expiration_date?: string | null;
};

export type BGCMonitoringResult = {
  remind60: BGCWorkerRecord[];
  remind30: BGCWorkerRecord[];
  remind7: BGCWorkerRecord[];
  overdue: BGCWorkerRecord[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function evaluateBGCStatuses(
  workers: BGCWorkerRecord[],
  today: Date = new Date()
): BGCMonitoringResult {
  const remind60: BGCWorkerRecord[] = [];
  const remind30: BGCWorkerRecord[] = [];
  const remind7: BGCWorkerRecord[] = [];
  const overdue: BGCWorkerRecord[] = [];

  workers.forEach((worker) => {
    if (!worker.bgc_expiration_date) {
      return;
    }
    const expiration = new Date(worker.bgc_expiration_date);
    const diffDays = Math.floor((expiration.getTime() - today.getTime()) / DAY_MS);

    if (diffDays < 0) {
      overdue.push(worker);
    } else if (diffDays <= 7) {
      remind7.push(worker);
    } else if (diffDays <= 30) {
      remind30.push(worker);
    } else if (diffDays <= 60) {
      remind60.push(worker);
    }
  });

  return { remind60, remind30, remind7, overdue };
}
