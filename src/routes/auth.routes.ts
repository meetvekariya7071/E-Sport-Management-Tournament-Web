import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authRateLimiter } from '../middlewares/rateLimiter.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  registerUserSchema,
  loginUserSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
  resendOtpSchema,
  verifyOtpSchema,
  updateUnverifiedEmailSchema
} from '../validators/auth.validator';

const router = Router();

// Strict rate-limited & validated authentication endpoints
router.post('/register', authRateLimiter, validateBody(registerUserSchema), AuthController.register);
router.post('/login', authRateLimiter, validateBody(loginUserSchema), AuthController.login);
router.get('/profile', authenticate, AuthController.getProfile);

// Email verification & password recovery endpoints
router.post('/verify-email', authRateLimiter, validateBody(verifyEmailSchema), AuthController.verifyEmail);
router.post('/resend-verification', authRateLimiter, validateBody(resendVerificationSchema), AuthController.resendVerification);
router.post('/resend-otp', authRateLimiter, validateBody(resendOtpSchema), AuthController.resendOtp);
router.post('/verify-otp', authRateLimiter, validateBody(verifyOtpSchema), AuthController.verifyOtp);
router.patch('/update-unverified-email', authRateLimiter, validateBody(updateUnverifiedEmailSchema), AuthController.updateUnverifiedEmail);
router.post('/forgot-password', authRateLimiter, validateBody(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/verify-reset-otp', authRateLimiter, validateBody(verifyResetOtpSchema), AuthController.verifyResetOtp);
router.post('/reset-password', authRateLimiter, validateBody(resetPasswordSchema), AuthController.resetPassword);

export default router;




