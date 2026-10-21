import { z } from 'zod';
import { Roles } from '../types';

/**
 * Zod validation schema for User Registration.
 */
export const registerUserSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address format')
    .max(100, 'Email cannot exceed 100 characters')
    .trim()
    .toLowerCase(),
  username: z
    .string({ required_error: 'Username is required' })
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain alphanumeric characters, underscores, dashes, and periods')
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password cannot exceed 100 characters'),
  role: z
    .enum([Roles.ADMIN, Roles.ORGANIZER, Roles.PLAYER, Roles.REFEREE])
    .optional()
    .default(Roles.PLAYER)
});

/**
 * Zod validation schema for User Login.
 */
export const loginUserSchema = z
  .object({
    email: z.string().trim().optional(),
    username: z.string().trim().optional(),
    emailOrUsername: z.string().trim().optional(),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password cannot be empty')
  })
  .refine((data) => data.email || data.username || data.emailOrUsername, {
    message: 'Either email or username is required for login'
  });

/**
 * Zod validation schema for Email Verification.
 */
export const verifyEmailSchema = z.object({
  token: z.string({ required_error: 'Verification token is required' }).min(1, 'Token cannot be empty').trim()
});

/**
 * Zod validation schema for Resending Verification Email.
 */
export const resendVerificationSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).email('Invalid email address format').trim().toLowerCase()
});

/**
 * Zod validation schema for Forgot Password request.
 */
export const forgotPasswordSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).email('Invalid email address format').trim().toLowerCase()
});

/**
 * Zod validation schema for Verifying Reset Password OTP.
 */
export const verifyResetOtpSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).email('Invalid email address format').trim().toLowerCase(),
  otp: z.string({ required_error: 'Verification code is required' }).min(6, 'Verification code must be 6 digits').max(6, 'Verification code must be 6 digits').trim()
});

/**
 * Zod validation schema for Reset Password submission.
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().trim().optional(),
    otp: z.string().trim().optional(),
    email: z.string().email('Invalid email address format').trim().toLowerCase().optional(),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, 'Password must be at least 8 characters')
      .regex(/[0-9]/, 'Password must contain at least one numeric character')
      .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')
  })
  .refine((data) => data.token || data.otp, {
    message: 'Either verification code (otp) or reset token is required'
  });

/**
 * Zod validation schema for Resending OTP.
 */
export const resendOtpSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).email('Invalid email address format').trim().toLowerCase()
});

/**
 * Zod validation schema for Verifying OTP.
 */
export const verifyOtpSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).email('Invalid email address format').trim().toLowerCase(),
  otp: z
    .string({ required_error: '6-digit OTP is required' })
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^[0-9]{6}$/, 'Verification code must contain digits only')
    .trim()
});

/**
 * Zod validation schema for Updating Unverified Email (Registration typo correction).
 */
export const updateUnverifiedEmailSchema = z.object({
  oldEmail: z.string({ required_error: 'Current email is required' }).email('Invalid current email format').trim().toLowerCase(),
  newEmail: z.string({ required_error: 'New email is required' }).email('Invalid new email format').trim().toLowerCase()
});

/**
 * Zod validation schema for Requesting Email Change (Authenticated).
 */
export const requestEmailChangeSchema = z.object({
  newEmail: z.string({ required_error: 'New email is required' }).email('Invalid new email format').trim().toLowerCase(),
  currentPassword: z.string({ required_error: 'Current password is required' }).min(1, 'Current password cannot be empty')
});

/**
 * Zod validation schema for Confirming Email Change with OTP.
 */
export const confirmEmailChangeSchema = z.object({
  otp: z
    .string({ required_error: 'Verification code is required' })
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^[0-9]{6}$/, 'Verification code must contain digits only')
    .trim()
});


