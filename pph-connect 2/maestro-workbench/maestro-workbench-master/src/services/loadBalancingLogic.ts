export type LoadBalancingWorker = {
  id: string;
  capacity: number;
  activeAssignments: number;
  isOnline: boolean;
};

export function computeCapacityScore(worker: LoadBalancingWorker): number {
  if (!worker.isOnline || worker.capacity <= 0) {
    return 0;
  }
  const utilization = worker.activeAssignments / worker.capacity;
  return Math.max(0, 1 - utilization);
}

export function distributeAssignments(taskIds: string[], workers: LoadBalancingWorker[]) {
  const assignments: { taskId: string; workerId: string }[] = [];
  const workerQueue = [...workers];

  taskIds.forEach((taskId) => {
    workerQueue.sort((a, b) => computeCapacityScore(b) - computeCapacityScore(a));
    const top = workerQueue.find((worker) => computeCapacityScore(worker) > 0);
    if (!top) {
      return;
    }
    assignments.push({ taskId, workerId: top.id });
    top.activeAssignments += 1;
  });

  return assignments;
}
