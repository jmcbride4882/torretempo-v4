/**
 * SubscriptionsPage - Admin Subscriptions Overview
 * MRR/ARR metrics cards, tier breakdown, recent changes
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  free: { bg: 'bg-neutral-500/20', text: 'text-neutral-300', border: 'border-neutral-500/30' },
  starter: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
  pro: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  enterprise: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' },
};

export default function SubscriptionsPage() {
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
      toast.error('Failed to load subscription metrics');
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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600/20 to-teal-600/20 shadow-lg shadow-emerald-500/10">
            <CreditCard className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Subscriptions</h1>
            <p className="text-sm text-neutral-400">
              Live monitoring • Updates every 10 seconds
            </p>
          </div>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5 rounded-lg border border-white/5 bg-white/5 text-neutral-300 hover:bg-white/10"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </motion.div>
      </motion.div>

      {/* Revenue metrics */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* MRR */}
        <MetricCard
          icon={DollarSign}
          label="Monthly Recurring Revenue"
          value={formatCurrency(metrics?.mrr || 0)}
          trend={12.5}
          trendLabel="vs last month"
          color="emerald"
          delay={0}
        />

        {/* ARR */}
        <MetricCard
          icon={TrendingUp}
          label="Annual Recurring Revenue"
          value={formatCurrency(metrics?.arr || 0)}
          trend={8.3}
          trendLabel="vs last year"
          color="blue"
          delay={0.05}
        />

        {/* Paid Customers */}
        <MetricCard
          icon={Users}
          label="Paid Customers"
          value={metrics?.totalPaid?.toString() || '0'}
          subtitle={`${metrics?.totalActive || 0} total active`}
          color="amber"
          delay={0.1}
        />

        {/* Churn Rate */}
        <MetricCard
          icon={Percent}
          label="Churn Rate"
          value={`${(metrics?.churnRate || 0).toFixed(1)}%`}
          trend={-2.1}
          trendLabel="vs last month"
          color="red"
          inverted
          delay={0.15}
        />
      </motion.div>

      {/* Tier breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-white">Subscription Tiers</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(metrics?.tierBreakdown || {}).map(([tier, count], index) => {
            const colors = tierColors[tier] ?? tierColors.free;
            const total = Object.values(metrics?.tierBreakdown || {}).reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';

            return (
              <motion.div
                key={tier}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 + index * 0.05 }}
                className={cn(
                  'relative overflow-hidden rounded-xl border p-4',
                  colors?.border ?? 'border-neutral-500/30',
                  colors?.bg ?? 'bg-neutral-500/20'
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className={cn('text-sm font-medium capitalize', colors?.text ?? 'text-neutral-300')}>{tier}</span>
                  <Badge className={cn('border', colors?.bg ?? 'bg-neutral-500/20', colors?.text ?? 'text-neutral-300', colors?.border ?? 'border-neutral-500/30')}>
                    {percentage}%
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-white">{count}</p>
                <p className="mt-1 text-sm text-neutral-400">organizations</p>

                {/* Progress bar */}
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                    className={cn('h-full rounded-full', (colors?.bg ?? 'bg-neutral-500/20').replace('/20', '/60'))}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Summary stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid gap-4 sm:grid-cols-3"
      >
        <div className="glass-card p-5">
          <div className="mb-2 flex items-center gap-2 text-neutral-500">
            <Building2 className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Organizations</span>
          </div>
          <p className="text-3xl font-bold text-white">{metrics?.totalActive || 0}</p>
          <p className="mt-1 text-sm text-neutral-400">
            {metrics?.totalFree || 0} free, {metrics?.totalPaid || 0} paid
          </p>
        </div>

        <div className="glass-card p-5">
          <div className="mb-2 flex items-center gap-2 text-neutral-500">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Avg. Revenue/Org</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(metrics?.totalPaid ? (metrics.mrr / metrics.totalPaid) : 0)}
          </p>
          <p className="mt-1 text-sm text-neutral-400">per month</p>
        </div>

        <div className="glass-card p-5">
          <div className="mb-2 flex items-center gap-2 text-neutral-500">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Conversion Rate</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {metrics?.totalActive
              ? (((metrics.totalPaid || 0) / metrics.totalActive) * 100).toFixed(1)
              : '0'}%
          </p>
          <p className="mt-1 text-sm text-neutral-400">free to paid</p>
        </div>
      </motion.div>

      {/* Recent changes */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card p-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-white">Recent Subscription Changes</h2>
        {metrics?.recentChanges && metrics.recentChanges.length > 0 ? (
          <div className="space-y-3">
            {metrics.recentChanges.map((change, index) => {
              const isUpgrade =
                ['free', 'starter', 'pro'].indexOf(change.fromTier) <
                ['free', 'starter', 'pro', 'enterprise'].indexOf(change.toTier);

              return (
                <motion.div
                  key={change.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg',
                        isUpgrade ? 'bg-emerald-500/20' : 'bg-red-500/20'
                      )}
                    >
                      {isUpgrade ? (
                        <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">{change.organizationName}</p>
                      <p className="text-sm text-neutral-400">
                        {change.fromTier} → {change.toTier}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-neutral-500">
                    {new Date(change.changedAt).toLocaleDateString()}
                  </span>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
            <CreditCard className="mb-3 h-8 w-8 text-neutral-600" />
            <p className="text-sm text-neutral-400">No recent subscription changes</p>
          </div>
        )}
      </motion.div>

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
  color: 'emerald' | 'blue' | 'amber' | 'red';
  inverted?: boolean;
  delay: number;
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
  delay,
}: MetricCardProps) {
  const colorClasses = {
    emerald: 'from-emerald-600/20 to-teal-600/20 shadow-emerald-500/10 text-emerald-400',
    blue: 'from-blue-600/20 to-indigo-600/20 shadow-blue-500/10 text-blue-400',
    amber: 'from-amber-600/20 to-orange-600/20 shadow-amber-500/10 text-amber-400',
    red: 'from-red-600/20 to-rose-600/20 shadow-red-500/10 text-red-400',
  };

  const isPositive = inverted ? (trend || 0) < 0 : (trend || 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg',
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
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-red-500/20 text-red-400'
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
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm text-neutral-400">{label}</p>
      {(trendLabel || subtitle) && (
        <p className="mt-2 text-xs text-neutral-500">{trendLabel || subtitle}</p>
      )}
    </motion.div>
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
function validateCustomerId(value: string): string | null {
  if (!value.trim()) return 'Customer ID is required';
  if (!value.startsWith('cus_')) return 'Must start with "cus_"';
  return null;
}

function validatePaymentIntentId(value: string): string | null {
  if (!value.trim()) return 'Payment Intent ID is required';
  if (!value.startsWith('pi_')) return 'Must start with "pi_"';
  return null;
}

function validateAmount(value: string, required = true): string | null {
  if (!value.trim()) return required ? 'Amount is required' : null;
  const num = Number(value);
  if (isNaN(num) || num <= 0) return 'Must be a positive number';
  if (!Number.isInteger(num)) return 'Amount must be in whole cents';
  return null;
}

function validateDescription(value: string): string | null {
  if (!value.trim()) return 'Description is required';
  if (value.trim().length < 10) return 'Must be at least 10 characters';
  return null;
}

interface BillingOperationsProps {
  onSuccess: () => void;
}

function BillingOperations({ onSuccess }: BillingOperationsProps) {
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-white">Billing Operations</h2>
        <p className="mb-5 text-sm text-neutral-400">
          Manual billing actions for customer invoicing, refunds, and account credits via Stripe.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Create Invoice */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setInvoiceOpen(true)}
            className="group relative flex flex-col items-center gap-3 overflow-hidden rounded-xl border border-blue-500/20 bg-blue-500/5 p-6 text-center transition-all duration-200 hover:border-blue-500/40 hover:bg-blue-500/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/30 to-indigo-600/30 shadow-lg shadow-blue-500/10 transition-transform duration-200 group-hover:scale-110">
              <DollarSign className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Create Invoice</p>
              <p className="mt-1 text-xs text-neutral-500">Generate a manual invoice</p>
            </div>
          </motion.button>

          {/* Process Refund */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setRefundOpen(true)}
            className="group relative flex flex-col items-center gap-3 overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center transition-all duration-200 hover:border-amber-500/40 hover:bg-amber-500/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600/30 to-orange-600/30 shadow-lg shadow-amber-500/10 transition-transform duration-200 group-hover:scale-110">
              <RefreshCw className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Process Refund</p>
              <p className="mt-1 text-xs text-neutral-500">Refund a payment</p>
            </div>
          </motion.button>

          {/* Apply Credit */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCreditOpen(true)}
            className="group relative flex flex-col items-center gap-3 overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center transition-all duration-200 hover:border-emerald-500/40 hover:bg-emerald-500/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600/30 to-teal-600/30 shadow-lg shadow-emerald-500/10 transition-transform duration-200 group-hover:scale-110">
              <Plus className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Apply Credit</p>
              <p className="mt-1 text-xs text-neutral-500">Add account credit</p>
            </div>
          </motion.button>
        </div>
      </motion.div>

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
      customerId: validateCustomerId(customerId),
      amount: validateAmount(amount),
      description: validateDescription(description),
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
      toast.success('Invoice created', {
        description: `${result.message} — ${formatCents(Number(amount))}`,
      });
      handleOpenChange(false);
      onSuccess();
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
              <DollarSign className="h-4 w-4 text-blue-400" />
            </div>
            Create Invoice
          </DialogTitle>
          <DialogDescription>
            Generate a manual Stripe invoice for a customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer ID */}
          <div className="space-y-2">
            <Label htmlFor="invoice-customer-id">Customer ID</Label>
            <Input
              id="invoice-customer-id"
              placeholder="cus_xxxxxxxxxx"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setFieldErrors((prev) => ({ ...prev, customerId: null }));
              }}
              className={cn(fieldErrors.customerId && 'border-red-500/50 focus-visible:ring-red-500')}
            />
            <AnimatePresence>
              {fieldErrors.customerId && (
                <FieldError message={fieldErrors.customerId} />
              )}
            </AnimatePresence>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="invoice-amount">Amount (cents)</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">€</span>
              <Input
                id="invoice-amount"
                type="number"
                placeholder="5000"
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
              <p className="text-xs text-neutral-500">
                = {formatCents(Number(amount) || 0)}
              </p>
            )}
            <AnimatePresence>
              {fieldErrors.amount && (
                <FieldError message={fieldErrors.amount} />
              )}
            </AnimatePresence>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="invoice-description">Description</Label>
            <textarea
              id="invoice-description"
              placeholder="e.g., Monthly consulting fee for February 2026"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setFieldErrors((prev) => ({ ...prev, description: null }));
              }}
              rows={3}
              className={cn(
                'flex w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-none',
                fieldErrors.description && 'border-red-500/50 focus-visible:ring-red-500'
              )}
            />
            <AnimatePresence>
              {fieldErrors.description && (
                <FieldError message={fieldErrors.description} />
              )}
            </AnimatePresence>
          </div>

          {/* API Error */}
          <AnimatePresence>
            {error && <ApiError message={error} />}
          </AnimatePresence>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className="text-neutral-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Invoice
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
      paymentIntentId: validatePaymentIntentId(paymentIntentId),
      amount: validateAmount(amount, false),
      reason: !reason ? 'Reason is required' : null,
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
      toast.success('Refund processed', {
        description: `${result.message}${amount.trim() ? ` — ${formatCents(Number(amount))}` : ' — Full refund'}`,
      });
      handleOpenChange(false);
      onSuccess();
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
              <RefreshCw className="h-4 w-4 text-amber-400" />
            </div>
            Process Refund
          </DialogTitle>
          <DialogDescription>
            Issue a full or partial refund for a Stripe payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Intent ID */}
          <div className="space-y-2">
            <Label htmlFor="refund-payment-intent-id">Payment Intent ID</Label>
            <Input
              id="refund-payment-intent-id"
              placeholder="pi_xxxxxxxxxx"
              value={paymentIntentId}
              onChange={(e) => {
                setPaymentIntentId(e.target.value);
                setFieldErrors((prev) => ({ ...prev, paymentIntentId: null }));
              }}
              className={cn(fieldErrors.paymentIntentId && 'border-red-500/50 focus-visible:ring-red-500')}
            />
            <AnimatePresence>
              {fieldErrors.paymentIntentId && (
                <FieldError message={fieldErrors.paymentIntentId} />
              )}
            </AnimatePresence>
          </div>

          {/* Amount (optional) */}
          <div className="space-y-2">
            <Label htmlFor="refund-amount">
              Amount (cents)
              <span className="ml-1 text-xs font-normal text-neutral-500">— optional, leave empty for full refund</span>
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">€</span>
              <Input
                id="refund-amount"
                type="number"
                placeholder="Full refund"
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
              <p className="text-xs text-neutral-500">
                = {formatCents(Number(amount) || 0)}
              </p>
            )}
            <AnimatePresence>
              {fieldErrors.amount && (
                <FieldError message={fieldErrors.amount} />
              )}
            </AnimatePresence>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select
              value={reason}
              onValueChange={(val) => {
                setReason(val as typeof reason);
                setFieldErrors((prev) => ({ ...prev, reason: null }));
              }}
            >
              <SelectTrigger className={cn(fieldErrors.reason && 'border-red-500/50')}>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="duplicate">Duplicate charge</SelectItem>
                <SelectItem value="fraudulent">Fraudulent</SelectItem>
                <SelectItem value="requested_by_customer">Requested by customer</SelectItem>
              </SelectContent>
            </Select>
            <AnimatePresence>
              {fieldErrors.reason && (
                <FieldError message={fieldErrors.reason} />
              )}
            </AnimatePresence>
          </div>

          {/* API Error */}
          <AnimatePresence>
            {error && <ApiError message={error} />}
          </AnimatePresence>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className="text-neutral-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2 bg-amber-600 hover:bg-amber-700"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Process Refund
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
      customerId: validateCustomerId(customerId),
      amount: validateAmount(amount),
      description: validateDescription(description),
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
      toast.success('Credit applied', {
        description: `${result.message} — ${formatCents(Number(amount))}`,
      });
      handleOpenChange(false);
      onSuccess();
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
              <Plus className="h-4 w-4 text-emerald-400" />
            </div>
            Apply Credit
          </DialogTitle>
          <DialogDescription>
            Add account credit to a Stripe customer balance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer ID */}
          <div className="space-y-2">
            <Label htmlFor="credit-customer-id">Customer ID</Label>
            <Input
              id="credit-customer-id"
              placeholder="cus_xxxxxxxxxx"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setFieldErrors((prev) => ({ ...prev, customerId: null }));
              }}
              className={cn(fieldErrors.customerId && 'border-red-500/50 focus-visible:ring-red-500')}
            />
            <AnimatePresence>
              {fieldErrors.customerId && (
                <FieldError message={fieldErrors.customerId} />
              )}
            </AnimatePresence>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="credit-amount">Amount (cents)</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">€</span>
              <Input
                id="credit-amount"
                type="number"
                placeholder="5000"
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
              <p className="text-xs text-neutral-500">
                = {formatCents(Number(amount) || 0)}
              </p>
            )}
            <AnimatePresence>
              {fieldErrors.amount && (
                <FieldError message={fieldErrors.amount} />
              )}
            </AnimatePresence>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="credit-description">Description</Label>
            <textarea
              id="credit-description"
              placeholder="e.g., Service credit for downtime on Jan 15, 2026"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setFieldErrors((prev) => ({ ...prev, description: null }));
              }}
              rows={3}
              className={cn(
                'flex w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-none',
                fieldErrors.description && 'border-red-500/50 focus-visible:ring-red-500'
              )}
            />
            <AnimatePresence>
              {fieldErrors.description && (
                <FieldError message={fieldErrors.description} />
              )}
            </AnimatePresence>
          </div>

          {/* API Error */}
          <AnimatePresence>
            {error && <ApiError message={error} />}
          </AnimatePresence>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className="text-neutral-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Apply Credit
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
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center gap-1 text-xs text-red-400"
    >
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </motion.p>
  );
}

function ApiError({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
      <p className="text-sm text-red-300">{message}</p>
    </motion.div>
  );
}

// Skeleton
function SubscriptionsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-white/10" />
          <div className="space-y-1.5">
            <div className="h-6 w-32 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
          </div>
        </div>
        <div className="h-9 w-24 animate-pulse rounded-lg bg-white/10" />
      </div>

      {/* Metrics skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-white/10" />
              <div className="h-6 w-16 rounded-full bg-white/10" />
            </div>
            <div className="h-8 w-24 rounded bg-white/10" />
            <div className="mt-2 h-4 w-32 rounded bg-white/10" />
          </div>
        ))}
      </div>

      {/* Tier breakdown skeleton */}
      <div className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 h-6 w-40 rounded bg-white/10" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mb-2 h-4 w-16 rounded bg-white/10" />
              <div className="h-8 w-12 rounded bg-white/10" />
              <div className="mt-3 h-1.5 rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
