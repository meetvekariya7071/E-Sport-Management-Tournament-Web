import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    username: z
      .string({ required_error: 'Username is required' })
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username cannot exceed 30 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain alphanumeric characters, underscores, and dashes'),
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email address format'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    role: z.enum(['ADMIN', 'ORGANIZER', 'PLAYER', 'REFEREE']).optional(),
    bio: z.string().max(250).optional()
  })
});

export const loginSchema = z.object({
  body: z.object({
    emailOrUsername: z
      .string({ required_error: 'Email or Username is required' })
      .min(3, 'Email or username must be at least 3 characters'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password is required')
  })
});
