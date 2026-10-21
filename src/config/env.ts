import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_esports_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '465', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
  SMTP_USER: process.env.SMTP_USER || 'mvekariya2006@gmail.com',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'LeagueForge Arena <mvekariya2006@gmail.com>'
};
