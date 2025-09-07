import { z } from 'z';

export const createCraneSchema = z.object({
  name: z.string()
    .min(1, 'Crane name is required')
    .max(200, 'Crane name cannot exceed 200 characters'),
  code: z.string()
    .min(1, 'Crane code is required')
    .regex(/^[A-Z0-9]+$/, 'Crane code must contain only uppercase letters and numbers'),
  type: z.enum(['Mobile Crane', 'All Terrain Crane', 'Crawler Crane'], {
    errorMap: () => ({ message: 'Crane type must be one of: Mobile Crane, All Terrain Crane, Crawler Crane' })
  }),
  capacity: z.string()
    .min(1, 'Crane capacity is required')
    .regex(/^\d+\s*(tons?|kg|t)$/i, 'Capacity must be in format: 100 tons, 50000 kg, etc.'),
  boomLength: z.string()
    .min(1, 'Boom length is required')
    .regex(/^\d+\s*m$/, 'Boom length must be in format: 60m, 42m, etc.'),
  location: z.string()
    .min(1, 'Location is required')
    .max(200, 'Location cannot exceed 200 characters'),
  status: z.enum(['Available', 'In Use', 'Maintenance', 'Out of Service'], {
    errorMap: () => ({ message: 'Status must be one of: Available, In Use, Maintenance, Out of Service' })
  }).default('Available'),
  operator: z.string()
    .max(100, 'Operator name cannot exceed 100 characters')
    .optional(),
  lastMaintenance: z.date()
    .max(new Date(), 'Last maintenance date cannot be in the future')
    .optional(),
  nextMaintenance: z.date()
    .min(new Date(), 'Next maintenance date must be in the future')
    .optional(),
  purchasePrice: z.number()
    .min(0, 'Purchase price cannot be negative'),
  dailyRate: z.number()
    .min(0, 'Daily rate cannot be negative'),
});

export const updateCraneSchema = createCraneSchema.partial().extend({
  id: z.string().min(1, 'Crane ID is required'),
});

export const craneStatusSchema = z.object({
  id: z.string().min(1, 'Crane ID is required'),
  status: z.enum(['Available', 'In Use', 'Maintenance', 'Out of Service'], {
    errorMap: () => ({ message: 'Status must be one of: Available, In Use, Maintenance, Out of Service' })
  }),
});

export const craneSearchSchema = z.object({
  query: z.string().optional(),
  type: z.enum(['Mobile Crane', 'All Terrain Crane', 'Crawler Crane']).optional(),
  status: z.enum(['Available', 'In Use', 'Maintenance', 'Out of Service']).optional(),
  location: z.string().optional(),
  minCapacity: z.number().min(0).optional(),
  maxCapacity: z.number().min(0).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export type CreateCraneInput = z.infer<typeof createCraneSchema>;
export type UpdateCraneInput = z.infer<typeof updateCraneSchema>;
export type CraneStatusInput = z.infer<typeof craneStatusSchema>;
export type CraneSearchInput = z.infer<typeof craneSearchSchema>;
