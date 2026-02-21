import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Check,
  AlertTriangle,
  Clock,
  Download,
  Sparkles,
  Users,
  ArrowUpRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import {
  fetchCurrentPlan,
  fetchAvailablePlans,
  changePlan,
  cancelSubscription,
  createCheckoutSession,
} from '@/lib/api/billing';

// ============================================================================
// Types
// ============================================================================

interface PlanDefinition {
  code: string;
  name: string;
  price: number;
  employeeLimit: number | null;
  features: string[];
  recommended?: boolean;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'failed' | 'pending';
  downloadUrl?: string;
}

// ============================================================================
// Constants
// ============================================================================

const PLANS: PlanDefinition[] = [
  {
    code: 'starter',
    name: 'Starter',
    price: 29,
    employeeLimit: 10,
    features: [
      'billing.planFeatures.timeTracking',
      'billing.planFeatures.basicScheduling',
      'billing.planFeatures.mobileApp',
      'billing.planFeatures.complianceAlerts',
      'billing.planFeatures.emailSupport',
    ],
  },
  {
    code: 'growth',
    name: 'Growth',
    price: 69,
    employeeLimit: 30,
    recommended: true,
    features: [
      'billing.planFeatures.everythingInStarter',
      'billing.planFeatures.advancedScheduling',
      'billing.planFeatures.shiftSwaps',
      'billing.planFeatures.leaveManagement',
      'billing.planFeatures.reportsAnalytics',
      'billing.planFeatures.prioritySupport',
    ],
  },
  {
    code: 'business',
    name: 'Business',
    price: 149,
    employeeLimit: null,
    features: [
      'billing.planFeatures.everythingInGrowth',
      'billing.planFeatures.unlimitedEmployees',
      'billing.planFeatures.apiAccess',
      'billing.planFeatures.customReports',
      'billing.planFeatures.auditLog',
      'billing.planFeatures.dedicatedSupport',
    ],
  },
];

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'active':
      return 'success';
    case 'trial':
      return 'warning';
    case 'past_due':
    case 'cancelled':
    case 'expired':
    case 'trial_expired':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function getUsagePercentage(used: number, limit: number | null): number {
  if (!limit) return 10;
  return Math.min(100, Math.round((used / limit) * 100));
}

function getUsageBarColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 70) return 'bg-amber-500';
  return 'bg-primary-500';
}

// ============================================================================
// Sub-components
// ============================================================================

interface TrialBannerProps {
  daysRemaining: number | null;
  onChoosePlan: () => void;
}

function TrialBanner({ daysRemaining, onChoosePlan }: TrialBannerProps) {
  const { t } = useTranslation();
  const days = daysRemaining ?? 0;

  return (
    <div className="rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 p-6 text-white shadow-kresna-lg">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold">
              {t('billing.trialBanner', { days })}
            </p>
            <p className="text-sm text-primary-100">
              {t('billing.trialBannerSubtitle')}
            </p>
          </div>
        </div>
        <Button
          onClick={onChoosePlan}
          className="rounded-xl bg-white text-primary-700 hover:bg-primary-50 shadow-sm"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {t('billing.choosePlan')}
        </Button>
      </div>
    </div>
  );
}

interface PlanCardProps {
  plan: PlanDefinition;
  isCurrent: boolean;
  isUpgrade: boolean;
  isLoading: boolean;
  onSelect: (code: string) => void;
}

function PlanCard({ plan, isCurrent, isUpgrade, isLoading, onSelect }: PlanCardProps) {
  const { t } = useTranslation();

  let buttonLabel: string;
  if (isCurrent) {
    buttonLabel = t('billing.currentLabel');
  } else if (isUpgrade) {
    buttonLabel = t('billing.upgrade');
  } else {
    buttonLabel = t('billing.downgrade');
  }

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border border-kresna-border bg-white shadow-card transition-all duration-300 ease-kresna hover:shadow-kresna',
        plan.recommended && 'ring-2 ring-primary-500 shadow-kresna',
        isCurrent && !plan.recommended && 'border-primary-200 ring-1 ring-primary-300'
      )}
    >
      {plan.recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="rounded-full bg-primary-600 text-white hover:bg-primary-700 shadow-kresna-btn">
            {t('billing.recommended')}
          </Badge>
        </div>
      )}

      <div className="flex flex-1 flex-col p-6 pt-8">
        <h3 className="text-lg font-semibold text-charcoal">{plan.name}</h3>

        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-4xl font-bold text-charcoal">
            {formatCurrency(plan.price)}
          </span>
          <span className="text-sm text-kresna-gray">{t('billing.perMonth')}</span>
        </div>

        <p className="mt-2 text-sm text-kresna-gray">
          {plan.employeeLimit
            ? t('billing.employeeLimit', { limit: plan.employeeLimit })
            : t('billing.unlimitedEmployees')}
        </p>

        <div className="my-6 h-px bg-kresna-light" />

        <ul className="flex-1 space-y-3">
          {plan.features.map((featureKey) => (
            <li key={featureKey} className="flex items-start gap-2.5 text-sm text-kresna-gray-dark">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
              <span>{t(featureKey)}</span>
            </li>
          ))}
        </ul>

        <Button
          className={cn(
            'mt-6 w-full rounded-xl',
            plan.recommended && !isCurrent && 'shadow-kresna-btn',
          )}
          variant={isCurrent ? 'outline' : plan.recommended ? 'gradient' : 'default'}
          disabled={isCurrent || isLoading}
          onClick={() => onSelect(plan.code)}
        >
          {isCurrent && <Check className="mr-2 h-4 w-4" />}
          {!isCurrent && isUpgrade && <ArrowUpRight className="mr-2 h-4 w-4" />}
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}

