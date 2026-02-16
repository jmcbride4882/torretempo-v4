import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Check, AlertTriangle } from 'lucide-react';
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
import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function fetchPlan(slug: string) {
  const res = await fetch(`${API_BASE}/api/v1/org/${slug}/billing/plan`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch plan');
  return res.json();
}

async function fetchPlans(slug: string) {
  const res = await fetch(`${API_BASE}/api/v1/org/${slug}/billing/plans`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch plans');
  return res.json();
}

async function changePlan(slug: string, planId: string) {
  const res = await fetch(`${API_BASE}/api/v1/org/${slug}/billing/change-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ planId }),
  });
  if (!res.ok) throw new Error('Failed to change plan');
  return res.json();
}

async function cancelSubscription(slug: string, reason?: string) {
  const res = await fetch(`${API_BASE}/api/v1/org/${slug}/billing/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error('Failed to cancel');
  return res.json();
}

export default function BillingPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data: currentPlan } = useQuery({
    queryKey: ['billing-plan', slug],
    queryFn: () => fetchPlan(slug!),
    enabled: !!slug,
  });

  const { data: availablePlans = [] } = useQuery({
    queryKey: ['billing-plans', slug],
    queryFn: () => fetchPlans(slug!),
    enabled: !!slug,
  });

  const changeMutation = useMutation({
    mutationFn: (planId: string) => changePlan(slug!, planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-plan', slug] });
      toast.success(t('common.success'));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelSubscription(slug!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-plan', slug] });
      toast.success(t('common.success'));
      setCancelOpen(false);
    },
  });

  const plans = Array.isArray(availablePlans) ? availablePlans : availablePlans.plans || [];
  const plan = currentPlan || {};

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('billing.title')}</h1>
      </div>

      {/* Current plan */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-primary-500" />
            {t('billing.currentPlan')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-2xl font-bold text-zinc-900">{plan.name || t('billing.free')}</p>
              {plan.priceCents && (
                <p className="text-zinc-500">
                  {(plan.priceCents / 100).toFixed(2)} {t('billing.perUserMonth')}
                </p>
              )}
            </div>
            <Badge variant="success">{t('common.active')}</Badge>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-zinc-500">{t('billing.usage')}</span>
              <span className="font-medium text-zinc-900">
                {t('billing.employeesUsed', { used: plan.employeeCount || 0, limit: plan.maxEmployees || t('billing.unlimited') })}
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary-500"
                style={{ width: plan.maxEmployees ? `${Math.min(100, ((plan.employeeCount || 0) / plan.maxEmployees) * 100)}%` : '10%' }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available plans */}
      <h2 className="section-title">{t('billing.changePlan')}</h2>
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {plans.map((p: any) => {
          const isCurrent = p.id === plan.id || p.slug === plan.slug;
          return (
            <Card key={p.id} className={cn('p-6', isCurrent && 'ring-2 ring-primary-500')}>
              {p.slug === 'profesional' && (
                <Badge className="mb-3">{t('billing.recommended')}</Badge>
              )}
              <h3 className="text-lg font-bold text-zinc-900">{p.name}</h3>
              <p className="text-3xl font-bold text-zinc-900 mt-2">
                {p.priceCents ? `${(p.priceCents / 100).toFixed(2)}` : t('billing.free')}
                <span className="text-sm font-normal text-zinc-500">{t('billing.perUserMonth')}</span>
              </p>
              <ul className="mt-4 space-y-2">
                {(p.features || []).map((f: string, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-zinc-600">
                    <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full mt-6"
                variant={isCurrent ? 'outline' : 'default'}
                disabled={isCurrent}
                onClick={() => changeMutation.mutate(p.id)}
              >
                {isCurrent ? t('billing.currentLabel') : t('billing.changePlan')}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Cancel */}
      <Card className="border-red-200">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="font-medium text-zinc-900">{t('billing.cancelSubscription')}</p>
            <p className="text-sm text-zinc-500">{t('billing.cancelWarning')}</p>
          </div>
          <Button variant="destructive" onClick={() => setCancelOpen(true)}>
            {t('billing.cancelSubscription')}
          </Button>
        </CardContent>
      </Card>

      {/* Cancel confirmation dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {t('billing.cancelConfirm')}
            </DialogTitle>
            <DialogDescription>{t('billing.cancelWarning')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={() => cancelMutation.mutate()}>
              {t('billing.cancelSubscription')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
