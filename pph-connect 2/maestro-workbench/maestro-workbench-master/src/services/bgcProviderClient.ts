export type BGCProviderPayload = {
  workerId: string;
  fullName: string;
  email: string;
  country?: string | null;
};

export type BGCOrder = {
  id: string;
  status: string;
  estimatedCompletion: string | null;
};

/**
 * Mock provider integration. Replace with Checkr/Sterling/HireRight SDK or REST call.
 */
export async function createBGCOrder(payload: BGCProviderPayload): Promise<BGCOrder> {
  return {
    id: `bgc_${payload.workerId}_${Date.now()}`,
    status: 'in_progress',
    estimatedCompletion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export async function getBGCOrder(orderId: string): Promise<BGCOrder> {
  return {
    id: orderId,
    status: 'completed',
    estimatedCompletion: null,
  };
}
