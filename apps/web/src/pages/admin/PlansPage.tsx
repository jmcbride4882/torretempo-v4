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

const MODULE_OPTIONS: { key: string; labelKey: string }[] = [
  { key: 'timeTracking', labelKey: 'admin.plans.moduleTimeTracking' },
  { key: 'scheduling', labelKey: 'admin.plans.moduleScheduling' },
  { key: 'swapRequests', labelKey: 'admin.plans.moduleSwapRequests' },
  { key: 'reporting', labelKey: 'admin.plans.moduleReporting' },
  { key: 'mobileApp', labelKey: 'admin.plans.moduleMobileApp' },
];

const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'EUR' },
  { value: 'USD', label: 'USD' },
  { value: 'GBP', label: 'GBP' },
];

const BILLING_PERIOD_OPTIONS = [
  { value: 'monthly', labelKey: 'admin.plans.monthly' },
  { value: 'annual', labelKey: 'admin.plans.annual' },
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

function validateForm(form: PlanFormState, t: (key: string) => string): Record<string, string | null> {
  const errors: Record<string, string | null> = {};

  // code: required, lowercase, alphanumeric + underscore/dash
  if (!form.code.trim()) {
    errors.code = t('admin.plans.validation.codeRequired');
  } else if (!/^[a-z0-9_-]+$/.test(form.code.trim())) {
    errors.code = t('admin.plans.validation.codeFormat');
  }

  // name: required, min 3 chars
  if (!form.name.trim()) {
    errors.name = t('admin.plans.validation.nameRequired');
  } else if (form.name.trim().length < 3) {
    errors.name = t('admin.plans.validation.nameMinLength');
  }

  // price_cents: required, >= 0
  if (!form.price_cents.trim()) {
    errors.price_cents = t('admin.plans.validation.priceRequired');
  } else {
    const cents = Number(form.price_cents);
    if (isNaN(cents) || cents < 0) {
      errors.price_cents = t('admin.plans.validation.priceMinValue');
    } else if (!Number.isInteger(cents)) {
      errors.price_cents = t('admin.plans.validation.priceWholeNumber');
    }
  }

  // currency: required
  if (!form.currency) {
    errors.currency = t('admin.plans.validation.currencyRequired');
  }

  // billing_period: required
  if (!form.billing_period) {
    errors.billing_period = t('admin.plans.validation.billingPeriodRequired');
  }

  // employee_limit: if not unlimited, must be > 0
  if (!form.unlimited_employees) {
    if (!form.employee_limit.trim()) {
      errors.employee_limit = t('admin.plans.validation.employeeLimitRequired');
    } else {
      const limit = Number(form.employee_limit);
      if (isNaN(limit) || limit <= 0) {
        errors.employee_limit = t('admin.plans.validation.mustBeGreaterThanZero');
      } else if (!Number.isInteger(limit)) {
        errors.employee_limit = t('admin.plans.validation.mustBeWholeNumber');
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
      toast.error(t('admin.plans.failedToLoad'));
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
    const errors = validateForm(form, t);
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
      toast.success(t('admin.plans.planCreated'));
      setCreateModalOpen(false);
      resetForm();
      loadPlans();
    } catch (err) {
      if (err instanceof AdminApiError) {
        setApiError(err.message);
      } else {
        setApiError(t('admin.plans.unexpectedError'));
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingPlan) return;

    const errors = validateForm(form, t);
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
      toast.success(t('admin.plans.planUpdated'));
      setEditingPlan(null);
      resetForm();
      loadPlans();
    } catch (err) {
      if (err instanceof AdminApiError) {
        setApiError(err.message);
      } else {
        setApiError(t('admin.plans.unexpectedError'));
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
        toast.success(t('admin.plans.planDeactivated'));
      } else {
        await updatePlan(deactivateTarget.id, { is_active: true });
        toast.success(t('admin.plans.planReactivated'));
      }
      setDeactivateTarget(null);
      loadPlans();
    } catch (err) {
      if (err instanceof AdminApiError) {
        toast.error(err.message);
      } else {
        toast.error(t('admin.plans.failedToUpdateStatus'));
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 shadow-sm">
            <CreditCard className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-charcoal sm:text-2xl">{t('admin.plans.title')}</h1>
            <p className="text-sm text-kresna-gray">
              {t('admin.plans.subtitle')}
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
              className="gap-1.5 rounded-lg border border-kresna-border bg-kresna-light text-kresna-gray-dark hover:bg-kresna-light"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              <span className="hidden sm:inline">{t('admin.refresh')}</span>
            </Button>
          </div>
          <div>
            <Button
              size="sm"
              onClick={openCreateModal}
              className="gap-1.5 bg-primary-600 hover:bg-primary-700"
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
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-kresna-border bg-kresna-light py-16 text-center">
          <CreditCard className="mb-3 h-10 w-10 text-kresna-gray" />
          <p className="text-lg font-medium text-kresna-gray-dark">{t('admin.plans.title')}</p>
          <p className="mt-1 text-sm text-kresna-gray">{t('admin.plans.createFirstPlan')}</p>
          <Button
            size="sm"
            onClick={openCreateModal}
            className="mt-5 gap-1.5 bg-primary-600 hover:bg-primary-700"
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
              <h2 className="mb-4 text-lg font-semibold text-charcoal">
                {t('admin.plans.activePlans')}
                <span className="ml-2 text-sm font-normal text-kresna-gray">
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
              <h2 className="mb-4 text-lg font-semibold text-kresna-gray">
                {t('admin.plans.inactivePlans')}
                <span className="ml-2 text-sm font-normal text-kresna-gray">
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                {isEditMode ? (
                  <Edit className="h-4 w-4 text-primary-600" />
                ) : (
                  <Plus className="h-4 w-4 text-primary-600" />
                )}
              </div>
              {isEditMode ? t('admin.plans.editPlan') : t('admin.plans.createPlan')}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? t('admin.plans.editPlanDescription')
                : t('admin.plans.createPlanDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="plan-code">
                {t('admin.plans.planCode')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="plan-code"
                placeholder={t('admin.plans.planCodePlaceholder')}
                value={form.code}
                onChange={(e) => updateField('code', e.target.value.toLowerCase().replace(/\s/g, ''))}
                disabled={isEditMode}
                className={cn(
                  isEditMode && 'opacity-60 cursor-not-allowed',
                  fieldErrors.code && 'border-red-500/50 focus-visible:ring-red-500'
                )}
              />
              <p className="text-xs text-kresna-gray">
                {t('admin.plans.planCodeHint')}
              </p>
              {fieldErrors.code && <FieldError message={fieldErrors.code} />}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="plan-name">
                {t('admin.plans.displayName')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="plan-name"
                placeholder={t('admin.plans.displayNamePlaceholder')}
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={cn(fieldErrors.name && 'border-red-500/50 focus-visible:ring-red-500')}
              />
              {fieldErrors.name && <FieldError message={fieldErrors.name} />}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="plan-description">{t('admin.plans.descriptionLabel')}</Label>
              <textarea
                id="plan-description"
                placeholder={t('admin.plans.descriptionPlaceholder')}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={3}
                className="flex w-full rounded-lg border border-kresna-border bg-white px-3 py-2 text-sm text-charcoal placeholder:text-kresna-gray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-none"
              />
            </div>

            {/* Price & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan-price">
                  {t('admin.plans.priceCents')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="plan-price"
                  type="number"
                  placeholder={t('admin.plans.pricePlaceholder')}
                  min="0"
                  step="1"
                  value={form.price_cents}
                  onChange={(e) => updateField('price_cents', e.target.value)}
                  className={cn(fieldErrors.price_cents && 'border-red-500/50 focus-visible:ring-red-500')}
                />
                {form.price_cents && !fieldErrors.price_cents && form.currency && (
                  <p className="text-xs text-primary-600">
                    = {formatPrice(Number(form.price_cents) || 0, form.currency)}
                  </p>
                )}
                {fieldErrors.price_cents && <FieldError message={fieldErrors.price_cents} />}
              </div>

              <div className="space-y-2">
                <Label>
                  {t('admin.plans.currency')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.currency}
                  onValueChange={(val) => updateField('currency', val)}
                >
                  <SelectTrigger className={cn(fieldErrors.currency && 'border-red-500/50')}>
                    <SelectValue placeholder={t('admin.plans.selectPlaceholder')} />
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
                {t('admin.plans.billingPeriod')} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.billing_period}
                onValueChange={(val) => updateField('billing_period', val as 'monthly' | 'annual')}
              >
                <SelectTrigger className={cn(fieldErrors.billing_period && 'border-red-500/50')}>
                  <SelectValue placeholder={t('admin.plans.selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_PERIOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.billing_period && <FieldError message={fieldErrors.billing_period} />}
            </div>

            {/* Employee Limit */}
            <div className="space-y-3">
              <Label>{t('admin.plans.employeeLimit')}</Label>
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
                  className="h-4 w-4 rounded border-kresna-border bg-white"
                />
                <label htmlFor="unlimited-employees" className="text-sm text-kresna-gray-dark">
                  {t('admin.plans.unlimitedEmployees')}
                </label>
              </div>
              {!form.unlimited_employees && (
                <div>
                  <Input
                    type="number"
                    placeholder={t('admin.plans.employeeLimitPlaceholder')}
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
              <Label>{t('admin.plans.includedModules')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {MODULE_OPTIONS.map((mod) => (
                  <label
                    key={mod.key}
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-all duration-200',
                      form.included_modules[mod.key]
                        ? 'border-primary-500/40 bg-primary-50 text-primary-700'
                        : 'border-kresna-border bg-kresna-light text-kresna-gray hover:border-kresna-border hover:bg-kresna-light'
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
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-kresna-border bg-transparent'
                      )}
                    >
                      {form.included_modules[mod.key] && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    {t(mod.labelKey)}
                  </label>
                ))}
              </div>
            </div>

            {/* Active toggle (edit mode) */}
            {isEditMode && (
              <div className="flex items-center gap-2 rounded-lg border border-kresna-border bg-kresna-light p-3">
                <input
                  type="checkbox"
                  id="plan-active"
                  checked={form.is_active}
                  onChange={(e) => updateField('is_active', e.target.checked)}
                  className="h-4 w-4 rounded border-kresna-border bg-white"
                />
                <label htmlFor="plan-active" className="text-sm text-kresna-gray-dark">
                  {t('admin.plans.planIsActive')}
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
              className="text-kresna-gray hover:text-charcoal"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={isEditMode ? handleUpdate : handleCreate}
              disabled={isActionLoading}
              className="gap-2 bg-primary-600 hover:bg-primary-700"
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
                  deactivateTarget?.is_active ? 'bg-red-50' : 'bg-primary-50'
                )}
              >
                <Power
                  className={cn(
                    'h-4 w-4',
                    deactivateTarget?.is_active ? 'text-red-500' : 'text-primary-600'
                  )}
                />
              </div>
              {deactivateTarget?.is_active ? t('admin.plans.deactivatePlan') : t('admin.plans.reactivatePlan')}
            </DialogTitle>
            <DialogDescription>
              {deactivateTarget?.is_active
                ? t('admin.plans.deactivateConfirmation', { name: deactivateTarget.name })
                : t('admin.plans.reactivateConfirmation', { name: deactivateTarget?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeactivateTarget(null)}
              disabled={isActionLoading}
              className="text-kresna-gray hover:text-charcoal"
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
                  : 'bg-primary-600 hover:bg-primary-700'
              )}
            >
              {isActionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {deactivateTarget?.is_active ? t('admin.plans.deactivate') : t('admin.plans.reactivate')}
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
  const { t } = useTranslation();
  const enabledModules = Object.entries(plan.included_modules || {}).filter(
    ([, enabled]) => enabled
  );

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border p-5 transition-all duration-200',
        plan.is_active
          ? 'border-kresna-border bg-white shadow-sm hover:border-kresna-border hover:shadow-md'
          : 'border-kresna-border bg-kresna-light opacity-60 hover:opacity-80'
      )}
    >
      {/* Status badge */}
      <div className="mb-4 flex items-center justify-between">
        <Badge
          className={cn(
            'border text-xs',
            plan.is_active
              ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700'
              : 'border-kresna-border bg-kresna-light text-kresna-gray'
          )}
        >
          {plan.is_active ? t('admin.plans.active') : t('admin.plans.inactive')}
        </Badge>
        <code className="text-xs text-kresna-gray">{plan.code}</code>
      </div>

      {/* Plan name */}
      <h3 className="text-lg font-bold text-charcoal">{plan.name}</h3>

      {/* Price */}
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-primary-600">
          {formatPrice(plan.price_cents, plan.currency)}
        </span>
        <span className="text-sm text-kresna-gray">
          /{plan.billing_period === 'monthly' ? t('admin.plans.mo') : t('admin.plans.year')}
        </span>
      </div>

      {/* Description */}
      {plan.description && (
        <p className="mt-3 text-sm leading-relaxed text-kresna-gray">
          {plan.description}
        </p>
      )}

      {/* Employee limit */}
      <div className="mt-4 flex items-center gap-2 text-sm text-kresna-gray">
        {plan.employee_limit === null ? (
          <>
            <Infinity className="h-4 w-4 text-kresna-gray" />
            <span>{t('admin.plans.unlimitedEmployees')}</span>
          </>
        ) : (
          <>
            <Users className="h-4 w-4 text-kresna-gray" />
            <span>{t('admin.plans.upToEmployees', { count: plan.employee_limit })}</span>
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
                className="rounded-md border border-kresna-border bg-kresna-light px-2 py-0.5 text-xs text-kresna-gray-dark"
              >
                {mod ? t(mod.labelKey) : key}
              </span>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex items-center gap-2 border-t border-kresna-border pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(plan)}
          className="flex-1 gap-1.5 text-kresna-gray hover:bg-kresna-light hover:text-charcoal"
        >
          <Edit className="h-3.5 w-3.5" />
          {t('common.edit')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleActive(plan)}
          className={cn(
            'flex-1 gap-1.5',
            plan.is_active
              ? 'text-red-500 hover:bg-red-50 hover:text-red-600'
              : 'text-primary-600 hover:bg-primary-50 hover:text-primary-700'
          )}
        >
          <Power className="h-3.5 w-3.5" />
          {plan.is_active ? t('admin.plans.deactivate') : t('admin.plans.activate')}
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
      <div className="h-6 w-32 animate-pulse rounded bg-kresna-light" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-kresna-border bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex justify-between">
              <div className="h-5 w-16 rounded-full bg-kresna-light" />
              <div className="h-4 w-12 rounded bg-kresna-light" />
            </div>
            <div className="h-6 w-32 rounded bg-kresna-light" />
            <div className="mt-2 h-9 w-28 rounded bg-kresna-light" />
            <div className="mt-3 h-4 w-full rounded bg-kresna-light" />
            <div className="mt-4 h-4 w-40 rounded bg-kresna-light" />
            <div className="mt-4 flex gap-1.5">
              <div className="h-5 w-20 rounded bg-kresna-light" />
              <div className="h-5 w-16 rounded bg-kresna-light" />
            </div>
            <div className="mt-5 flex gap-2 border-t border-kresna-border pt-4">
              <div className="h-8 flex-1 rounded bg-kresna-light" />
              <div className="h-8 flex-1 rounded bg-kresna-light" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
