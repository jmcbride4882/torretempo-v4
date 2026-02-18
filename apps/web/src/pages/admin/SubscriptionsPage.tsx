/**
 * SubscriptionsPage - Admin Subscriptions Overview
 * MRR/ARR metrics cards, tier breakdown, recent changes
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  CreditCard,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Plus,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  fetchSubscriptionMetrics,
  createInvoice,
  processRefund,
  applyCredit,
} from '@/lib/api/admin';
import type { SubscriptionMetrics } from '@/lib/api/admin';
import { AdminApiError } from '@/lib/api/admin';

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Tier colors
const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  free: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  starter: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  pro: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  enterprise: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
};

export default function SubscriptionsPage() {
  const { t } = useTranslation();

  // State
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch metrics
  const loadMetrics = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(silent);

    try {
      const data = await fetchSubscriptionMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching subscription metrics:', error);
      toast.error(t('admin.subscriptions.failedToLoad'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
    // Auto-refresh every 10 seconds for live data
    const interval = setInterval(() => loadMetrics(true), 10000);
    return () => clearInterval(interval);
  }, [loadMetrics]);

  // Handlers
  const handleRefresh = () => loadMetrics(true);

  if (isLoading) {
    return <SubscriptionsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 shadow-sm">
            <CreditCard className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{t('admin.subscriptions.title')}</h1>
            <p className="text-sm text-slate-500">
              {t('admin.subscriptions.subtitle')}
            </p>
          </div>
        </div>

        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">{t('admin.refresh')}</span>
          </Button>
        </div>
      </div>

      {/* Revenue metrics */}
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* MRR */}
        <MetricCard
          icon={DollarSign}
          label={t('admin.subscriptions.mrr')}
          value={formatCurrency(metrics?.mrr || 0)}
          trend={12.5}
          trendLabel={t('admin.subscriptions.vsLastMonth')}
          color="emerald"
        />

        {/* ARR */}
        <MetricCard
          icon={TrendingUp}
          label={t('admin.subscriptions.arr')}
          value={formatCurrency(metrics?.arr || 0)}
          trend={8.3}
          trendLabel={t('admin.subscriptions.vsLastYear')}
          color="blue"
        />

        {/* Paid Customers */}
        <MetricCard
          icon={Users}
          label={t('admin.subscriptions.paidCustomers')}
          value={metrics?.totalPaid?.toString() || '0'}
          subtitle={`${metrics?.totalActive || 0} ${t('admin.subscriptions.totalActive')}`}
          color="violet"
        />

        {/* Churn Rate */}
        <MetricCard
          icon={Percent}
          label={t('admin.subscriptions.churnRate')}
          value={`${(metrics?.churnRate || 0).toFixed(1)}%`}
          trend={-2.1}
          trendLabel={t('admin.subscriptions.vsLastMonth')}
          color="red"
          inverted
        />
      </div>

      {/* Tier breakdown */}
      <div
        className="rounded-xl border border-slate-200 bg-white shadow-sm p-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{t('admin.subscriptions.subscriptionTiers')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(metrics?.tierBreakdown || {}).map(([tier, count]) => {
            const colors = tierColors[tier] ?? tierColors.free;
            const total = Object.values(metrics?.tierBreakdown || {}).reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';

            return (
              <div
                key={tier}
                className={cn(
                  'relative overflow-hidden rounded-xl border p-4',
                  colors?.border ?? 'border-slate-300',
                  colors?.bg ?? 'bg-slate-100'
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className={cn('text-sm font-medium capitalize', colors?.text ?? 'text-slate-700')}>{tier}</span>
                  <Badge className={cn('border', colors?.bg ?? 'bg-slate-100', colors?.text ?? 'text-slate-700', colors?.border ?? 'border-slate-300')}>
                    {percentage}%
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-slate-900">{count}</p>
                <p className="mt-1 text-sm text-slate-500">{t('admin.subscriptions.organizations')}</p>

                {/* Progress bar */}
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    style={{ width: `${percentage}%` }}
                    className={cn('h-full rounded-full', (colors?.bg ?? 'bg-slate-100').replace('50', '400').replace('100', '400'))}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary stats */}
      <div
        className="grid gap-4 sm:grid-cols-3"
      >
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
          <div className="mb-2 flex items-center gap-2 text-slate-500">
            <Building2 className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">{t('admin.subscriptions.totalOrganizations')}</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{metrics?.totalActive || 0}</p>
          <p className="mt-1 text-sm text-slate-500">
            {t('admin.subscriptions.freeAndPaidSummary', { free: metrics?.totalFree || 0, paid: metrics?.totalPaid || 0 })}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
          <div className="mb-2 flex items-center gap-2 text-slate-500">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">{t('admin.subscriptions.avgRevenuePerOrg')}</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {formatCurrency(metrics?.totalPaid ? (metrics.mrr / metrics.totalPaid) : 0)}
          </p>
          <p className="mt-1 text-sm text-slate-500">{t('admin.subscriptions.perMonth')}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
          <div className="mb-2 flex items-center gap-2 text-slate-500">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">{t('admin.subscriptions.conversionRate')}</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {metrics?.totalActive
              ? (((metrics.totalPaid || 0) / metrics.totalActive) * 100).toFixed(1)
              : '0'}%
          </p>
          <p className="mt-1 text-sm text-slate-500">{t('admin.subscriptions.freeToPaid')}</p>
        </div>
      </div>

      {/* Recent changes */}
      <div
        className="rounded-xl border border-slate-200 bg-white shadow-sm p-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{t('admin.subscriptions.recentChanges')}</h2>
        {metrics?.recentChanges && metrics.recentChanges.length > 0 ? (
          <div className="space-y-3">
            {metrics.recentChanges.map((change) => {
              const isUpgrade =
                ['free', 'starter', 'pro'].indexOf(change.fromTier) <
                ['free', 'starter', 'pro', 'enterprise'].indexOf(change.toTier);

              return (
                <div
                  key={change.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg',
                        isUpgrade ? 'bg-emerald-50' : 'bg-red-50'
                      )}
                    >
                      {isUpgrade ? (
                        <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{change.organizationName}</p>
                      <p className="text-sm text-slate-500">
                        {change.fromTier} &rarr; {change.toTier}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-slate-500">
                    {new Date(change.changedAt).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
            <CreditCard className="mb-3 h-8 w-8 text-slate-400" />
            <p className="text-sm text-slate-500">{t('admin.subscriptions.noRecentChanges')}</p>
          </div>
        )}
      </div>

      {/* Billing Operations */}
      <BillingOperations onSuccess={() => loadMetrics(true)} />
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  icon: typeof DollarSign;
  label: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  subtitle?: string;
  color: 'emerald' | 'blue' | 'violet' | 'red';
  inverted?: boolean;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  subtitle,
  color,
  inverted,
}: MetricCardProps) {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    red: 'bg-red-50 text-red-600',
  };

  const isPositive = inverted ? (trend || 0) < 0 : (trend || 0) > 0;

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white shadow-sm p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            colorClasses[color]
          )}
        >
          <Icon className={cn('h-5 w-5', colorClasses[color].split(' ').pop())} />
        </div>
        {trend !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
              isPositive
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-red-50 text-red-600'
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
      {(trendLabel || subtitle) && (
        <p className="mt-2 text-xs text-slate-500">{trendLabel || subtitle}</p>
      )}
    </div>
  );
}

// ============================================================================
// BILLING OPERATIONS
// ============================================================================

// Format cents to currency display
function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

// Validation helpers
function validateCustomerId(value: string, t: (key: string) => string): string | null {
  if (!value.trim()) return t('admin.subscriptions.validation.customerIdRequired');
  if (!value.startsWith('cus_')) return t('admin.subscriptions.validation.customerIdPrefix');
  return null;
}

function validatePaymentIntentId(value: string, t: (key: string) => string): string | null {
  if (!value.trim()) return t('admin.subscriptions.validation.paymentIntentIdRequired');
  if (!value.startsWith('pi_')) return t('admin.subscriptions.validation.paymentIntentIdPrefix');
  return null;
}

function validateAmount(value: string, t: (key: string) => string, required = true): string | null {
  if (!value.trim()) return required ? t('admin.subscriptions.validation.amountRequired') : null;
  const num = Number(value);
  if (isNaN(num) || num <= 0) return t('admin.subscriptions.validation.mustBePositive');
  if (!Number.isInteger(num)) return t('admin.subscriptions.validation.wholeCents');
  return null;
}

function validateDescription(value: string, t: (key: string) => string): string | null {
  if (!value.trim()) return t('admin.subscriptions.validation.descriptionRequired');
  if (value.trim().length < 10) return t('admin.subscriptions.validation.minTenChars');
  return null;
}

interface BillingOperationsProps {
  onSuccess: () => void;
}

function BillingOperations({ onSuccess }: BillingOperationsProps) {
  const { t } = useTranslation();
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);

  return (
    <>
      <div
        className="rounded-xl border border-slate-200 bg-white shadow-sm p-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{t('admin.subscriptions.billingOperations')}</h2>
        <p className="mb-5 text-sm text-slate-500">
          {t('admin.subscriptions.billingDescription')}
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Create Invoice */}
          <button
            onClick={() => setInvoiceOpen(true)}
            className="group relative flex flex-col items-center gap-3 overflow-hidden rounded-xl border border-blue-200 bg-blue-50 p-6 text-center transition-all duration-200 hover:border-blue-300 hover:bg-blue-100"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 shadow-sm transition-transform duration-200 group-hover:scale-110">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{t('admin.subscriptions.createInvoice')}</p>
              <p className="mt-1 text-xs text-slate-500">{t('admin.subscriptions.generateManualInvoice')}</p>
            </div>
          </button>

          {/* Process Refund */}
          <button
            onClick={() => setRefundOpen(true)}
            className="group relative flex flex-col items-center gap-3 overflow-hidden rounded-xl border border-violet-200 bg-violet-50 p-6 text-center transition-all duration-200 hover:border-violet-300 hover:bg-violet-100"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 shadow-sm transition-transform duration-200 group-hover:scale-110">
              <RefreshCw className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{t('admin.subscriptions.processRefund')}</p>
              <p className="mt-1 text-xs text-slate-500">{t('admin.subscriptions.refundPayment')}</p>
            </div>
          </button>

          {/* Apply Credit */}
          <button
            onClick={() => setCreditOpen(true)}
            className="group relative flex flex-col items-center gap-3 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-100"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 shadow-sm transition-transform duration-200 group-hover:scale-110">
              <Plus className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{t('admin.subscriptions.applyCredit')}</p>
              <p className="mt-1 text-xs text-slate-500">{t('admin.subscriptions.addAccountCredit')}</p>
            </div>
          </button>
        </div>
      </div>

      {/* Modals */}
      <CreateInvoiceModal
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
        onSuccess={onSuccess}
      />
      <ProcessRefundModal
        open={refundOpen}
        onOpenChange={setRefundOpen}
        onSuccess={onSuccess}
      />
      <ApplyCreditModal
        open={creditOpen}
        onOpenChange={setCreditOpen}
        onSuccess={onSuccess}
      />
    </>
  );
}

