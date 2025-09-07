import { z } from 'z';

export const createCustomerSchema = z.object({
  name: z.string()
    .min(1, 'Customer name is required')
    .max(200, 'Customer name cannot exceed 200 characters'),
  email: z.string()
    .email('Please enter a valid email')
    .optional(),
  phone: z.string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
    .optional(),
  address: z.string()
    .max(500, 'Address cannot exceed 500 characters')
    .optional(),
  company: z.string()
    .max(200, 'Company name cannot exceed 200 characters')
    .optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  id: z.string().min(1, 'Customer ID is required'),
});

export const customerSearchSchema = z.object({
  query: z.string().optional(),
  company: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerSearchInput = z.infer<typeof customerSearchSchema>;