interface InvoiceRowProps {
  invoice: Invoice;
}

function InvoiceRow({ invoice }: InvoiceRowProps) {
  const { t } = useTranslation();

  let statusVariant: 'success' | 'destructive' | 'warning';
  let statusLabel: string;

  switch (invoice.status) {
    case 'paid':
      statusVariant = 'success';
      statusLabel = t('billing.paid');
      break;
    case 'failed':
      statusVariant = 'destructive';
      statusLabel = t('billing.failed');
      break;
    default:
      statusVariant = 'warning';
      statusLabel = t('billing.pending');
      break;
  }

  return (
    <tr className="border-b border-kresna-border last:border-0">
      <td className="py-3 pr-4 text-sm text-kresna-gray-dark">
        {formatDate(invoice.date)}
      </td>
      <td className="py-3 pr-4 text-sm font-medium text-charcoal">
        {formatCurrency(invoice.amount / 100, invoice.currency)}
      </td>
      <td className="py-3 pr-4">
        <Badge variant={statusVariant}>{statusLabel}</Badge>
      </td>
      <td className="py-3 text-right">
        {invoice.downloadUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="text-kresna-gray hover:text-kresna-gray-dark"
            asChild
          >
            <a href={invoice.downloadUrl} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" />
            </a>
          </Button>
        )}
      </td>
    </tr>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function BillingPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const subscription = useSubscription();
  const [cancelOpen, setCancelOpen] = useState(false);

  // ---- Data fetching ----

  const { data: currentPlanData } = useQuery({
    queryKey: ['billing-plan', slug],
    queryFn: () => fetchCurrentPlan(slug!),
    enabled: !!slug,
  });

  const { data: availablePlansData } = useQuery({
    queryKey: ['billing-plans', slug],
    queryFn: () => fetchAvailablePlans(slug!),
    enabled: !!slug,
  });

  const plan = currentPlanData?.data;
  const plans = availablePlansData?.data ?? [];

  // ---- Mutations ----

  const checkoutMutation = useMutation({
    mutationFn: (planCode: string) => createCheckoutSession(slug!, planCode),
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast.error(t('billing.checkoutError'));
    },
  });

  const changePlanMutation = useMutation({
    mutationFn: (planId: string) => changePlan(slug!, planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-plan', slug] });
      queryClient.invalidateQueries({ queryKey: ['billing-plans', slug] });
      subscription.refetch();
      toast.success(t('billing.planChanged'));
    },
    onError: () => {
      toast.error(t('billing.changePlanError'));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelSubscription(slug!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-plan', slug] });
      subscription.refetch();
      toast.success(t('billing.subscriptionCancelled'));
      setCancelOpen(false);
    },
    onError: () => {
      toast.error(t('billing.cancelError'));
    },
  });

  // ---- Derived state ----

  const currentPlanCode = plan?.code ?? subscription.tier;
  const employeesUsed = plan?.usage?.employees ?? subscription.employeeCount;
  const employeeLimit = plan?.usage?.limit ?? subscription.employeeLimit;
  const usagePercent = getUsagePercentage(employeesUsed, employeeLimit);
  const isActive = subscription.subscriptionStatus === 'active';
  const isPlanMutating = checkoutMutation.isPending || changePlanMutation.isPending;

  // Invoices placeholder - replace with real API call when endpoint exists
  const invoices: Invoice[] = [];

  // ---- Handlers ----

  function handlePlanSelect(planCode: string): void {
    if (!slug || planCode === currentPlanCode) return;

    // If user has no active subscription, redirect to Stripe Checkout
    if (!isActive && subscription.subscriptionStatus !== 'past_due') {
      checkoutMutation.mutate(planCode);
      return;
    }

    // Otherwise, change the existing subscription in-place
    const targetPlan = plans.find((p) => p.code === planCode);
    if (targetPlan) {
      changePlanMutation.mutate(targetPlan.id);
    }
  }

  function scrollToPlans(): void {
    document.getElementById('plan-comparison')?.scrollIntoView({ behavior: 'smooth' });
  }

  function getPlanIndex(code: string): number {
    return PLANS.findIndex((p) => p.code === code);
  }

  // ---- Render ----

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
          <CreditCard className="h-6 w-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-charcoal tracking-tight">
            {t('billing.title')}
          </h1>
          <p className="text-sm text-kresna-gray">
            {t('billing.subtitle')}
          </p>
        </div>
      </div>

      {/* Trial Banner */}
      {subscription.isTrialing && (
        <TrialBanner
          daysRemaining={subscription.daysRemaining}
          onChoosePlan={scrollToPlans}
        />
      )}

      {/* Current Plan Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-charcoal">
            <CreditCard className="h-4 w-4 text-primary-500" />
            {t('billing.currentPlan')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Plan name and status */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-2xl font-bold text-charcoal">
                {plan?.name ?? t('billing.trialActive')}
              </p>
              {plan && (
                <p className="mt-1 text-kresna-gray">
                  {formatCurrency(plan.price_cents / 100, plan.currency)}{t('billing.perMonth')}
                </p>
              )}
            </div>
            <Badge variant={getStatusBadgeVariant(subscription.subscriptionStatus)}>
              {t(`billing.statusLabels.${subscription.subscriptionStatus}`)}
            </Badge>
          </div>

          {/* Trial end notice */}
          {subscription.isTrialing && subscription.daysRemaining !== null && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <Clock className="h-4 w-4 flex-shrink-0" />
              {t('billing.trialEndsOn', { date: `${subscription.daysRemaining} ${t('billing.daysRemaining')}` })}
            </div>
          )}

          {/* Usage meter */}
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-kresna-gray">
                <Users className="h-3.5 w-3.5" />
                {t('billing.usage')}
              </span>
              <span className="font-medium text-charcoal">
                {employeeLimit
                  ? t('billing.employeesUsed', { used: employeesUsed, limit: employeeLimit })
                  : t('billing.employeesUnlimited', { used: employeesUsed })}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-kresna-light">
              <div
                className={cn('h-full rounded-full transition-all duration-500', getUsageBarColor(usagePercent))}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            {usagePercent >= 90 && employeeLimit && (
              <p className="mt-1.5 text-xs text-red-600">
                {t('billing.nearCapacity')}
              </p>
            )}
          </div>

          {/* Next billing date */}
          {plan?.billing_period && isActive && (
            <div className="flex items-center justify-between rounded-xl bg-kresna-light px-4 py-3 text-sm">
              <span className="text-kresna-gray">{t('billing.nextBilling')}</span>
              <span className="font-medium text-charcoal">--</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Comparison Grid */}
      <div id="plan-comparison">
        <h2 className="mb-1 text-lg font-semibold text-charcoal tracking-tight">
          {t('billing.choosePlan')}
        </h2>
        <p className="mb-6 text-sm text-kresna-gray">
          {t('billing.selectPlan')}
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((planDef) => {
            const isCurrent = planDef.code === currentPlanCode;
            const currentIndex = getPlanIndex(currentPlanCode);
            const targetIndex = getPlanIndex(planDef.code);
            const isUpgrade = targetIndex > currentIndex;

            return (
              <PlanCard
                key={planDef.code}
                plan={planDef}
                isCurrent={isCurrent}
                isUpgrade={isUpgrade}
                isLoading={isPlanMutating}
                onSelect={handlePlanSelect}
              />
            );
          })}
        </div>
      </div>

      {/* Payment History */}
      <div className="overflow-hidden rounded-3xl border border-kresna-border bg-white shadow-card">
        <div className="p-6 sm:p-8">
          <h3 className="text-base font-semibold text-charcoal">
            {t('billing.billingHistory')}
          </h3>
        </div>
        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
          {invoices.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-kresna-border text-left text-xs font-medium uppercase tracking-wider text-kresna-gray">
                  <th className="pb-3 pr-4">{t('billing.date')}</th>
                  <th className="pb-3 pr-4">{t('billing.amount')}</th>
                  <th className="pb-3 pr-4">{t('billing.status')}</th>
                  <th className="pb-3 text-right">{t('billing.downloadInvoice')}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <InvoiceRow key={invoice.id} invoice={invoice} />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-kresna-light">
                <CreditCard className="h-7 w-7 text-kresna-gray" />
              </div>
              <p className="mt-4 text-sm font-medium text-kresna-gray">
                {t('billing.noInvoices')}
              </p>
              <p className="mt-1 text-xs text-kresna-gray">
                {t('billing.noInvoicesDesc')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Subscription - Danger Zone */}
      {isActive && (
        <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-charcoal">
                {t('billing.cancelSubscription')}
              </p>
              <p className="mt-1 text-sm text-kresna-gray">
                {t('billing.cancelDescription')}
              </p>
            </div>
            <Button
              variant="destructive"
              className="shrink-0 rounded-xl"
              onClick={() => setCancelOpen(true)}
            >
              <X className="mr-2 h-4 w-4" />
              {t('billing.cancelSubscription')}
            </Button>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {t('billing.cancelConfirm')}
            </DialogTitle>
            <DialogDescription className="text-kresna-gray">
              {t('billing.cancelWarning')}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-red-50 p-4">
            <ul className="space-y-2 text-sm text-red-700">
              <li className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                {t('billing.cancelConsequence1')}
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                {t('billing.cancelConsequence2')}
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                {t('billing.cancelConsequence3')}
              </li>
            </ul>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              {t('billing.keepSubscription')}
            </Button>
            <Button
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              {cancelMutation.isPending
                ? t('common.loading')
                : t('billing.confirmCancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
