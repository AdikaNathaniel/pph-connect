import { z } from 'zod';

export const accountSchema = z.object({
  workerId: z.string().trim().min(1, 'Worker id is required'),
  platformType: z.string().trim().min(1, 'Platform type is required'),
  email: z.string().trim().email('Provide a valid account email address'),
  accountId: z.string().trim().min(1, 'Account identifier is required'),
  reason: z
    .string()
    .trim()
    .max(500, 'Reason must be 500 characters or fewer')
    .optional()
    .or(z.literal(''))
});

export type AccountSchema = z.infer<typeof accountSchema>;
