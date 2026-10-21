import nodemailer from 'nodemailer';
import { ENV } from '../config/env';

// Prepare credentials (clean spaces from Google app password if needed)
const rawPass = process.env.SMTP_PASS || ENV.SMTP_PASS || '';
const cleanPass = rawPass.replace(/\s+/g, '');

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || ENV.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || ENV.SMTP_PORT) || 465,
  secure: (process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT || ENV.SMTP_PORT) === 465),
  auth: {
    user: process.env.SMTP_USER || ENV.SMTP_USER || 'mvekariya2006@gmail.com',
    pass: cleanPass,
  },
});

// Test transporter connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('[EmailService] ❌ SMTP Transporter connection verification failed:', error.message);
  } else {
    console.log('[EmailService] ✅ SMTP Transporter verified successfully. Ready to dispatch real emails via Gmail.');
  }
});

class EmailService {
  /**
   * Helper: Dispatches 6-digit verification OTP email with LeagueForge dark aesthetic (10-min validity).
   */
  async sendOtpEmail(recipientEmail: string, otpCode: string, username?: string) {
    const from = process.env.EMAIL_FROM || ENV.EMAIL_FROM || 'LeagueForge Arena <mvekariya2006@gmail.com>';
    const subject = `${otpCode} is your LeagueForge verification code`;
    const userDisplayName = username || recipientEmail.split('@')[0];

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #f1f5f9; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background-color: #0f172a; border: 1px solid #1e293b; border-radius: 20px; padding: 36px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); text-align: center; }
    .logo { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: 1px; margin-bottom: 24px; }
    .logo span { color: #00f0ff; }
    h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin-top: 0; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 16px 0; }
    .otp-container { margin: 28px 0; }
    .otp-box { display: inline-block; background-color: #020617; border: 2px solid #00f0ff; border-radius: 16px; padding: 18px 32px; font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; color: #00f0ff; letter-spacing: 10px; box-shadow: 0 0 25px rgba(0, 240, 255, 0.25); }
    .expiry { font-size: 12px; color: #38bdf8; margin-top: 12px; }
    .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">LEAGUE<span>FORGE</span></div>
      <h1>Account Verification Code</h1>
      <p>Hello ${userDisplayName},</p>
      <p>Enter the 6-digit confirmation code below to verify your email address and activate your LeagueForge account:</p>
      
      <div class="otp-container">
        <div class="otp-box">${otpCode}</div>
        <div class="expiry">⏳ Code valid for 10 minutes</div>
      </div>

      <p style="font-size: 12px; color: #64748b;">If you did not request this verification code, please ignore this email. Never share your verification code with anyone.</p>
    </div>
    <div class="footer">
      © 2026 LeagueForge Esports Management. All rights reserved.
    </div>
  </div>
</body>
</html>
    `;

    const text = `Hello ${userDisplayName},\n\nYour LeagueForge account verification code is: ${otpCode}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.`;

    try {
      const info = await transporter.sendMail({
        from,
        to: recipientEmail,
        subject,
        html,
        text
      });
      console.log(`[EmailService] OTP email dispatched to ${recipientEmail}: Message ID ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error(`[EmailService] Error sending OTP email to ${recipientEmail}:`, error);
      throw new Error(`EMAIL_DELIVERY_FAILURE: Failed to dispatch verification email: ${error.message}`);
    }
  }

  /**
   * Alias for backward compatibility
   */
  async sendVerificationOtpEmail(recipientEmail: string, username: string, otpCode: string) {
    return this.sendOtpEmail(recipientEmail, otpCode, username);
  }

  /**
   * Dispatches 6-digit password reset OTP email with LeagueForge dark aesthetic (10-min validity).
   */
  async sendPasswordResetOtpEmail(email: string, username: string, otp: string) {
    const from = process.env.EMAIL_FROM || ENV.EMAIL_FROM || 'LeagueForge Arena <mvekariya2006@gmail.com>';
    const subject = `${otp} is your LeagueForge password reset verification code`;
    const userDisplayName = username || email.split('@')[0];

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #f1f5f9; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background-color: #0f172a; border: 1px solid #1e293b; border-radius: 20px; padding: 36px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); text-align: center; }
    .logo { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: 1px; margin-bottom: 24px; }
    .logo span { color: #00f0ff; }
    h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin-top: 0; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 16px 0; }
    .otp-container { margin: 28px 0; }
    .otp-box { display: inline-block; background-color: #020617; border: 2px solid #f59e0b; border-radius: 16px; padding: 18px 32px; font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; color: #f59e0b; letter-spacing: 10px; box-shadow: 0 0 25px rgba(245, 158, 11, 0.25); }
    .expiry { font-size: 12px; color: #fbbf24; margin-top: 12px; }
    .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">LEAGUE<span>FORGE</span></div>
      <h1>Password Reset Verification</h1>
      <p>Hello ${userDisplayName},</p>
      <p>We received a request to reset your LeagueForge password. Enter the 6-digit confirmation code below to authorize creating a new password:</p>
      
      <div class="otp-container">
        <div class="otp-box">${otp}</div>
        <div class="expiry">⏳ Code valid for 10 minutes</div>
      </div>

      <p style="font-size: 12px; color: #64748b;">If you did not request a password reset, please disregard this email. Your account credentials will remain safe and unchanged.</p>
    </div>
    <div class="footer">
      © 2026 LeagueForge Esports Management. All rights reserved.
    </div>
  </div>
</body>
</html>
    `;

    const text = `Hello ${userDisplayName},\n\nYour LeagueForge password reset code is: ${otp}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.`;

    try {
      const info = await transporter.sendMail({
        from,
        to: email,
        subject,
        html,
        text
      });
      console.log(`[EmailService] Password reset OTP email dispatched to ${email}: Message ID ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error(`[EmailService] Error sending password reset OTP to ${email}:`, error);
      throw new Error(`EMAIL_DELIVERY_FAILURE: Failed to dispatch password reset code: ${error.message}`);
    }
  }

  /**
   * Dispatches Password Reset Email with LeagueForge dark aesthetic (15-min validity).
   */
  async sendPasswordResetEmail(email: string, username: string, tokenOrOtp: string) {
    if (tokenOrOtp && tokenOrOtp.length === 6 && /^[0-9]+$/.test(tokenOrOtp)) {
      return this.sendPasswordResetOtpEmail(email, username, tokenOrOtp);
    }

    const from = process.env.EMAIL_FROM || ENV.EMAIL_FROM || 'LeagueForge Arena <mvekariya2006@gmail.com>';
    const resetUrl = `${ENV.CLIENT_URL}/reset-password?token=${tokenOrOtp}`;
    const subject = 'Reset Your LeagueForge Password';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #f1f5f9; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background-color: #0f172a; border: 1px solid #1e293b; border-radius: 20px; padding: 36px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .logo { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: 1px; margin-bottom: 24px; }
    .logo span { color: #00f0ff; }
    h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin-top: 0; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 16px 0; }
    .alert { background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 10px; padding: 12px; color: #fca5a5; font-size: 12px; margin: 16px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #2563eb, #00f0ff); color: #020617 !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 12px; margin: 24px 0; letter-spacing: 0.5px; text-transform: uppercase; }
    .token-box { background-color: #1e293b; border: 1px dashed #334155; border-radius: 10px; padding: 12px; font-family: monospace; font-size: 13px; color: #38bdf8; word-break: break-all; margin: 16px 0; }
    .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">LEAGUE<span>FORGE</span></div>
      <h1>Password Reset Request</h1>
      <p>Hello ${username},</p>
      <p>We received a request to reset your LeagueForge password. Click the button below to establish a new password.</p>
      
      <div style="text-align: center;">
        <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
      </div>

      <div class="alert">
        ⏳ <strong>Security Notice:</strong> This link is strictly valid for <strong>15 minutes</strong>. If you did not make this request, you can safely ignore this email and your password will remain unchanged.
      </div>

      <p style="font-size: 12px; color: #64748b;">Or paste this direct link into your browser:</p>
      <div class="token-box">${resetUrl}</div>
    </div>
    <div class="footer">
      © 2026 LeagueForge Esports Management. All rights reserved.
    </div>
  </div>
</body>
</html>
    `;

    const text = `Hello ${username},\n\nA password reset was requested for your LeagueForge account. Visit the following link within 15 minutes to reset your password:\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;

    try {
      const info = await transporter.sendMail({
        from,
        to: email,
        subject,
        html,
        text
      });
      console.log(`[EmailService] Password reset email dispatched to ${email}: Message ID ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error(`[EmailService] Error sending password reset email to ${email}:`, error);
      throw new Error(`EMAIL_DELIVERY_FAILURE: Failed to dispatch password reset email: ${error.message}`);
    }
  }

  /**
   * Dispatches Email Verification message with direct link.
   */
  async sendVerificationEmail(email: string, username: string, token: string) {
    const from = process.env.EMAIL_FROM || ENV.EMAIL_FROM || 'LeagueForge Arena <mvekariya2006@gmail.com>';
    const verifyUrl = `${ENV.CLIENT_URL}/verify-email?token=${token}`;
    const subject = 'Verify Your LeagueForge Account';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #f1f5f9; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background-color: #0f172a; border: 1px solid #1e293b; border-radius: 20px; padding: 36px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .logo { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: 1px; margin-bottom: 24px; }
    .logo span { color: #00f0ff; }
    h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin-top: 0; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 16px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #2563eb, #00f0ff); color: #020617 !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 12px; margin: 24px 0; letter-spacing: 0.5px; text-transform: uppercase; }
    .token-box { background-color: #1e293b; border: 1px dashed #334155; border-radius: 10px; padding: 12px; font-family: monospace; font-size: 13px; color: #38bdf8; word-break: break-all; margin: 16px 0; }
    .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">LEAGUE<span>FORGE</span></div>
      <h1>Welcome to the Arena, ${username}!</h1>
      <p>Thank you for registering. To activate your account, participate in tournaments, or organize brackets, please confirm your email address.</p>
      
      <div style="text-align: center;">
        <a href="${verifyUrl}" class="btn" target="_blank">Confirm Email Address</a>
      </div>

      <p style="font-size: 12px; color: #64748b;">Or paste this direct verification link into your browser:</p>
      <div class="token-box">${verifyUrl}</div>

      <p style="font-size: 12px; color: #64748b;">This verification token will expire in 24 hours. If you did not create a LeagueForge account, please ignore this email.</p>
    </div>
    <div class="footer">
      © 2026 LeagueForge Esports Management. All rights reserved.
    </div>
  </div>
</body>
</html>
    `;

    const text = `Welcome to LeagueForge, ${username}!\n\nPlease confirm your email address by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours.`;

    try {
      const info = await transporter.sendMail({
        from,
        to: email,
        subject,
        html,
        text
      });
      console.log(`[EmailService] Verification email dispatched to ${email}: Message ID ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error(`[EmailService] Error sending verification email to ${email}:`, error);
      throw new Error(`EMAIL_DELIVERY_FAILURE: Failed to dispatch verification email: ${error.message}`);
    }
  }

  /**
   * Dispatches 6-digit confirmation OTP email when an authenticated user requests an email update.
   */
  async sendEmailChangeOtpEmail(newEmail: string, username: string, otp: string) {
    const from = process.env.EMAIL_FROM || ENV.EMAIL_FROM || 'LeagueForge Arena <mvekariya2006@gmail.com>';
    const subject = `${otp} is your LeagueForge email update verification code`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #f1f5f9; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background-color: #0f172a; border: 1px solid #1e293b; border-radius: 20px; padding: 36px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); text-align: center; }
    .logo { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: 1px; margin-bottom: 24px; }
    .logo span { color: #00f0ff; }
    h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin-top: 0; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 16px 0; }
    .otp-container { margin: 28px 0; }
    .otp-box { display: inline-block; background-color: #020617; border: 2px solid #00f0ff; border-radius: 16px; padding: 18px 32px; font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; color: #00f0ff; letter-spacing: 10px; box-shadow: 0 0 25px rgba(0, 240, 255, 0.25); }
    .expiry { font-size: 12px; color: #38bdf8; margin-top: 12px; }
    .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">LEAGUE<span>FORGE</span></div>
      <h1>Email Address Change Request</h1>
      <p>Hello ${username},</p>
      <p>A request was made to update the email address for your LeagueForge account to this address. Enter the confirmation code below to confirm this change:</p>
      
      <div class="otp-container">
        <div class="otp-box">${otp}</div>
        <div class="expiry">⏳ Code valid for 10 minutes</div>
      </div>

      <p style="font-size: 12px; color: #64748b;">If you did not request this change, please ignore this email and your LeagueForge credentials will remain unchanged.</p>
    </div>
    <div class="footer">
      © 2026 LeagueForge Esports Management. All rights reserved.
    </div>
  </div>
</body>
</html>
    `;

    const text = `Hello ${username},\n\nYour LeagueForge email change verification code is: ${otp}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.`;

    try {
      const info = await transporter.sendMail({
        from,
        to: newEmail,
        subject,
        html,
        text
      });
      console.log(`[EmailService] Email change OTP dispatched to ${newEmail}: Message ID ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error(`[EmailService] Error sending email change OTP to ${newEmail}:`, error);
      throw new Error(`EMAIL_DELIVERY_FAILURE: Failed to dispatch email change code: ${error.message}`);
    }
  }
}

export const emailService = new EmailService();

export const sendOtpEmail = (recipientEmail: string, otpCode: string, username?: string) =>
  emailService.sendOtpEmail(recipientEmail, otpCode, username);
