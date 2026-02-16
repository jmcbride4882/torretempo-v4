import { Router, Request, Response } from 'express';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { logAdminAction } from '../../services/adminAudit.service.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import logger from '../../lib/logger.js';

/**
 * Admin Settings Routes
 * Manage platform configuration and integration keys
 * 
 * Security:
 * - Platform admin only
 * - Keys stored in .env file (not database)
 * - All changes logged to audit trail
 * - Keys never returned in API responses (only masked values)
 */

const router = Router();

interface SettingsConfig {
  stripe: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
  };
  gocardless: {
    accessToken: string;
    webhookSecret: string;
    environment: 'sandbox' | 'live';
  };
  email: {
    resendApiKey: string;
  };
  payment: {
    currency: string;
  };
  database: {
    url: string;
    user: string;
    password: string;
    name: string;
  };
  redis: {
    url: string;
  };
  auth: {
    url: string;
    secret: string;
  };
  admin: {
    email: string;
    password: string;
  };
  frontend: {
    apiUrl: string;
    stripePublishableKey: string;
  };
}

/**
 * GET /api/admin/settings
 * Get current settings (keys are masked for security)
 */
router.get('/', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const settings: SettingsConfig = {
      stripe: {
        secretKey: maskKey(process.env.STRIPE_SECRET_KEY || ''),
        publishableKey: maskKey(process.env.STRIPE_PUBLISHABLE_KEY || ''),
        webhookSecret: maskKey(process.env.STRIPE_WEBHOOK_SECRET || ''),
      },
      gocardless: {
        accessToken: maskKey(process.env.GOCARDLESS_ACCESS_TOKEN || ''),
        webhookSecret: maskKey(process.env.GOCARDLESS_WEBHOOK_SECRET || ''),
        environment: (process.env.GOCARDLESS_ENVIRONMENT as 'sandbox' | 'live') || 'sandbox',
      },
      email: {
        resendApiKey: maskKey(process.env.RESEND_API_KEY || ''),
      },
      payment: {
        currency: process.env.PAYMENT_CURRENCY || 'EUR',
      },
      database: {
        url: maskKey(process.env.DATABASE_URL || ''),
        user: process.env.POSTGRES_USER || '',
        password: maskKey(process.env.POSTGRES_PASSWORD || ''),
        name: process.env.POSTGRES_DB || '',
      },
      redis: {
        url: maskKey(process.env.REDIS_URL || ''),
      },
      auth: {
        url: process.env.AUTH_BASE_URL || '',
        secret: maskKey(process.env.AUTH_SECRET || ''),
      },
      admin: {
        email: process.env.ADMIN_EMAIL || '',
        password: maskKey(process.env.ADMIN_PASSWORD || ''),
      },
      frontend: {
        apiUrl: process.env.VITE_API_URL || '',
        stripePublishableKey: maskKey(process.env.VITE_STRIPE_PUBLISHABLE_KEY || ''),
      },
    };

    res.json({ settings });
  } catch (error) {
    logger.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/settings
 * Update platform settings
 * 
 * Body: Partial<SettingsConfig> - Only provided keys will be updated
 * 
 * Security:
 * - Updates .env file on server
 * - Requires server restart to take effect
 * - All changes logged to audit
 */
router.put('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const actor = req.user;
    if (!actor?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const updates = req.body;
    
    // Read current .env file
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch (error) {
      return res.status(500).json({ 
        message: '.env file not found. Please create it manually first.' 
      });
    }

    // Parse .env into key-value pairs while preserving structure
    const envVars = new Map<string, string>();
    const envLines: string[] = [];
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars.set(key.trim(), valueParts.join('=').trim());
        }
      }
      envLines.push(line); // Preserve all lines (comments, blanks, etc.)
    });

    // Track what was changed for audit log
    const changedKeys: string[] = [];

    // Helper: Check if value is different and not masked
    const shouldUpdate = (newValue: string | undefined, currentValue: string): boolean => {
      if (!newValue) return false;
      const masked = maskKey(currentValue);
      // Only update if: value is not masked AND different from current
      if (newValue === masked) return false; // User didn't change it
      if (!isMaskedValue(newValue) && newValue !== currentValue) {
        return true; // New actual value
      }
      return false;
    };

    // Update Stripe keys
    if (updates.stripe) {
      if (shouldUpdate(updates.stripe.secretKey, process.env.STRIPE_SECRET_KEY || '')) {
        envVars.set('STRIPE_SECRET_KEY', updates.stripe.secretKey!);
        changedKeys.push('STRIPE_SECRET_KEY');
      }
      if (shouldUpdate(updates.stripe.publishableKey, process.env.STRIPE_PUBLISHABLE_KEY || '')) {
        envVars.set('STRIPE_PUBLISHABLE_KEY', updates.stripe.publishableKey!);
        changedKeys.push('STRIPE_PUBLISHABLE_KEY');
      }
      if (shouldUpdate(updates.stripe.webhookSecret, process.env.STRIPE_WEBHOOK_SECRET || '')) {
        envVars.set('STRIPE_WEBHOOK_SECRET', updates.stripe.webhookSecret!);
        changedKeys.push('STRIPE_WEBHOOK_SECRET');
      }
    }

    // Update GoCardless keys
    if (updates.gocardless) {
      if (shouldUpdate(updates.gocardless.accessToken, process.env.GOCARDLESS_ACCESS_TOKEN || '')) {
        envVars.set('GOCARDLESS_ACCESS_TOKEN', updates.gocardless.accessToken!);
        changedKeys.push('GOCARDLESS_ACCESS_TOKEN');
      }
      if (shouldUpdate(updates.gocardless.webhookSecret, process.env.GOCARDLESS_WEBHOOK_SECRET || '')) {
        envVars.set('GOCARDLESS_WEBHOOK_SECRET', updates.gocardless.webhookSecret!);
        changedKeys.push('GOCARDLESS_WEBHOOK_SECRET');
      }
      if (updates.gocardless.environment && updates.gocardless.environment !== process.env.GOCARDLESS_ENVIRONMENT) {
        envVars.set('GOCARDLESS_ENVIRONMENT', updates.gocardless.environment);
        changedKeys.push('GOCARDLESS_ENVIRONMENT');
      }
    }

    // Update Email key
    if (shouldUpdate(updates.email?.resendApiKey, process.env.RESEND_API_KEY || '')) {
      envVars.set('RESEND_API_KEY', updates.email!.resendApiKey!);
      changedKeys.push('RESEND_API_KEY');
    }

    // Update Payment currency
    if (updates.payment?.currency && updates.payment.currency !== process.env.PAYMENT_CURRENCY) {
      envVars.set('PAYMENT_CURRENCY', updates.payment.currency);
      changedKeys.push('PAYMENT_CURRENCY');
    }

    // Update Database settings
    if (updates.database) {
      if (shouldUpdate(updates.database.url, process.env.DATABASE_URL || '')) {
        envVars.set('DATABASE_URL', updates.database.url!);
        changedKeys.push('DATABASE_URL');
      }
      if (updates.database.user && updates.database.user !== process.env.POSTGRES_USER) {
        envVars.set('POSTGRES_USER', updates.database.user);
        changedKeys.push('POSTGRES_USER');
      }
      if (shouldUpdate(updates.database.password, process.env.POSTGRES_PASSWORD || '')) {
        envVars.set('POSTGRES_PASSWORD', updates.database.password!);
        changedKeys.push('POSTGRES_PASSWORD');
      }
      if (updates.database.name && updates.database.name !== process.env.POSTGRES_DB) {
        envVars.set('POSTGRES_DB', updates.database.name);
        changedKeys.push('POSTGRES_DB');
      }
    }

    // Update Redis settings
    if (shouldUpdate(updates.redis?.url, process.env.REDIS_URL || '')) {
      envVars.set('REDIS_URL', updates.redis!.url!);
      changedKeys.push('REDIS_URL');
    }

    // Update Better Auth settings
    if (updates.auth) {
      if (updates.auth.url && updates.auth.url !== process.env.AUTH_BASE_URL) {
        envVars.set('AUTH_BASE_URL', updates.auth.url);
        changedKeys.push('AUTH_BASE_URL');
      }
      if (shouldUpdate(updates.auth.secret, process.env.AUTH_SECRET || '')) {
        envVars.set('AUTH_SECRET', updates.auth.secret!);
        changedKeys.push('AUTH_SECRET');
      }
    }

    // Update Admin credentials
    if (updates.admin) {
      if (updates.admin.email && updates.admin.email !== process.env.ADMIN_EMAIL) {
        envVars.set('ADMIN_EMAIL', updates.admin.email);
        changedKeys.push('ADMIN_EMAIL');
      }
      if (shouldUpdate(updates.admin.password, process.env.ADMIN_PASSWORD || '')) {
        envVars.set('ADMIN_PASSWORD', updates.admin.password!);
        changedKeys.push('ADMIN_PASSWORD');
      }
    }

    // Update Frontend settings
    if (updates.frontend) {
      if (updates.frontend.apiUrl && updates.frontend.apiUrl !== process.env.VITE_API_URL) {
        envVars.set('VITE_API_URL', updates.frontend.apiUrl);
        changedKeys.push('VITE_API_URL');
      }
      if (shouldUpdate(updates.frontend.stripePublishableKey, process.env.VITE_STRIPE_PUBLISHABLE_KEY || '')) {
        envVars.set('VITE_STRIPE_PUBLISHABLE_KEY', updates.frontend.stripePublishableKey!);
        changedKeys.push('VITE_STRIPE_PUBLISHABLE_KEY');
      }
    }

    if (changedKeys.length === 0) {
      return res.json({ 
        message: 'No changes detected',
        requiresRestart: false,
      });
    }

    // Write updated .env file (preserve structure where possible)
    const newEnvLines = envLines.map(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key] = trimmed.split('=');
        const cleanKey = key?.trim();
        if (cleanKey && envVars.has(cleanKey)) {
          return `${cleanKey}=${envVars.get(cleanKey)}`;
        }
      }
      return line; // Keep comments and blank lines as-is
    });
    
    await fs.writeFile(envPath, newEnvLines.join('\n'), 'utf-8');

    // Log audit entry
    await logAdminAction({
      adminId: actor.id,
      action: 'settings.update',
      targetType: 'system',
      details: {
        changedKeys,
        admin_email: actor.email,
      },
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '',
    });

    res.json({ 
      message: 'Settings updated successfully. Server restart required for changes to take effect.',
      changedKeys,
      requiresRestart: true,
    });
  } catch (error) {
    logger.error('Error updating settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/admin/settings/restart
 * Trigger server restart to apply new settings
 * 
 * Note: This only works if the server is running under a process manager
 * like PM2, systemd, or docker-compose with restart policies
 */
router.post('/restart', requireAdmin, async (req: Request, res: Response) => {
  try {
    const actor = req.user;
    if (!actor?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Log audit entry
    await logAdminAction({
      adminId: actor.id,
      action: 'system.restart',
      targetType: 'system',
      details: {
        admin_email: actor.email,
      },
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '',
    });

    // Send response before exiting
    res.json({ message: 'Server restart initiated' });

    // Exit process after a short delay (let response send)
    setTimeout(() => {
      process.exit(0);
    }, 500);
  } catch (error) {
    logger.error('Error restarting server:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * Mask API key for security (show first 4 and last 4 characters)
 */
function maskKey(key: string): string {
  if (!key || key.length < 12) return key ? '****' : '';
  return `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`;
}

/**
 * Check if a value appears to be masked (contains asterisks)
 */
function isMaskedValue(value: string): boolean {
  return value.includes('*');
}

export default router;