// ============================================================================
// CREATE INVOICE MODAL
// ============================================================================

interface BillingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function CreateInvoiceModal({ open, onOpenChange, onSuccess }: BillingModalProps) {
  const { t } = useTranslation();
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  const resetForm = () => {
    setCustomerId('');
    setAmount('');
    setDescription('');
    setError(null);
    setFieldErrors({});
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const validate = (): boolean => {
    const errors: Record<string, string | null> = {
      customerId: validateCustomerId(customerId, t),
      amount: validateAmount(amount, t),
      description: validateDescription(description, t),
    };
    setFieldErrors(errors);
    return !Object.values(errors).some(Boolean);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createInvoice({
        customer_id: customerId.trim(),
        amount: Number(amount),
        description: description.trim(),
      });
      toast.success(t('admin.subscriptions.invoiceCreated'), {
        description: `${result.message} — ${formatCents(Number(amount))}`,
      });
      handleOpenChange(false);
      onSuccess();
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err.message);
      } else {
        setError(t('admin.subscriptions.unexpectedError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
            {t('admin.subscriptions.createInvoice')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.subscriptions.generateManualInvoice')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer ID */}
          <div className="space-y-2">
            <Label htmlFor="invoice-customer-id">{t('admin.subscriptions.customerId')}</Label>
            <Input
              id="invoice-customer-id"
              placeholder={t('admin.subscriptions.customerIdPlaceholder')}
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setFieldErrors((prev) => ({ ...prev, customerId: null }));
              }}
              className={cn(fieldErrors.customerId && 'border-red-500/50 focus-visible:ring-red-500')}
            />
            {fieldErrors.customerId && (
              <FieldError message={fieldErrors.customerId} />
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="invoice-amount">{t('admin.subscriptions.amountCents')}</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">&euro;</span>
              <Input
                id="invoice-amount"
                type="number"
                placeholder={t('admin.subscriptions.amountPlaceholder')}
                min="1"
                step="1"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, amount: null }));
                }}
                className={cn('pl-7', fieldErrors.amount && 'border-red-500/50 focus-visible:ring-red-500')}
              />
            </div>
            {amount && !fieldErrors.amount && (
              <p className="text-xs text-slate-500">
                = {formatCents(Number(amount) || 0)}
              </p>
            )}
            {fieldErrors.amount && (
              <FieldError message={fieldErrors.amount} />
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="invoice-description">{t('admin.subscriptions.description')}</Label>
            <textarea
              id="invoice-description"
              placeholder={t('admin.subscriptions.invoiceDescriptionPlaceholder')}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setFieldErrors((prev) => ({ ...prev, description: null }));
              }}
              rows={3}
              className={cn(
                'flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-none',
                fieldErrors.description && 'border-red-500/50 focus-visible:ring-red-500'
              )}
            />
            {fieldErrors.description && (
              <FieldError message={fieldErrors.description} />
            )}
          </div>

          {/* API Error */}
          {error && <ApiError message={error} />}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className="text-slate-500 hover:text-slate-900"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('admin.subscriptions.createInvoice')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// PROCESS REFUND MODAL
