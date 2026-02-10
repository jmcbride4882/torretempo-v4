/**
 * PlansPage - Admin Subscription Plans Management
 * CRUD operations for subscription plans with pricing, modules, and billing periods
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  CreditCard,
  RefreshCw,
  Plus,
  Edit,
  Power,
  Users,
  Check,
  Loader2,
  AlertCircle,
  Infinity,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
  fetchPlans,
  createPlan,
  updatePlan,
  deactivatePlan,
  AdminApiError,
} from '@/lib/api/admin';
import type { SubscriptionPlan, CreatePlanRequest, UpdatePlanRequest } from '@/lib/api/admin';

// ============================================================================
// CONSTANTS
// ============================================================================

const MODULE_OPTIONS: { key: string; label: string }[] = [
  { key: 'timeTracking', label: 'Time Tracking' },
  { key: 'scheduling', label: 'Scheduling' },
  { key: 'swapRequests', label: 'Swap Requests' },
  { key: 'reporting', label: 'Reporting' },
  { key: 'mobileApp', label: 'Mobile App' },
];

const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'EUR' },
  { value: 'USD', label: 'USD' },
  { value: 'GBP', label: 'GBP' },
];

const BILLING_PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
];

const DEFAULT_MODULES: Record<string, boolean> = {
  timeTracking: false,
  scheduling: false,
  swapRequests: false,
  reporting: false,
  mobileApp: false,
};

// ============================================================================
// HELPERS
// ============================================================================

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

// ============================================================================
// FORM STATE & VALIDATION
// ============================================================================

interface PlanFormState {
  code: string;
  name: string;
  description: string;
  price_cents: string;
  currency: string;
  billing_period: 'monthly' | 'annual';
  employee_limit: string;
  unlimited_employees: boolean;
  included_modules: Record<string, boolean>;
  is_active: boolean;
}

const INITIAL_FORM: PlanFormState = {
  code: '',
  name: '',
  description: '',
  price_cents: '',
  currency: 'EUR',
  billing_period: 'monthly',
  employee_limit: '',
  unlimited_employees: true,
  included_modules: { ...DEFAULT_MODULES },
  is_active: true,
};

function validateForm(form: PlanFormState): Record<string, string | null> {
  const errors: Record<string, string | null> = {};

  // code: required, lowercase, alphanumeric + underscore/dash
  if (!form.code.trim()) {
    errors.code = 'Plan code is required';
  } else if (!/^[a-z0-9_-]+$/.test(form.code.trim())) {
    errors.code = 'Only lowercase letters, numbers, underscores, and dashes allowed';
  }

  // name: required, min 3 chars
  if (!form.name.trim()) {
    errors.name = 'Plan name is required';
  } else if (form.name.trim().length < 3) {
    errors.name = 'Name must be at least 3 characters';
  }

  // price_cents: required, >= 0
  if (!form.price_cents.trim()) {
    errors.price_cents = 'Price is required';
  } else {
    const cents = Number(form.price_cents);
    if (isNaN(cents) || cents < 0) {
      errors.price_cents = 'Price must be 0 or greater';
    } else if (!Number.isInteger(cents)) {
      errors.price_cents = 'Price must be a whole number (cents)';
    }
  }

  // currency: required
  if (!form.currency) {
    errors.currency = 'Currency is required';
  }

  // billing_period: required
  if (!form.billing_period) {
    errors.billing_period = 'Billing period is required';
  }

  // employee_limit: if not unlimited, must be > 0
  if (!form.unlimited_employees) {
    if (!form.employee_limit.trim()) {
      errors.employee_limit = 'Employee limit is required when not unlimited';
    } else {
      const limit = Number(form.employee_limit);
      if (isNaN(limit) || limit <= 0) {
        errors.employee_limit = 'Must be greater than 0';
      } else if (!Number.isInteger(limit)) {
        errors.employee_limit = 'Must be a whole number';
      }
    }
  }

  return errors;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PlansPage() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<SubscriptionPlan | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Form state
  const [form, setForm] = useState<PlanFormState>({ ...INITIAL_FORM });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // ---- Data Loading ----
  const loadPlans = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(silent);

    try {
      const response = await fetchPlans();
      setPlans(response.plans || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load subscription plans');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // ---- Form Helpers ----
  const resetForm = () => {
    setForm({ ...INITIAL_FORM });
    setFieldErrors({});
    setApiError(null);
  };

  const openCreateModal = () => {
    resetForm();
    setCreateModalOpen(true);
  };

  const openEditModal = (plan: SubscriptionPlan) => {
    setForm({
      code: plan.code,
      name: plan.name,
      description: plan.description || '',
      price_cents: plan.price_cents.toString(),
      currency: plan.currency,
      billing_period: plan.billing_period,
      employee_limit: plan.employee_limit ? plan.employee_limit.toString() : '',
      unlimited_employees: plan.employee_limit === null,
      included_modules: { ...DEFAULT_MODULES, ...plan.included_modules },
      is_active: plan.is_active,
    });
    setFieldErrors({});
    setApiError(null);
    setEditingPlan(plan);
  };

  const updateField = <K extends keyof PlanFormState>(key: K, value: PlanFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: null }));
  };

  const toggleModule = (moduleKey: string) => {
    setForm((prev) => ({
      ...prev,
      included_modules: {
        ...prev.included_modules,
        [moduleKey]: !prev.included_modules[moduleKey],
      },
    }));
  };

  // ---- Handlers ----
  const handleCreate = async () => {
    const errors = validateForm(form);
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setIsActionLoading(true);
    setApiError(null);

    try {
      const payload: CreatePlanRequest = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price_cents: Number(form.price_cents),
        currency: form.currency,
        billing_period: form.billing_period,
        employee_limit: form.unlimited_employees ? null : Number(form.employee_limit),
        included_modules: form.included_modules,
        is_active: form.is_active,
      };
      await createPlan(payload);
      toast.success('Plan created successfully');
      setCreateModalOpen(false);
      resetForm();
      loadPlans();
    } catch (err) {
      if (err instanceof AdminApiError) {
        setApiError(err.message);
      } else {
        setApiError('An unexpected error occurred');
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingPlan) return;

    const errors = validateForm(form);
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setIsActionLoading(true);
    setApiError(null);

    try {
      const payload: UpdatePlanRequest = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price_cents: Number(form.price_cents),
        currency: form.currency,
        billing_period: form.billing_period,
        employee_limit: form.unlimited_employees ? null : Number(form.employee_limit),
        included_modules: form.included_modules,
        is_active: form.is_active,
      };
      await updatePlan(editingPlan.id, payload);
      toast.success('Plan updated successfully');
      setEditingPlan(null);
      resetForm();
      loadPlans();
    } catch (err) {
      if (err instanceof AdminApiError) {
        setApiError(err.message);
      } else {
        setApiError('An unexpected error occurred');
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;

    setIsActionLoading(true);
    try {
      if (deactivateTarget.is_active) {
        await deactivatePlan(deactivateTarget.id);
        toast.success('Plan deactivated');
      } else {
        await updatePlan(deactivateTarget.id, { is_active: true });
        toast.success('Plan reactivated');
      }
      setDeactivateTarget(null);
      loadPlans();
    } catch (err) {
      if (err instanceof AdminApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to update plan status');
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  // ---- Derived ----
  const activePlans = plans.filter((p) => p.is_active);
  const inactivePlans = plans.filter((p) => !p.is_active);

  // Is modal open?
  const isFormModalOpen = createModalOpen || editingPlan !== null;
  const isEditMode = editingPlan !== null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 shadow-sm">
            <CreditCard className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">{t('admin.plans.title')}</h1>
            <p className="text-sm text-zinc-500">
              Manage pricing tiers and feature bundles
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadPlans(true)}
              disabled={isRefreshing}
              className="gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
          <div>
            <Button
              size="sm"
              onClick={openCreateModal}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700"
            >
              <Plus className="h-4 w-4" />
              {t('admin.plans.createPlan')}
            </Button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <PlansPageSkeleton />
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-16 text-center">
          <CreditCard className="mb-3 h-10 w-10 text-zinc-400" />
          <p className="text-lg font-medium text-zinc-700">{t('admin.plans.title')}</p>
          <p className="mt-1 text-sm text-zinc-500">Create your first plan to get started</p>
          <Button
            size="sm"
            onClick={openCreateModal}
            className="mt-5 gap-1.5 bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="h-4 w-4" />
            {t('admin.plans.createPlan')}
          </Button>
        </div>
      ) : (
        <>
          {/* Active Plans */}
          {activePlans.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-zinc-900">
                Active Plans
                <span className="ml-2 text-sm font-normal text-zinc-500">
                  ({activePlans.length})
                </span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {activePlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onEdit={openEditModal}
                    onToggleActive={setDeactivateTarget}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Inactive Plans */}
          {inactivePlans.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-zinc-500">
                Inactive Plans
                <span className="ml-2 text-sm font-normal text-zinc-400">
                  ({inactivePlans.length})
                </span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {inactivePlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onEdit={openEditModal}
                    onToggleActive={setDeactivateTarget}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Dialog
        open={isFormModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateModalOpen(false);
            setEditingPlan(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                {isEditMode ? (
                  <Edit className="h-4 w-4 text-amber-600" />
                ) : (
                  <Plus className="h-4 w-4 text-amber-600" />
                )}
              </div>
              {isEditMode ? t('admin.plans.editPlan') : t('admin.plans.createPlan')}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? 'Update the plan details, pricing, and included modules.'
                : 'Define a new subscription plan with pricing and features.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="plan-code">
                Plan Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="plan-code"
                placeholder="e.g., starter, pro, enterprise"
                value={form.code}
                onChange={(e) => updateField('code', e.target.value.toLowerCase().replace(/\s/g, ''))}
                disabled={isEditMode}
                className={cn(
                  isEditMode && 'opacity-60 cursor-not-allowed',
                  fieldErrors.code && 'border-red-500/50 focus-visible:ring-red-500'
                )}
              />
              <p className="text-xs text-zinc-500">
                Lowercase, no spaces. Used internally as an identifier.
              </p>
              {fieldErrors.code && <FieldError message={fieldErrors.code} />}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="plan-name">
                Display Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="plan-name"
                placeholder="e.g., Starter Plan"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={cn(fieldErrors.name && 'border-red-500/50 focus-visible:ring-red-500')}
              />
              {fieldErrors.name && <FieldError message={fieldErrors.name} />}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="plan-description">Description</Label>
              <textarea
                id="plan-description"
                placeholder="Brief description of what this plan includes..."
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={3}
                className="flex w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-none"
              />
            </div>

            {/* Price & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan-price">
                  Price (cents) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="plan-price"
                  type="number"
                  placeholder="2900"
                  min="0"
                  step="1"
                  value={form.price_cents}
                  onChange={(e) => updateField('price_cents', e.target.value)}
                  className={cn(fieldErrors.price_cents && 'border-red-500/50 focus-visible:ring-red-500')}
                />
                {form.price_cents && !fieldErrors.price_cents && form.currency && (
                  <p className="text-xs text-amber-600">
                    = {formatPrice(Number(form.price_cents) || 0, form.currency)}
                  </p>
                )}
                {fieldErrors.price_cents && <FieldError message={fieldErrors.price_cents} />}
              </div>

              <div className="space-y-2">
                <Label>
                  Currency <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.currency}
                  onValueChange={(val) => updateField('currency', val)}
                >
                  <SelectTrigger className={cn(fieldErrors.currency && 'border-red-500/50')}>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.currency && <FieldError message={fieldErrors.currency} />}
              </div>
            </div>

            {/* Billing Period */}
            <div className="space-y-2">
              <Label>
                Billing Period <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.billing_period}
                onValueChange={(val) => updateField('billing_period', val as 'monthly' | 'annual')}
              >
                <SelectTrigger className={cn(fieldErrors.billing_period && 'border-red-500/50')}>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_PERIOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.billing_period && <FieldError message={fieldErrors.billing_period} />}
            </div>

            {/* Employee Limit */}
            <div className="space-y-3">
              <Label>Employee Limit</Label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="unlimited-employees"
                  checked={form.unlimited_employees}
                  onChange={(e) => {
                    updateField('unlimited_employees', e.target.checked);
                    if (e.target.checked) {
                      updateField('employee_limit', '');
                      setFieldErrors((prev) => ({ ...prev, employee_limit: null }));
                    }
                  }}
                  className="h-4 w-4 rounded border-zinc-300 bg-white"
                />
                <label htmlFor="unlimited-employees" className="text-sm text-zinc-700">
                  Unlimited employees
                </label>
              </div>
              {!form.unlimited_employees && (
                <div>
                  <Input
                    type="number"
                    placeholder="e.g., 50"
                    min="1"
                    step="1"
                    value={form.employee_limit}
                    onChange={(e) => updateField('employee_limit', e.target.value)}
                    className={cn(fieldErrors.employee_limit && 'border-red-500/50 focus-visible:ring-red-500')}
                  />
                  {fieldErrors.employee_limit && (
                    <FieldError message={fieldErrors.employee_limit} />
                  )}
                </div>
              )}
            </div>

            {/* Included Modules */}
            <div className="space-y-3">
              <Label>Included Modules</Label>
              <div className="grid grid-cols-2 gap-2">
                {MODULE_OPTIONS.map((mod) => (
                  <label
                    key={mod.key}
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-all duration-200',
                      form.included_modules[mod.key]
                        ? 'border-amber-500/40 bg-amber-50 text-amber-700'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-100'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={form.included_modules[mod.key] || false}
                      onChange={() => toggleModule(mod.key)}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all duration-150',
                        form.included_modules[mod.key]
                          ? 'border-amber-500 bg-amber-500'
                          : 'border-zinc-300 bg-transparent'
                      )}
                    >
                      {form.included_modules[mod.key] && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    {mod.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Active toggle (edit mode) */}
            {isEditMode && (
              <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <input
                  type="checkbox"
                  id="plan-active"
                  checked={form.is_active}
                  onChange={(e) => updateField('is_active', e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 bg-white"
                />
                <label htmlFor="plan-active" className="text-sm text-zinc-700">
                  Plan is active and available for purchase
                </label>
              </div>
            )}

            {/* API Error */}
            {apiError && <ApiErrorBanner message={apiError} />}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setCreateModalOpen(false);
                setEditingPlan(null);
                resetForm();
              }}
              disabled={isActionLoading}
              className="text-zinc-500 hover:text-zinc-900"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={isEditMode ? handleUpdate : handleCreate}
              disabled={isActionLoading}
              className="gap-2 bg-amber-600 hover:bg-amber-700"
            >
              {isActionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditMode ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Reactivate Confirmation */}
      <Dialog open={!!deactivateTarget} onOpenChange={() => setDeactivateTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg',
                  deactivateTarget?.is_active ? 'bg-red-50' : 'bg-amber-50'
                )}
              >
                <Power
                  className={cn(
                    'h-4 w-4',
                    deactivateTarget?.is_active ? 'text-red-500' : 'text-amber-600'
                  )}
                />
              </div>
              {deactivateTarget?.is_active ? t('admin.plans.deletePlan') : 'Reactivate Plan'}
            </DialogTitle>
            <DialogDescription>
              {deactivateTarget?.is_active ? (
                <>
                  Are you sure you want to deactivate{' '}
                  <span className="font-semibold text-zinc-900">{deactivateTarget.name}</span>?
                  It will no longer be available for new subscriptions.
                </>
              ) : (
                <>
                  Reactivate{' '}
                  <span className="font-semibold text-zinc-900">{deactivateTarget?.name}</span>?
                  It will become available for subscriptions again.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeactivateTarget(null)}
              disabled={isActionLoading}
              className="text-zinc-500 hover:text-zinc-900"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleDeactivate}
              disabled={isActionLoading}
              className={cn(
                'gap-2',
                deactivateTarget?.is_active
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              )}
            >
              {isActionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {deactivateTarget?.is_active ? t('common.delete') : 'Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// PLAN CARD
// ============================================================================

interface PlanCardProps {
  plan: SubscriptionPlan;
  onEdit: (plan: SubscriptionPlan) => void;
  onToggleActive: (plan: SubscriptionPlan) => void;
}

function PlanCard({ plan, onEdit, onToggleActive }: PlanCardProps) {
  const enabledModules = Object.entries(plan.included_modules || {}).filter(
    ([, enabled]) => enabled
  );

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border p-5 transition-all duration-200',
        plan.is_active
          ? 'border-zinc-200 bg-white shadow-sm hover:border-zinc-300 hover:shadow-md'
          : 'border-zinc-200 bg-zinc-50 opacity-60 hover:opacity-80'
      )}
    >
      {/* Status badge */}
      <div className="mb-4 flex items-center justify-between">
        <Badge
          className={cn(
            'border text-xs',
            plan.is_active
              ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700'
              : 'border-zinc-300 bg-zinc-100 text-zinc-500'
          )}
        >
          {plan.is_active ? 'Active' : 'Inactive'}
        </Badge>
        <code className="text-xs text-zinc-500">{plan.code}</code>
      </div>

      {/* Plan name */}
      <h3 className="text-lg font-bold text-zinc-900">{plan.name}</h3>

      {/* Price */}
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-amber-600">
          {formatPrice(plan.price_cents, plan.currency)}
        </span>
        <span className="text-sm text-zinc-500">
          /{plan.billing_period === 'monthly' ? 'mo' : 'year'}
        </span>
      </div>

      {/* Description */}
      {plan.description && (
        <p className="mt-3 text-sm leading-relaxed text-zinc-500">
          {plan.description}
        </p>
      )}

      {/* Employee limit */}
      <div className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
        {plan.employee_limit === null ? (
          <>
            <Infinity className="h-4 w-4 text-zinc-400" />
            <span>Unlimited employees</span>
          </>
        ) : (
          <>
            <Users className="h-4 w-4 text-zinc-400" />
            <span>Up to {plan.employee_limit} employees</span>
          </>
        )}
      </div>

      {/* Modules */}
      {enabledModules.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {enabledModules.map(([key]) => {
            const mod = MODULE_OPTIONS.find((m) => m.key === key);
            return (
              <span
                key={key}
                className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700"
              >
                {mod?.label || key}
              </span>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex items-center gap-2 border-t border-zinc-200 pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(plan)}
          className="flex-1 gap-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
        >
          <Edit className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleActive(plan)}
          className={cn(
            'flex-1 gap-1.5',
            plan.is_active
              ? 'text-red-500 hover:bg-red-50 hover:text-red-600'
              : 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
          )}
        >
          <Power className="h-3.5 w-3.5" />
          {plan.is_active ? 'Deactivate' : 'Activate'}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// ERROR COMPONENTS
// ============================================================================

function FieldError({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1 text-xs text-red-500">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

function ApiErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
      <p className="text-sm text-red-700">{message}</p>
    </div>
  );
}

// ============================================================================
// SKELETON
// ============================================================================

function PlansPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-32 animate-pulse rounded bg-zinc-100" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex justify-between">
              <div className="h-5 w-16 rounded-full bg-zinc-100" />
              <div className="h-4 w-12 rounded bg-zinc-100" />
            </div>
            <div className="h-6 w-32 rounded bg-zinc-100" />
            <div className="mt-2 h-9 w-28 rounded bg-zinc-100" />
            <div className="mt-3 h-4 w-full rounded bg-zinc-100" />
            <div className="mt-4 h-4 w-40 rounded bg-zinc-100" />
            <div className="mt-4 flex gap-1.5">
              <div className="h-5 w-20 rounded bg-zinc-100" />
              <div className="h-5 w-16 rounded bg-zinc-100" />
            </div>
            <div className="mt-5 flex gap-2 border-t border-zinc-200 pt-4">
              <div className="h-8 flex-1 rounded bg-zinc-100" />
              <div className="h-8 flex-1 rounded bg-zinc-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
