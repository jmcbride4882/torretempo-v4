import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarOff, Plus, Check, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function fetchLeave(slug: string) {
  const res = await fetch(`${API_BASE}/api/v1/org/${slug}/leave-requests`, { credentials: 'include' });
  if (!res.ok) throw new Error('leave.fetchError');
  return res.json();
}

async function createLeave(slug: string, data: any) {
  const res = await fetch(`${API_BASE}/api/v1/org/${slug}/leave-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('leave.createError');
  return res.json();
}

async function approveLeave(slug: string, id: string) {
  const res = await fetch(`${API_BASE}/api/v1/org/${slug}/leave-requests/${id}/approve`, {
    method: 'PATCH',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('leave.approveError');
  return res.json();
}

async function rejectLeave(slug: string, id: string, reason: string) {
  const res = await fetch(`${API_BASE}/api/v1/org/${slug}/leave-requests/${id}/reject`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ rejectionReason: reason }),
  });
  if (!res.ok) throw new Error('leave.rejectError');
  return res.json();
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-kresna-light text-kresna-gray-dark border-kresna-border',
};

export default function LeavePage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'my' | 'team'>('my');
  const [createOpen, setCreateOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('vacation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const { data: leaveRequests = [], isLoading } = useQuery({
    queryKey: ['leave', slug],
    queryFn: () => fetchLeave(slug!),
    enabled: !!slug,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createLeave(slug!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave', slug] });
      toast.success(t('leave.leaveCreated'));
      setCreateOpen(false);
      setStartDate('');
      setEndDate('');
      setReason('');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveLeave(slug!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave', slug] });
      toast.success(t('leave.leaveApproved'));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectLeave(slug!, id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave', slug] });
      toast.success(t('leave.leaveRejected'));
    },
  });

  const requests = Array.isArray(leaveRequests) ? leaveRequests : leaveRequests.data || [];

  const tabs = [
    { key: 'my', label: t('leave.myRequests') },
    { key: 'team', label: t('leave.teamRequests') },
  ] as const;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <Calendar className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-charcoal tracking-tight">{t('leave.title')}</h1>
            <p className="text-sm text-kresna-gray">{t('leave.title')}</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} variant="gradient" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          {t('leave.requestLeave')}
        </Button>
      </div>

      {/* Leave balance card */}
      <div className="rounded-3xl border border-kresna-border bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-kresna-gray">{t('team.vacationDays')}</p>
            <p className="text-3xl font-bold text-charcoal tracking-tight mt-1">
              18 <span className="text-base font-normal text-kresna-gray">/ 22 {t('common.days')}</span>
            </p>
          </div>
          <div className="w-40">
            <div className="h-3 rounded-full bg-kresna-light overflow-hidden">
              <div className="h-full rounded-full bg-primary-500" style={{ width: '82%' }} />
            </div>
            <p className="text-xs text-kresna-gray mt-1.5 text-right">18 {t('team.available').toLowerCase()}</p>
          </div>
        </div>
      </div>

      {/* Pill tabs */}
      <div className="flex gap-1 rounded-full bg-kresna-light p-1 w-fit">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              'px-5 py-2 text-sm font-medium rounded-full transition-all min-h-touch',
              tab === item.key
                ? 'bg-white text-charcoal shadow-sm'
                : 'text-kresna-gray hover:text-kresna-gray-dark'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Requests list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-kresna-light border border-kresna-border animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-kresna-border bg-kresna-light px-6 py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
            <CalendarOff className="h-8 w-8 text-primary-600" />
          </div>
          <p className="text-lg font-semibold text-charcoal mb-1">{t('leave.noLeave')}</p>
          <Button variant="gradient" onClick={() => setCreateOpen(true)} className="gap-1.5 mt-6">
            <Plus className="h-4 w-4" />
            {t('leave.requestLeave')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any) => (
            <div
              key={req.id}
              className="rounded-2xl border border-kresna-border bg-white p-5 shadow-card hover:shadow-kresna transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border',
                      statusStyles[req.status] || statusStyles.cancelled
                    )}>
                      {t(`common.${req.status}` as any) || req.status}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-kresna-light px-2.5 py-1 text-xs font-medium text-kresna-gray-dark border border-kresna-border">
                      {t(`leave.types.${req.leaveType}` as any) || req.leaveType}
                    </span>
                  </div>
                  <p className="text-sm text-charcoal font-semibold">
                    {new Date(req.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    {' — '}
                    {new Date(req.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  {req.reason && <p className="text-sm text-kresna-gray">{req.reason}</p>}
                </div>
                {tab === 'team' && req.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => approveMutation.mutate(req.id)}
                      className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => rejectMutation.mutate({ id: req.id, reason: t('common.rejected') })}
                      className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">{t('leave.requestLeave')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-kresna-gray-dark mb-2 block">{t('leave.leaveType')}</label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">{t('leave.types.vacation')}</SelectItem>
                  <SelectItem value="sick">{t('leave.types.sick')}</SelectItem>
                  <SelectItem value="personal">{t('leave.types.personal')}</SelectItem>
                  <SelectItem value="unpaid">{t('leave.types.unpaid')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-kresna-gray-dark mb-2 block">{t('common.startDate')}</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl h-12" />
              </div>
              <div>
                <label className="text-sm font-medium text-kresna-gray-dark mb-2 block">{t('common.endDate')}</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl h-12" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-kresna-gray-dark mb-2 block">{t('leave.reason')}</label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('common.optional')}
                className="rounded-xl h-12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">
              {t('common.cancel')}
            </Button>
            <Button
              variant="gradient"
              onClick={() => createMutation.mutate({ leaveType, startDate, endDate, reason })}
              disabled={!startDate || !endDate}
              className="rounded-xl"
            >
              {t('common.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
