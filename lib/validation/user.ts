import { z } from 'z';

export const createUserSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string()
    .email('Please enter a valid email')
    .optional(),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password cannot exceed 100 characters'),
  role: z.enum(['Super Admin', 'manager', 'sales_man'], {
    errorMap: () => ({ message: 'Role must be one of: Super Admin, manager, sales_man' })
  }),
  fullName: z.string()
    .max(100, 'Full name cannot exceed 100 characters')
    .optional(),
  phone: z.string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
    .optional(),
  department: z.string()
    .max(100, 'Department cannot exceed 100 characters')
    .optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = createUserSchema.partial().extend({
  id: z.string().min(1, 'User ID is required'),
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(6, 'New password must be at least 6 characters')
    .max(100, 'New password cannot exceed 100 characters'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
