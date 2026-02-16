import { Request } from 'express';
import { Session } from '../lib/auth.js';

declare global {
  namespace Express {
    interface Request {
      session?: Session;
      organizationId?: string;
      user?: {
        id: string;
        email: string;
        name?: string;
        role?: string;
      };
      inspectorToken?: {
        id: string;
        organization_id: string;
        issued_by: string;
        issued_to?: string;
        expires_at: Date;
        revoked_at?: Date;
        last_used_at?: Date;
      };
      complianceWarnings?: Array<{ type: string; message: string; severity: string }>;
    }
  }
}

export {};
