/**
 * SettingsPage - Admin Integration Settings Management
 * Manage API keys for Stripe, GoCardless, Email (Resend), and payment configuration.
 * Keys are displayed masked; editing replaces the full value.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Settings,
  Key,
  Mail,
  CreditCard,
  DollarSign,
  RefreshCw,
  Save,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Database,
  Zap,
  Shield,
  User,
  Monitor,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  fetchSettings,
  updateSettings,
  restartServer,
} from '@/lib/api/admin';
import type { AdminSettings } from '@/lib/api/admin';

// ============================================================================
// TYPES
// ============================================================================

type TabId = 'stripe' | 'gocardless' | 'email' | 'general' | 'database' | 'redis' | 'auth' | 'admin' | 'frontend';

interface TabDefinition {
  id: TabId;
  label: string;
  icon: typeof Settings;
  color: string;
  gradient: string;
}

interface FieldConfig {
  key: string;
  label: string;
  placeholder: string;
  sensitive: boolean;
  description?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TABS: TabDefinition[] = [
  {
    id: 'stripe',
    label: 'Stripe',
    icon: CreditCard,
    color: 'text-violet-400',
    gradient: 'from-violet-600/20 to-indigo-600/20',
  },
  {
    id: 'gocardless',
    label: 'GoCardless',
    icon: DollarSign,
    color: 'text-cyan-400',
    gradient: 'from-cyan-600/20 to-teal-600/20',
  },
  {
    id: 'email',
    label: 'Email',
    icon: Mail,
    color: 'text-amber-400',
    gradient: 'from-amber-600/20 to-orange-600/20',
  },
  {
    id: 'general',
    label: 'General',
    icon: Settings,
    color: 'text-emerald-400',
    gradient: 'from-emerald-600/20 to-green-600/20',
  },
  {
    id: 'database',
    label: 'Database',
    icon: Database,
    color: 'text-red-400',
    gradient: 'from-red-600/20 to-pink-600/20',
  },
  {
    id: 'redis',
    label: 'Redis',
    icon: Zap,
    color: 'text-orange-400',
    gradient: 'from-orange-600/20 to-yellow-600/20',
  },
  {
    id: 'auth',
    label: 'Auth',
    icon: Shield,
    color: 'text-blue-400',
    gradient: 'from-blue-600/20 to-indigo-600/20',
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: User,
    color: 'text-purple-400',
    gradient: 'from-purple-600/20 to-fuchsia-600/20',
  },
  {
    id: 'frontend',
    label: 'Frontend',
    icon: Monitor,
    color: 'text-teal-400',
    gradient: 'from-teal-600/20 to-cyan-600/20',
  },
];

const STRIPE_FIELDS: FieldConfig[] = [
  {
    key: 'secretKey',
    label: 'Secret Key',
    placeholder: 'sk_live_...',
    sensitive: true,
    description: 'Your Stripe secret key for server-side API calls',
  },
  {
    key: 'publishableKey',
    label: 'Publishable Key',
    placeholder: 'pk_live_...',
    sensitive: false,
    description: 'Your Stripe publishable key for client-side usage',
  },
  {
    key: 'webhookSecret',
    label: 'Webhook Secret',
    placeholder: 'whsec_...',
    sensitive: true,
    description: 'Used to verify Stripe webhook event signatures',
  },
];

const GOCARDLESS_FIELDS: FieldConfig[] = [
  {
    key: 'accessToken',
    label: 'Access Token',
    placeholder: 'live_...',
    sensitive: true,
    description: 'GoCardless API access token',
  },
  {
    key: 'webhookSecret',
    label: 'Webhook Secret',
    placeholder: 'webhook-secret-...',
    sensitive: true,
    description: 'Used to verify GoCardless webhook signatures',
  },
];

const EMAIL_FIELDS: FieldConfig[] = [
  {
    key: 'resendApiKey',
    label: 'Resend API Key',
    placeholder: 're_...',
    sensitive: true,
    description: 'API key for Resend email service',
  },
];

const DATABASE_FIELDS: FieldConfig[] = [
  {
    key: 'url',
    label: 'Database URL',
    placeholder: 'postgresql://...',
    sensitive: true,
    description: '⚠️ CRITICAL: Changing this requires database migration',
  },
  {
    key: 'user',
    label: 'Database User',
    placeholder: 'torretempo',
    sensitive: false,
    description: 'PostgreSQL username',
  },
  {
    key: 'password',
    label: 'Database Password',
    placeholder: '••••••••',
    sensitive: true,
    description: 'PostgreSQL password',
  },
  {
    key: 'name',
    label: 'Database Name',
    placeholder: 'torretempo',
    sensitive: false,
    description: 'PostgreSQL database name',
  },
];

const REDIS_FIELDS: FieldConfig[] = [
  {
    key: 'url',
    label: 'Redis URL',
    placeholder: 'redis://localhost:6379',
    sensitive: true,
    description: 'Redis connection string for queues and caching',
  },
];

const AUTH_FIELDS: FieldConfig[] = [
  {
    key: 'url',
    label: 'Better Auth URL',
    placeholder: 'https://time.lsltgroup.es',
    sensitive: false,
    description: 'Base URL for authentication callbacks',
  },
  {
    key: 'secret',
    label: 'Auth Secret',
    placeholder: '64-character secret',
    sensitive: true,
    description: '⚠️ CRITICAL: Changing this invalidates all sessions',
  },
];

const ADMIN_FIELDS: FieldConfig[] = [
  {
    key: 'email',
    label: 'Admin Email',
    placeholder: 'admin@lsltgroup.es',
    sensitive: false,
    description: 'Platform administrator email for initial setup',
  },
  {
    key: 'password',
    label: 'Admin Password',
    placeholder: '••••••••',
    sensitive: true,
    description: 'Initial admin password (used for seed script)',
  },
];

const FRONTEND_FIELDS: FieldConfig[] = [
  {
    key: 'apiUrl',
    label: 'API URL',
    placeholder: 'https://time.lsltgroup.es',
    sensitive: false,
    description: 'Backend API base URL for frontend calls',
  },
  {
    key: 'stripePublishableKey',
    label: 'Stripe Publishable Key (Frontend)',
    placeholder: 'pk_live_...',
    sensitive: false,
    description: 'Public Stripe key exposed to client',
  },
];

const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'USD', label: 'USD - US Dollar' },
];

// ============================================================================
// HELPERS
// ============================================================================

function getEmptySettings(): AdminSettings {
  return {
    stripe: { secretKey: '', publishableKey: '', webhookSecret: '' },
    gocardless: { accessToken: '', webhookSecret: '', environment: 'sandbox' },
    email: { resendApiKey: '' },
    payment: { currency: 'EUR' },
    database: { url: '', user: '', password: '', name: '' },
    redis: { url: '' },
    auth: { url: '', secret: '' },
    admin: { email: '', password: '' },
    frontend: { apiUrl: '', stripePublishableKey: '' },
  };
}

function isMaskedValue(value: string): boolean {
  return value.includes('****');
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface SecretFieldProps {
  field: FieldConfig;
  value: string;
  editedValue: string | undefined;
  onEdit: (key: string, value: string) => void;
}

function SecretField({ field, value, editedValue, onEdit }: SecretFieldProps) {
  const [visible, setVisible] = useState(false);
  const isEdited = editedValue !== undefined;
  const isMasked = !isEdited && isMaskedValue(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-neutral-300">
          {field.label}
          {isEdited && (
            <Badge className="ml-2 border border-amber-500/30 bg-amber-500/20 text-amber-300 text-[10px]">
              Modified
            </Badge>
          )}
        </label>
        {field.sensitive && (
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-neutral-500 transition-colors hover:bg-white/5 hover:text-neutral-300"
          >
            {visible ? (
              <>
                <EyeOff className="h-3 w-3" />
                Hide
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" />
                Show
              </>
            )}
          </button>
        )}
      </div>
      <div className="relative">
        <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
        <Input
          type={field.sensitive && !visible ? 'password' : 'text'}
          placeholder={isMasked ? value : field.placeholder}
          value={isEdited ? editedValue : (isMasked ? '' : value)}
          onChange={(e) => onEdit(field.key, e.target.value)}
          className={cn(
            'pl-10 glass-card border-white/10 text-white font-mono text-sm',
            isEdited && 'border-amber-500/30 bg-amber-500/5'
          )}
        />
      </div>
      {field.description && (
        <p className="text-xs text-neutral-500">{field.description}</p>
      )}
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SettingsPage() {
  // Core state
  const [settings, setSettings] = useState<AdminSettings>(getEmptySettings());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('stripe');
  const [requiresRestart, setRequiresRestart] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Track edits per-field: only fields the user has changed
  const [editedStripe, setEditedStripe] = useState<Record<string, string>>({});
  const [editedGoCardless, setEditedGoCardless] = useState<Record<string, string>>({});
  const [editedEmail, setEditedEmail] = useState<Record<string, string>>({});
  const [editedPayment, setEditedPayment] = useState<Record<string, string>>({});
  const [editedDatabase, setEditedDatabase] = useState<Record<string, string>>({});
  const [editedRedis, setEditedRedis] = useState<Record<string, string>>({});
  const [editedAuth, setEditedAuth] = useState<Record<string, string>>({});
  const [editedAdmin, setEditedAdmin] = useState<Record<string, string>>({});
  const [editedFrontend, setEditedFrontend] = useState<Record<string, string>>({});

  // Confirmation dialogs
  const [restartDialog, setRestartDialog] = useState(false);

  // Derived: are there pending changes?
  const hasChanges = useMemo(() => {
    return (
      Object.keys(editedStripe).length > 0 ||
      Object.keys(editedGoCardless).length > 0 ||
      Object.keys(editedEmail).length > 0 ||
      Object.keys(editedPayment).length > 0 ||
      Object.keys(editedDatabase).length > 0 ||
      Object.keys(editedRedis).length > 0 ||
      Object.keys(editedAuth).length > 0 ||
      Object.keys(editedAdmin).length > 0 ||
      Object.keys(editedFrontend).length > 0
    );
  }, [editedStripe, editedGoCardless, editedEmail, editedPayment, editedDatabase, editedRedis, editedAuth, editedAdmin, editedFrontend]);

  // Fetch settings from API
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetchSettings();
      setSettings(response.settings);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load settings';
      setFetchError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Edit handlers per section
  const handleStripeEdit = useCallback((key: string, value: string) => {
    setEditedStripe((prev) => {
      if (value === '') {
        // If user clears a masked field, remove the edit
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const handleGoCardlessEdit = useCallback((key: string, value: string) => {
    setEditedGoCardless((prev) => {
      if (value === '') {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const handleEmailEdit = useCallback((key: string, value: string) => {
    setEditedEmail((prev) => {
      if (value === '') {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const handleEnvironmentChange = useCallback((value: string) => {
    if (value === 'sandbox' || value === 'live') {
      setEditedGoCardless((prev) => ({ ...prev, environment: value }));
    }
  }, []);

  const handleCurrencyChange = useCallback((value: string) => {
    setEditedPayment((prev) => ({ ...prev, currency: value }));
  }, []);

  const handleDatabaseEdit = useCallback((key: string, value: string) => {
    setEditedDatabase((prev) => {
      if (value === '') {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const handleRedisEdit = useCallback((key: string, value: string) => {
    setEditedRedis((prev) => {
      if (value === '') {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const handleAuthEdit = useCallback((key: string, value: string) => {
    setEditedAuth((prev) => {
      if (value === '') {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const handleAdminEdit = useCallback((key: string, value: string) => {
    setEditedAdmin((prev) => {
      if (value === '') {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const handleFrontendEdit = useCallback((key: string, value: string) => {
    setEditedFrontend((prev) => {
      if (value === '') {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  // Build the partial settings object from edits only
  const buildUpdatePayload = useCallback((): Partial<AdminSettings> => {
    const payload: Partial<AdminSettings> = {};

    if (Object.keys(editedStripe).length > 0) {
      payload.stripe = { ...settings.stripe, ...editedStripe };
    }
    if (Object.keys(editedGoCardless).length > 0) {
      const gcEdits = { ...editedGoCardless };
      const env = gcEdits.environment as 'sandbox' | 'live' | undefined;
      delete gcEdits.environment;
      payload.gocardless = {
        ...settings.gocardless,
        ...gcEdits,
        ...(env ? { environment: env } : {}),
      };
    }
    if (Object.keys(editedEmail).length > 0) {
      payload.email = { ...settings.email, ...editedEmail };
    }
    if (Object.keys(editedPayment).length > 0) {
      payload.payment = { ...settings.payment, ...editedPayment };
    }
    if (Object.keys(editedDatabase).length > 0) {
      payload.database = { ...settings.database, ...editedDatabase };
    }
    if (Object.keys(editedRedis).length > 0) {
      payload.redis = { ...settings.redis, ...editedRedis };
    }
    if (Object.keys(editedAuth).length > 0) {
      payload.auth = { ...settings.auth, ...editedAuth };
    }
    if (Object.keys(editedAdmin).length > 0) {
      payload.admin = { ...settings.admin, ...editedAdmin };
    }
    if (Object.keys(editedFrontend).length > 0) {
      payload.frontend = { ...settings.frontend, ...editedFrontend };
    }

    return payload;
  }, [editedStripe, editedGoCardless, editedEmail, editedPayment, editedDatabase, editedRedis, editedAuth, editedAdmin, editedFrontend, settings]);

  // Save
  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      const payload = buildUpdatePayload();
      const result = await updateSettings(payload);

      toast.success(result.message || 'Settings saved successfully');

      if (result.requiresRestart) {
        setRequiresRestart(true);
      }

      // Clear edits and reload fresh data
      setEditedStripe({});
      setEditedGoCardless({});
      setEditedEmail({});
      setEditedPayment({});
      setEditedDatabase({});
      setEditedRedis({});
      setEditedAuth({});
      setEditedAdmin({});
      setEditedFrontend({});
      await loadSettings();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save settings';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Restart
  const handleRestart = async () => {
    setRestartDialog(false);
    setIsRestarting(true);
    try {
      const result = await restartServer();
      toast.success(result.message || 'Server restart initiated');
      setRequiresRestart(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to restart server';
      toast.error(message);
    } finally {
      setIsRestarting(false);
    }
  };

  // Changed field count per tab
  const changeCountByTab: Record<TabId, number> = useMemo(() => ({
    stripe: Object.keys(editedStripe).length,
    gocardless: Object.keys(editedGoCardless).length,
    email: Object.keys(editedEmail).length,
    general: Object.keys(editedPayment).length,
    database: Object.keys(editedDatabase).length,
    redis: Object.keys(editedRedis).length,
    auth: Object.keys(editedAuth).length,
    admin: Object.keys(editedAdmin).length,
    frontend: Object.keys(editedFrontend).length,
  }), [editedStripe, editedGoCardless, editedEmail, editedPayment, editedDatabase, editedRedis, editedAuth, editedAdmin, editedFrontend]);

  // Resolve current GoCardless environment (edited or from settings)
  const currentEnvironment = (editedGoCardless.environment as 'sandbox' | 'live' | undefined) ?? settings.gocardless.environment;
  const currentCurrency = editedPayment.currency ?? settings.payment.currency;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600/20 to-orange-600/20 shadow-lg shadow-amber-500/10">
            <Settings className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Settings</h1>
            <p className="text-sm text-neutral-400">
              Integration keys and platform configuration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Restart button */}
          <AnimatePresence>
            {requiresRestart && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRestartDialog(true)}
                  disabled={isRestarting}
                  className="gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                >
                  <RefreshCw className={cn('h-4 w-4', isRestarting && 'animate-spin')} />
                  <span className="hidden sm:inline">
                    {isRestarting ? 'Restarting...' : 'Restart Server'}
                  </span>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Save button */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={cn(
                'gap-1.5 rounded-lg transition-all',
                hasChanges
                  ? 'bg-amber-600 text-white hover:bg-amber-500 shadow-lg shadow-amber-500/20'
                  : 'border border-white/5 bg-white/5 text-neutral-500'
              )}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </span>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Warning banner */}
      <AnimatePresence>
        {requiresRestart && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
              <p className="text-sm text-amber-200">
                Settings have been updated. A server restart is required for changes to take effect.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRestartDialog(true)}
                disabled={isRestarting}
                className="ml-auto shrink-0 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
              >
                {isRestarting ? 'Restarting...' : 'Restart Now'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending changes banner */}
      <AnimatePresence>
        {hasChanges && !requiresRestart && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
              <ShieldAlert className="h-5 w-5 shrink-0 text-blue-400" />
              <p className="text-sm text-blue-200">
                You have unsaved changes. Save to apply them to the server configuration.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center backdrop-blur-xl">
          <RefreshCw className="mb-3 h-8 w-8 animate-spin text-neutral-600" />
          <p className="text-neutral-500">Loading settings...</p>
        </div>
      ) : fetchError ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-16 text-center">
          <AlertTriangle className="mb-3 h-8 w-8 text-red-400" />
          <p className="mb-4 text-neutral-400">{fetchError}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadSettings}
            className="gap-2 border border-white/10 text-neutral-300 hover:bg-white/5"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex gap-2 overflow-x-auto pb-1"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const changeCount = changeCountByTab[tab.id];
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'group relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'border border-white/15 bg-white/10 text-white shadow-lg'
                      : 'border border-transparent text-neutral-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <tab.icon className={cn('h-4 w-4', isActive ? tab.color : 'text-neutral-500 group-hover:text-neutral-300')} />
                  {tab.label}
                  {changeCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/20 px-1.5 text-[10px] font-semibold text-amber-300">
                      {changeCount}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="settings-tab-indicator"
                      className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-amber-400"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </motion.div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Stripe Tab */}
              {activeTab === 'stripe' && (
                <div className="space-y-6">
                  <SectionCard
                    title="Stripe Configuration"
                    description="Configure Stripe payment gateway keys for subscription billing."
                    icon={CreditCard}
                    gradient="from-violet-600/20 to-indigo-600/20"
                    iconColor="text-violet-400"
                  >
                    <div className="space-y-5">
                      {STRIPE_FIELDS.map((field) => (
                        <SecretField
                          key={field.key}
                          field={field}
                          value={settings.stripe[field.key as keyof typeof settings.stripe]}
                          editedValue={editedStripe[field.key]}
                          onEdit={handleStripeEdit}
                        />
                      ))}
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* GoCardless Tab */}
              {activeTab === 'gocardless' && (
                <div className="space-y-6">
                  <SectionCard
                    title="GoCardless Configuration"
                    description="Configure GoCardless Direct Debit payment keys."
                    icon={DollarSign}
                    gradient="from-cyan-600/20 to-teal-600/20"
                    iconColor="text-cyan-400"
                    badge={
                      <Badge
                        className={cn(
                          'border text-xs',
                          currentEnvironment === 'live'
                            ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                            : 'border-amber-500/30 bg-amber-500/20 text-amber-300'
                        )}
                      >
                        {currentEnvironment === 'live' ? (
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                        ) : (
                          <AlertTriangle className="mr-1 h-3 w-3" />
                        )}
                        {currentEnvironment === 'live' ? 'Live' : 'Sandbox'}
                      </Badge>
                    }
                  >
                    <div className="space-y-5">
                      {GOCARDLESS_FIELDS.map((field) => (
                        <SecretField
                          key={field.key}
                          field={field}
                          value={settings.gocardless[field.key as keyof typeof settings.gocardless]}
                          editedValue={editedGoCardless[field.key]}
                          onEdit={handleGoCardlessEdit}
                        />
                      ))}

                      {/* Environment selector */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-neutral-300">
                            Environment
                            {editedGoCardless.environment !== undefined && (
                              <Badge className="ml-2 border border-amber-500/30 bg-amber-500/20 text-amber-300 text-[10px]">
                                Modified
                              </Badge>
                            )}
                          </label>
                        </div>
                        <Select
                          value={currentEnvironment}
                          onValueChange={handleEnvironmentChange}
                        >
                          <SelectTrigger className="glass-card border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass-card border-white/10">
                            <SelectItem value="sandbox" className="text-neutral-200">
                              Sandbox (Testing)
                            </SelectItem>
                            <SelectItem value="live" className="text-neutral-200">
                              Live (Production)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-neutral-500">
                          Use Sandbox for testing, Live for production payments
                        </p>
                      </motion.div>
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* Email Tab */}
              {activeTab === 'email' && (
                <div className="space-y-6">
                  <SectionCard
                    title="Email Configuration"
                    description="Configure the Resend email service for transactional emails."
                    icon={Mail}
                    gradient="from-amber-600/20 to-orange-600/20"
                    iconColor="text-amber-400"
                  >
                    <div className="space-y-5">
                      {EMAIL_FIELDS.map((field) => (
                        <SecretField
                          key={field.key}
                          field={field}
                          value={settings.email[field.key as keyof typeof settings.email]}
                          editedValue={editedEmail[field.key]}
                          onEdit={handleEmailEdit}
                        />
                      ))}
                    </div>
                  </SectionCard>
                </div>
              )}

               {/* General Tab */}
               {activeTab === 'general' && (
                 <div className="space-y-6">
                   <SectionCard
                     title="Payment Configuration"
                     description="General payment and billing settings."
                     icon={Settings}
                     gradient="from-emerald-600/20 to-green-600/20"
                     iconColor="text-emerald-400"
                   >
                     <motion.div
                       initial={{ opacity: 0, y: 8 }}
                       animate={{ opacity: 1, y: 0 }}
                       className="space-y-2"
                     >
                       <div className="flex items-center justify-between">
                         <label className="text-sm font-medium text-neutral-300">
                           Default Currency
                           {editedPayment.currency !== undefined && (
                             <Badge className="ml-2 border border-amber-500/30 bg-amber-500/20 text-amber-300 text-[10px]">
                               Modified
                             </Badge>
                           )}
                         </label>
                       </div>
                       <Select
                         value={currentCurrency}
                         onValueChange={handleCurrencyChange}
                       >
                         <SelectTrigger className="glass-card border-white/10 text-white">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent className="glass-card border-white/10">
                           {CURRENCY_OPTIONS.map((opt) => (
                             <SelectItem
                               key={opt.value}
                               value={opt.value}
                               className="text-neutral-200"
                             >
                               {opt.label}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                       <p className="text-xs text-neutral-500">
                         The default currency used for subscription billing
                       </p>
                     </motion.div>
                   </SectionCard>
                 </div>
               )}

               {/* Database Tab */}
               {activeTab === 'database' && (
                 <div className="space-y-6">
                   <SectionCard
                     title="Database Configuration"
                     description="PostgreSQL connection settings. ⚠️ Changes require server restart and may cause downtime."
                     icon={Database}
                     gradient="from-red-600/20 to-pink-600/20"
                     iconColor="text-red-400"
                     badge={
                       <Badge className="border border-red-500/30 bg-red-500/20 text-red-300 text-xs">
                         <AlertTriangle className="mr-1 h-3 w-3" />
                         Critical
                       </Badge>
                     }
                   >
                     <div className="space-y-5">
                       {DATABASE_FIELDS.map((field) => (
                         <SecretField
                           key={field.key}
                           field={field}
                           value={settings.database[field.key as keyof typeof settings.database]}
                           editedValue={editedDatabase[field.key]}
                           onEdit={handleDatabaseEdit}
                         />
                       ))}
                     </div>
                   </SectionCard>
                 </div>
               )}

               {/* Redis Tab */}
               {activeTab === 'redis' && (
                 <div className="space-y-6">
                   <SectionCard
                     title="Redis Configuration"
                     description="Redis connection for queues (BullMQ) and caching."
                     icon={Zap}
                     gradient="from-orange-600/20 to-yellow-600/20"
                     iconColor="text-orange-400"
                   >
                     <div className="space-y-5">
                       {REDIS_FIELDS.map((field) => (
                         <SecretField
                           key={field.key}
                           field={field}
                           value={settings.redis[field.key as keyof typeof settings.redis]}
                           editedValue={editedRedis[field.key]}
                           onEdit={handleRedisEdit}
                         />
                       ))}
                     </div>
                   </SectionCard>
                 </div>
               )}

               {/* Auth Tab */}
               {activeTab === 'auth' && (
                 <div className="space-y-6">
                   <SectionCard
                     title="Authentication Configuration"
                     description="Better Auth settings for session management and OAuth callbacks."
                     icon={Shield}
                     gradient="from-blue-600/20 to-indigo-600/20"
                     iconColor="text-blue-400"
                     badge={
                       <Badge className="border border-blue-500/30 bg-blue-500/20 text-blue-300 text-xs">
                         <ShieldAlert className="mr-1 h-3 w-3" />
                         Session Critical
                       </Badge>
                     }
                   >
                     <div className="space-y-5">
                       {AUTH_FIELDS.map((field) => (
                         <SecretField
                           key={field.key}
                           field={field}
                           value={settings.auth[field.key as keyof typeof settings.auth]}
                           editedValue={editedAuth[field.key]}
                           onEdit={handleAuthEdit}
                         />
                       ))}
                     </div>
                   </SectionCard>
                 </div>
               )}

               {/* Admin Tab */}
               {activeTab === 'admin' && (
                 <div className="space-y-6">
                   <SectionCard
                     title="Admin Credentials"
                     description="Platform administrator account settings for initial setup."
                     icon={User}
                     gradient="from-purple-600/20 to-fuchsia-600/20"
                     iconColor="text-purple-400"
                   >
                     <div className="space-y-5">
                       {ADMIN_FIELDS.map((field) => (
                         <SecretField
                           key={field.key}
                           field={field}
                           value={settings.admin[field.key as keyof typeof settings.admin]}
                           editedValue={editedAdmin[field.key]}
                           onEdit={handleAdminEdit}
                         />
                       ))}
                     </div>
                   </SectionCard>
                 </div>
               )}

               {/* Frontend Tab */}
               {activeTab === 'frontend' && (
                 <div className="space-y-6">
                   <SectionCard
                     title="Frontend Configuration"
                     description="Client-side application settings and public API keys."
                     icon={Monitor}
                     gradient="from-teal-600/20 to-cyan-600/20"
                     iconColor="text-teal-400"
                   >
                     <div className="space-y-5">
                       {FRONTEND_FIELDS.map((field) => (
                         <SecretField
                           key={field.key}
                           field={field}
                           value={settings.frontend[field.key as keyof typeof settings.frontend]}
                           editedValue={editedFrontend[field.key]}
                           onEdit={handleFrontendEdit}
                         />
                       ))}
                     </div>
                   </SectionCard>
                 </div>
               )}
             </motion.div>
           </AnimatePresence>
        </>
      )}

      {/* Restart Confirmation Dialog */}
      <Dialog open={restartDialog} onOpenChange={setRestartDialog}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <RefreshCw className="h-5 w-5 text-red-400" />
              Restart Server
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              This will restart the server process. The application may be
              briefly unavailable during the restart. Are you sure you want to continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRestartDialog(false)}
              disabled={isRestarting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRestart}
              disabled={isRestarting}
              className="bg-red-600 hover:bg-red-500"
            >
              {isRestarting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restarting...
                </>
              ) : (
                'Restart Server'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// SECTION CARD
// ============================================================================

interface SectionCardProps {
  title: string;
  description: string;
  icon: typeof Settings;
  gradient: string;
  iconColor: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

function SectionCard({
  title,
  description,
  icon: Icon,
  gradient,
  iconColor,
  badge,
  children,
}: SectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
    >
      {/* Top gradient accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="p-6">
        {/* Card header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg',
                gradient
              )}
            >
              <Icon className={cn('h-5 w-5', iconColor)} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              <p className="text-sm text-neutral-400">{description}</p>
            </div>
          </div>
          {badge}
        </div>

        {/* Card content */}
        {children}
      </div>
    </motion.div>
  );
}
