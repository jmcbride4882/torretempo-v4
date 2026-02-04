import { createAuthClient } from 'better-auth/react';
import { organizationClient, adminClient } from 'better-auth/client/plugins';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    organizationClient(),
    adminClient(),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

// Organization methods
export const {
  organization,
} = authClient;

// Admin methods
export const {
  admin,
} = authClient;

// Type exports for session data
export type Session = typeof authClient.$Infer.Session;
export type User = Session['user'];
