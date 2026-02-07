import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { organization } from 'better-auth/plugins';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { emailQueue } from './queue.js';
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
    schema,
  }),
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        const invitationLink = `${baseURL.replace('/api', '')}/accept-invitation/${data.id}`;
        
        await emailQueue.add('organization-invitation', {
          to: data.email,
          subject: `You're invited to join ${data.organization.name} on Torre Tempo`,
          template: 'organizationInvitation.html',
          data: {
            organizationName: data.organization.name,
            role: data.role,
            inviterName: data.inviter.user.name || 'A team member',
            inviterEmail: data.inviter.user.email,
            invitationLink,
            invitationId: data.id,
          },
        });
      },
    }),
    admin({
      impersonationSessionDuration: 60 * 60, // 1 hour impersonation sessions
      allowImpersonatingAdmins: false, // Platform admins cannot impersonate other admins
    }),
  ],
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
