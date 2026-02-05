import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { db } from '../db/index.js';
import 'dotenv/config';

const baseURL = process.env.AUTH_BASE_URL || 'http://localhost:3000';
const secret = process.env.AUTH_SECRET;

if (!secret) {
  throw new Error('AUTH_SECRET environment variable is required');
}

export const auth = betterAuth({
  baseURL,
  secret,
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  plugins: [admin()],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 15, // 15 minutes
    updateAge: 60 * 60 * 24, // 24 hours
  },
  trustedOrigins: [
    'https://time.lsltgroup.es',
    'http://localhost:5173',
  ],
});

export type Session = typeof auth.$Infer.Session;
