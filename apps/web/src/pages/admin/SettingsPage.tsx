/**
 * SettingsPage - Admin Integration Settings Management
 * Manage API keys for Stripe, GoCardless, Email (Resend), and payment configuration.
 * Keys are displayed masked; editing replaces the full value.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  labelKey: string;
  icon: typeof Settings;
  color: string;
}

interface FieldConfig {
  key: string;
  labelKey: string;
  placeholder: string;
  sensitive: boolean;
  descriptionKey?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TABS: TabDefinition[] = [
  {
    id: 'stripe',
    labelKey: 'admin.settings.tabStripe',
    icon: CreditCard,
    color: 'text-primary-600',
  },
  {
    id: 'gocardless',
    labelKey: 'admin.settings.tabGoCardless',
    icon: DollarSign,
    color: 'text-cyan-600',
  },
  {
    id: 'email',
    labelKey: 'admin.settings.tabEmail',
    icon: Mail,
    color: 'text-primary-600',
  },
  {
    id: 'general',
    labelKey: 'admin.settings.tabGeneral',
    icon: Settings,
    color: 'text-emerald-600',
  },
  {
    id: 'database',
    labelKey: 'admin.settings.tabDatabase',
    icon: Database,
    color: 'text-red-600',
  },
  {
    id: 'redis',
    labelKey: 'admin.settings.tabRedis',
    icon: Zap,
    color: 'text-orange-600',
  },
  {
    id: 'auth',
    labelKey: 'admin.settings.tabAuth',
    icon: Shield,
    color: 'text-primary-600',
  },
  {
    id: 'admin',
    labelKey: 'admin.settings.tabAdmin',
    icon: User,
    color: 'text-purple-600',
  },
  {
    id: 'frontend',
    labelKey: 'admin.settings.tabFrontend',
    icon: Monitor,
    color: 'text-teal-600',
  },
];

const STRIPE_FIELDS: FieldConfig[] = [
  {
    key: 'secretKey',
    labelKey: 'admin.settings.stripe.secretKey',
    placeholder: 'sk_live_...',
    sensitive: true,
    descriptionKey: 'admin.settings.stripe.secretKeyDesc',
  },
  {
    key: 'publishableKey',
    labelKey: 'admin.settings.stripe.publishableKey',
    placeholder: 'pk_live_...',
    sensitive: false,
    descriptionKey: 'admin.settings.stripe.publishableKeyDesc',
  },
  {
    key: 'webhookSecret',
    labelKey: 'admin.settings.stripe.webhookSecret',
    placeholder: 'whsec_...',
    sensitive: true,
    descriptionKey: 'admin.settings.stripe.webhookSecretDesc',
  },
];

const GOCARDLESS_FIELDS: FieldConfig[] = [
  {
    key: 'accessToken',
    labelKey: 'admin.settings.gocardless.accessToken',
    placeholder: 'live_...',
    sensitive: true,
    descriptionKey: 'admin.settings.gocardless.accessTokenDesc',
  },
  {
    key: 'webhookSecret',
    labelKey: 'admin.settings.gocardless.webhookSecret',
    placeholder: 'webhook-secret-...',
    sensitive: true,
    descriptionKey: 'admin.settings.gocardless.webhookSecretDesc',
  },
];

const EMAIL_FIELDS: FieldConfig[] = [
  {
    key: 'resendApiKey',
    labelKey: 'admin.settings.email.resendApiKey',
    placeholder: 're_...',
    sensitive: true,
    descriptionKey: 'admin.settings.email.resendApiKeyDesc',
  },
];

const DATABASE_FIELDS: FieldConfig[] = [
  {
    key: 'url',
    labelKey: 'admin.settings.database.url',
    placeholder: 'postgresql://...',
    sensitive: true,
    descriptionKey: 'admin.settings.database.urlDesc',
  },
  {
    key: 'user',
    labelKey: 'admin.settings.database.user',
    placeholder: 'torretempo',
    sensitive: false,
    descriptionKey: 'admin.settings.database.userDesc',
  },
  {
    key: 'password',
    labelKey: 'admin.settings.database.password',
    placeholder: '--------',
    sensitive: true,
    descriptionKey: 'admin.settings.database.passwordDesc',
  },
  {
    key: 'name',
    labelKey: 'admin.settings.database.name',
    placeholder: 'torretempo',
    sensitive: false,
    descriptionKey: 'admin.settings.database.nameDesc',
  },
];

const REDIS_FIELDS: FieldConfig[] = [
  {
    key: 'url',
    labelKey: 'admin.settings.redis.url',
    placeholder: 'redis://localhost:6379',
    sensitive: true,
    descriptionKey: 'admin.settings.redis.urlDesc',
  },
];

const AUTH_FIELDS: FieldConfig[] = [
  {
    key: 'url',
    labelKey: 'admin.settings.auth.url',
    placeholder: 'https://time.lsltgroup.es',
    sensitive: false,
    descriptionKey: 'admin.settings.auth.urlDesc',
  },
  {
    key: 'secret',
    labelKey: 'admin.settings.auth.secret',
    placeholder: '64-character secret',
    sensitive: true,
    descriptionKey: 'admin.settings.auth.secretDesc',
  },
];

const ADMIN_FIELDS: FieldConfig[] = [
  {
    key: 'email',
    labelKey: 'admin.settings.adminCreds.email',
    placeholder: 'admin@lsltgroup.es',
    sensitive: false,
    descriptionKey: 'admin.settings.adminCreds.emailDesc',
  },
  {
    key: 'password',
    labelKey: 'admin.settings.adminCreds.password',
    placeholder: '--------',
    sensitive: true,
    descriptionKey: 'admin.settings.adminCreds.passwordDesc',
  },
];

const FRONTEND_FIELDS: FieldConfig[] = [
  {
    key: 'apiUrl',
    labelKey: 'admin.settings.frontend.apiUrl',
    placeholder: 'https://time.lsltgroup.es',
    sensitive: false,
    descriptionKey: 'admin.settings.frontend.apiUrlDesc',
  },
  {
    key: 'stripePublishableKey',
    labelKey: 'admin.settings.frontend.stripePublishableKey',
    placeholder: 'pk_live_...',
    sensitive: false,
    descriptionKey: 'admin.settings.frontend.stripePublishableKeyDesc',
  },
];

const CURRENCY_OPTIONS = [
  { value: 'EUR', labelKey: 'admin.settings.currencyEur' },
  { value: 'GBP', labelKey: 'admin.settings.currencyGbp' },
  { value: 'USD', labelKey: 'admin.settings.currencyUsd' },
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
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const isEdited = editedValue !== undefined;
  const isMasked = !isEdited && isMaskedValue(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-kresna-gray-dark">
          {t(field.labelKey)}
          {isEdited && (
            <Badge className="ml-2 border border-primary-300 bg-primary-50 text-primary-700 text-[10px]">
              {t('admin.settings.modified')}
            </Badge>
          )}
        </label>
        {field.sensitive && (
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-kresna-gray transition-colors hover:bg-kresna-light hover:text-kresna-gray-dark"
          >
            {visible ? (
              <>
                <EyeOff className="h-3 w-3" />
                {t('admin.settings.hide')}
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" />
                {t('admin.settings.show')}
              </>
            )}
          </button>
        )}
      </div>
      <div className="relative">
        <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kresna-gray" />
        <Input
          type={field.sensitive && !visible ? 'password' : 'text'}
          placeholder={isMasked ? value : field.placeholder}
          value={isEdited ? editedValue : (isMasked ? '' : value)}
          onChange={(e) => onEdit(field.key, e.target.value)}
          className={cn(
            'pl-10 rounded-xl border border-kresna-border bg-white text-charcoal font-mono text-sm placeholder:text-kresna-gray',
            isEdited && 'border-primary-300 bg-primary-50'
          )}
        />
      </div>
      {field.descriptionKey && (
        <p className="text-xs text-kresna-gray">{t(field.descriptionKey)}</p>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SettingsPage() {
  const { t } = useTranslation();

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
      const message = error instanceof Error ? error.message : t('admin.settings.failedToLoad');
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

      toast.success(result.message || t('admin.settings.settingsSaved'));

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
      const message = error instanceof Error ? error.message : t('admin.settings.failedToSave');
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
      toast.success(result.message || t('admin.settings.restartInitiated'));
      setRequiresRestart(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('admin.settings.failedToRestart');
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 shadow-sm">
            <Settings className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-charcoal sm:text-2xl">{t('admin.settings.title')}</h1>
            <p className="text-sm text-kresna-gray">
              {t('admin.settings.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Restart button */}
          {requiresRestart && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRestartDialog(true)}
                disabled={isRestarting}
                className="gap-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
              >
                <RefreshCw className={cn('h-4 w-4', isRestarting && 'animate-spin')} />
                <span className="hidden sm:inline">
                  {isRestarting ? t('admin.settings.restarting') : t('admin.settings.restartServer')}
                </span>
              </Button>
            </div>
          )}

          {/* Save button */}
          <div>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={cn(
                'gap-1.5 rounded-lg transition-all',
                hasChanges
                  ? 'bg-primary-600 text-white hover:bg-primary-500 shadow-sm'
                  : 'border border-kresna-border bg-kresna-light text-kresna-gray'
              )}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {isSaving ? t('admin.saving') : t('common.save')}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Warning banner */}
      {requiresRestart && (
        <div className="overflow-hidden">
          <div className="flex items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-primary-600" />
            <p className="text-sm text-primary-800">
              {t('admin.settings.restartRequired')}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRestartDialog(true)}
              disabled={isRestarting}
              className="ml-auto shrink-0 text-primary-600 hover:bg-primary-100 hover:text-primary-700"
            >
              {isRestarting ? t('admin.settings.restarting') : t('admin.settings.restartNow')}
            </Button>
          </div>
        </div>
      )}

      {/* Pending changes banner */}
      {hasChanges && !requiresRestart && (
        <div className="overflow-hidden">
          <div className="flex items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3">
            <ShieldAlert className="h-5 w-5 shrink-0 text-primary-600" />
            <p className="text-sm text-primary-800">
              {t('admin.settings.unsavedChanges')}
            </p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-kresna-border bg-kresna-light px-6 py-16 text-center">
          <RefreshCw className="mb-3 h-8 w-8 animate-spin text-kresna-gray" />
          <p className="text-kresna-gray">{t('common.loading')}</p>
        </div>
      ) : fetchError ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-6 py-16 text-center">
          <AlertTriangle className="mb-3 h-8 w-8 text-red-600" />
          <p className="mb-4 text-kresna-gray">{fetchError}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadSettings}
            className="gap-2 border border-kresna-border text-kresna-gray-dark hover:bg-kresna-light"
          >
            <RefreshCw className="h-4 w-4" />
            {t('admin.settings.retry')}
          </Button>
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="flex gap-2 overflow-x-auto pb-1">
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
                      ? 'border border-kresna-border bg-white text-charcoal shadow-sm'
                      : 'border border-transparent text-kresna-gray hover:bg-kresna-light hover:text-charcoal'
                  )}
                >
                  <tab.icon className={cn('h-4 w-4', isActive ? tab.color : 'text-kresna-gray group-hover:text-kresna-gray-dark')} />
                  {t(tab.labelKey)}
                  {changeCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-50 px-1.5 text-[10px] font-semibold text-primary-700">
                      {changeCount}
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-primary-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div>
            {/* Stripe Tab */}
            {activeTab === 'stripe' && (
              <div className="space-y-6">
                <SectionCard
                  title={t('admin.settings.stripeConfig')}
                  description={t('admin.settings.stripeConfigDesc')}
                  icon={CreditCard}
                  iconColor="text-primary-600"
                  iconBg="bg-primary-50"
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
                  title={t('admin.settings.gocardlessConfig')}
                  description={t('admin.settings.gocardlessConfigDesc')}
                  icon={DollarSign}
                  iconColor="text-cyan-600"
                  iconBg="bg-cyan-50"
                  badge={
                    <Badge
                      className={cn(
                        'border text-xs',
                        currentEnvironment === 'live'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'border-primary-300 bg-primary-50 text-primary-700'
                      )}
                    >
                      {currentEnvironment === 'live' ? (
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                      ) : (
                        <AlertTriangle className="mr-1 h-3 w-3" />
                      )}
                      {currentEnvironment === 'live' ? t('admin.settings.live') : t('admin.settings.sandbox')}
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
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-kresna-gray-dark">
                          {t('admin.settings.environment')}
                          {editedGoCardless.environment !== undefined && (
                            <Badge className="ml-2 border border-primary-300 bg-primary-50 text-primary-700 text-[10px]">
                              {t('admin.settings.modified')}
                            </Badge>
                          )}
                        </label>
                      </div>
                      <Select
                        value={currentEnvironment}
                        onValueChange={handleEnvironmentChange}
                      >
                        <SelectTrigger className="rounded-xl border border-kresna-border bg-white text-charcoal">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-kresna-border bg-white">
                          <SelectItem value="sandbox" className="text-kresna-gray-dark">
                            {t('admin.settings.sandboxTesting')}
                          </SelectItem>
                          <SelectItem value="live" className="text-kresna-gray-dark">
                            {t('admin.settings.liveProduction')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-kresna-gray">
                        {t('admin.settings.environmentHint')}
                      </p>
                    </div>
                  </div>
                </SectionCard>
              </div>
            )}

            {/* Email Tab */}
            {activeTab === 'email' && (
              <div className="space-y-6">
                <SectionCard
                  title={t('admin.settings.emailTemplates')}
                  description={t('admin.settings.emailConfigDesc')}
                  icon={Mail}
                  iconColor="text-primary-600"
                  iconBg="bg-primary-50"
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
                   title={t('admin.settings.paymentConfig')}
                   description={t('admin.settings.paymentConfigDesc')}
                   icon={Settings}
                   iconColor="text-emerald-600"
                   iconBg="bg-emerald-50"
                 >
                   <div className="space-y-2">
                     <div className="flex items-center justify-between">
                       <label className="text-sm font-medium text-kresna-gray-dark">
                         {t('admin.settings.defaultCurrency')}
                         {editedPayment.currency !== undefined && (
                           <Badge className="ml-2 border border-primary-300 bg-primary-50 text-primary-700 text-[10px]">
                             {t('admin.settings.modified')}
                           </Badge>
                         )}
                       </label>
                     </div>
                     <Select
                       value={currentCurrency}
                       onValueChange={handleCurrencyChange}
                     >
                       <SelectTrigger className="rounded-xl border border-kresna-border bg-white text-charcoal">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent className="rounded-xl border border-kresna-border bg-white">
                         {CURRENCY_OPTIONS.map((opt) => (
                           <SelectItem
                             key={opt.value}
                             value={opt.value}
                             className="text-kresna-gray-dark"
                           >
                             {t(opt.labelKey)}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                     <p className="text-xs text-kresna-gray">
                       {t('admin.settings.defaultCurrencyHint')}
                     </p>
                   </div>
                 </SectionCard>
               </div>
             )}

             {/* Database Tab */}
             {activeTab === 'database' && (
               <div className="space-y-6">
                 <SectionCard
                   title={t('admin.settings.databaseConfig')}
                   description={t('admin.settings.databaseConfigDesc')}
                   icon={Database}
                   iconColor="text-red-600"
                   iconBg="bg-red-50"
                   badge={
                     <Badge className="border border-red-300 bg-red-50 text-red-700 text-xs">
                       <AlertTriangle className="mr-1 h-3 w-3" />
                       {t('admin.settings.critical')}
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
                   title={t('admin.settings.redisConfig')}
                   description={t('admin.settings.redisConfigDesc')}
                   icon={Zap}
                   iconColor="text-orange-600"
                   iconBg="bg-orange-50"
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
                   title={t('admin.settings.authConfig')}
                   description={t('admin.settings.authConfigDesc')}
                   icon={Shield}
                   iconColor="text-primary-600"
                   iconBg="bg-primary-50"
                   badge={
                     <Badge className="border border-primary-300 bg-primary-50 text-primary-700 text-xs">
                       <ShieldAlert className="mr-1 h-3 w-3" />
                       {t('admin.settings.sessionCritical')}
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
                   title={t('admin.settings.adminCredsConfig')}
                   description={t('admin.settings.adminCredsConfigDesc')}
                   icon={User}
                   iconColor="text-purple-600"
                   iconBg="bg-purple-50"
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
                   title={t('admin.settings.frontendConfig')}
                   description={t('admin.settings.frontendConfigDesc')}
                   icon={Monitor}
                   iconColor="text-teal-600"
                   iconBg="bg-teal-50"
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
           </div>
        </>
      )}

      {/* Restart Confirmation Dialog */}
      <Dialog open={restartDialog} onOpenChange={setRestartDialog}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-charcoal">
              <RefreshCw className="h-5 w-5 text-red-600" />
              {t('admin.settings.restartServer')}
            </DialogTitle>
            <DialogDescription className="text-kresna-gray">
              {t('admin.settings.restartConfirmation')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRestartDialog(false)}
              disabled={isRestarting}
            >
              {t('common.cancel')}
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
                  {t('admin.settings.restarting')}
                </>
              ) : (
                t('admin.settings.restartServer')
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
  iconColor: string;
  iconBg: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

function SectionCard({
  title,
  description,
  icon: Icon,
  iconColor,
  iconBg,
  badge,
  children,
}: SectionCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-kresna-border bg-white shadow-sm">
      <div className="p-6">
        {/* Card header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl shadow-sm',
                iconBg
              )}
            >
              <Icon className={cn('h-5 w-5', iconColor)} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-charcoal">{title}</h2>
              <p className="text-sm text-kresna-gray">{description}</p>
            </div>
          </div>
          {badge}
        </div>

        {/* Card content */}
        {children}
      </div>
    </div>
  );
}