// ============================================================================

function ProcessRefundModal({ open, onOpenChange, onSuccess }: BillingModalProps) {
  const { t } = useTranslation();
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState<'duplicate' | 'fraudulent' | 'requested_by_customer' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  const resetForm = () => {
    setPaymentIntentId('');
    setAmount('');
    setReason('');
    setError(null);
    setFieldErrors({});
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const validate = (): boolean => {
    const errors: Record<string, string | null> = {
      paymentIntentId: validatePaymentIntentId(paymentIntentId, t),
      amount: validateAmount(amount, t, false),
      reason: !reason ? t('admin.subscriptions.validation.reasonRequired') : null,
    };
    setFieldErrors(errors);
    return !Object.values(errors).some(Boolean);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!reason) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await processRefund({
        payment_intent_id: paymentIntentId.trim(),
        ...(amount.trim() ? { amount: Number(amount) } : {}),
        reason,
      });
      toast.success(t('admin.subscriptions.refundProcessed'), {
        description: `${result.message}${amount.trim() ? ` — ${formatCents(Number(amount))}` : ` — ${t('admin.subscriptions.fullRefund')}`}`,
      });
      handleOpenChange(false);
      onSuccess();
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err.message);
      } else {
        setError(t('admin.subscriptions.unexpectedError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
              <RefreshCw className="h-4 w-4 text-violet-600" />
            </div>
            {t('admin.subscriptions.processRefund')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.subscriptions.refundPayment')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Intent ID */}
          <div className="space-y-2">
            <Label htmlFor="refund-payment-intent-id">{t('admin.subscriptions.paymentIntentId')}</Label>
            <Input
              id="refund-payment-intent-id"
              placeholder={t('admin.subscriptions.paymentIntentIdPlaceholder')}
              value={paymentIntentId}
              onChange={(e) => {
                setPaymentIntentId(e.target.value);
                setFieldErrors((prev) => ({ ...prev, paymentIntentId: null }));
              }}
              className={cn(fieldErrors.paymentIntentId && 'border-red-500/50 focus-visible:ring-red-500')}
            />
            {fieldErrors.paymentIntentId && (
              <FieldError message={fieldErrors.paymentIntentId} />
            )}
          </div>

          {/* Amount (optional) */}
          <div className="space-y-2">
            <Label htmlFor="refund-amount">
              {t('admin.subscriptions.amountCents')}
              <span className="ml-1 text-xs font-normal text-slate-500">— {t('admin.subscriptions.fullRefund')}</span>
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">&euro;</span>
              <Input
                id="refund-amount"
                type="number"
                placeholder={t('admin.subscriptions.fullRefund')}
                min="1"
                step="1"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, amount: null }));
                }}
                className={cn('pl-7', fieldErrors.amount && 'border-red-500/50 focus-visible:ring-red-500')}
              />
            </div>
            {amount && !fieldErrors.amount && (
              <p className="text-xs text-slate-500">
                = {formatCents(Number(amount) || 0)}
              </p>
            )}
            {fieldErrors.amount && (
              <FieldError message={fieldErrors.amount} />
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>{t('admin.subscriptions.reason')}</Label>
            <Select
              value={reason}
              onValueChange={(val) => {
                setReason(val as typeof reason);
                setFieldErrors((prev) => ({ ...prev, reason: null }));
              }}
            >
              <SelectTrigger className={cn(fieldErrors.reason && 'border-red-500/50')}>
                <SelectValue placeholder={t('admin.subscriptions.selectReasonPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="duplicate">{t('admin.subscriptions.duplicate')}</SelectItem>
                <SelectItem value="fraudulent">{t('admin.subscriptions.fraudulent')}</SelectItem>
                <SelectItem value="requested_by_customer">{t('admin.subscriptions.requestedByCustomer')}</SelectItem>
              </SelectContent>
            </Select>
            {fieldErrors.reason && (
              <FieldError message={fieldErrors.reason} />
            )}
          </div>

          {/* API Error */}
          {error && <ApiError message={error} />}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className="text-slate-500 hover:text-slate-900"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2 bg-violet-600 hover:bg-violet-700"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('admin.subscriptions.processRefund')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// APPLY CREDIT MODAL
// ============================================================================

function ApplyCreditModal({ open, onOpenChange, onSuccess }: BillingModalProps) {
  const { t } = useTranslation();
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  const resetForm = () => {
    setCustomerId('');
    setAmount('');
    setDescription('');
    setError(null);
    setFieldErrors({});
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const validate = (): boolean => {
    const errors: Record<string, string | null> = {
      customerId: validateCustomerId(customerId, t),
      amount: validateAmount(amount, t),
      description: validateDescription(description, t),
    };
    setFieldErrors(errors);
    return !Object.values(errors).some(Boolean);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await applyCredit({
        customer_id: customerId.trim(),
        amount: Number(amount),
        description: description.trim(),
      });
      toast.success(t('admin.subscriptions.creditApplied'), {
        description: `${result.message} — ${formatCents(Number(amount))}`,
      });
      handleOpenChange(false);
      onSuccess();
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err.message);
      } else {
        setError(t('admin.subscriptions.unexpectedError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <Plus className="h-4 w-4 text-emerald-600" />
            </div>
            {t('admin.subscriptions.applyCredit')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.subscriptions.addAccountCredit')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer ID */}
          <div className="space-y-2">
            <Label htmlFor="credit-customer-id">{t('admin.subscriptions.customerId')}</Label>
            <Input
              id="credit-customer-id"
              placeholder={t('admin.subscriptions.customerIdPlaceholder')}
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setFieldErrors((prev) => ({ ...prev, customerId: null }));
              }}
              className={cn(fieldErrors.customerId && 'border-red-500/50 focus-visible:ring-red-500')}
            />
            {fieldErrors.customerId && (
              <FieldError message={fieldErrors.customerId} />
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="credit-amount">{t('admin.subscriptions.amountCents')}</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">&euro;</span>
              <Input
                id="credit-amount"
                type="number"
                placeholder={t('admin.subscriptions.amountPlaceholder')}
                min="1"
                step="1"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, amount: null }));
                }}
                className={cn('pl-7', fieldErrors.amount && 'border-red-500/50 focus-visible:ring-red-500')}
              />
            </div>
            {amount && !fieldErrors.amount && (
              <p className="text-xs text-slate-500">
                = {formatCents(Number(amount) || 0)}
              </p>
            )}
            {fieldErrors.amount && (
              <FieldError message={fieldErrors.amount} />
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="credit-description">{t('admin.subscriptions.description')}</Label>
            <textarea
              id="credit-description"
              placeholder={t('admin.subscriptions.creditDescriptionPlaceholder')}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setFieldErrors((prev) => ({ ...prev, description: null }));
              }}
              rows={3}
              className={cn(
                'flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-none',
                fieldErrors.description && 'border-red-500/50 focus-visible:ring-red-500'
              )}
            />
            {fieldErrors.description && (
              <FieldError message={fieldErrors.description} />
            )}
          </div>

          {/* API Error */}
          {error && <ApiError message={error} />}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className="text-slate-500 hover:text-slate-900"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('admin.subscriptions.applyCredit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// SHARED ERROR COMPONENTS
// ============================================================================

function FieldError({ message }: { message: string }) {
  return (
    <p
      className="flex items-center gap-1 text-xs text-red-600"
    >
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

function ApiError({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
      <p className="text-sm text-red-700">{message}</p>
    </div>
  );
}

// Skeleton
function SubscriptionsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
          <div className="space-y-1.5">
            <div className="h-6 w-32 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-100" />
      </div>

      {/* Metrics skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-slate-100" />
              <div className="h-6 w-16 rounded-full bg-slate-100" />
            </div>
            <div className="h-8 w-24 rounded bg-slate-100" />
            <div className="mt-2 h-4 w-32 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Tier breakdown skeleton */}
      <div className="animate-pulse rounded-xl border border-slate-200 bg-slate-50 p-6">
        <div className="mb-4 h-6 w-40 rounded bg-slate-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 h-4 w-16 rounded bg-slate-100" />
              <div className="h-8 w-12 rounded bg-slate-100" />
              <div className="mt-3 h-1.5 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
