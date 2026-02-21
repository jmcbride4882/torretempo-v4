import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Plus, Check, X, Clock, ArrowRight } from 'lucide-react';
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

async function fetchCorrections(slug: string) {
  const res = await fetch(`${API_BASE}/api/v1/org/${slug}/corrections`, { credentials: 'include' });
  if (!res.ok) throw new Error('corrections.fetchError');
  return res.json();
}

async function createCorrection(slug: string, data: any) {
  const res = await fetch(`${API_BASE}/api/v1/org/${slug}/corrections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('corrections.createError');
  return res.json();
}

async function approveCorrection(slug: string, id: string) {
  const res = await fetch(`${API_BASE}/api/v1/org/${slug}/corrections/${id}/approve`, {
    method: 'PATCH',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('corrections.approveError');
  return res.json();
}

async function rejectCorrection(slug: string, id: string, reason: string) {
  const res = await fetch(`${API_BASE}/api/v1/org/${slug}/corrections/${id}/reject`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ rejectionReason: reason }),
  });
  if (!res.ok) throw new Error('corrections.rejectError');
  return res.json();
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

export default function CorrectionsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'my' | 'pending'>('my');
  const [createOpen, setCreateOpen] = useState(false);
  const [correctionType, setCorrectionType] = useState('changeClockIn');
  const [requestedTime, setRequestedTime] = useState('');
  const [reason, setReason] = useState('');

  const { data: corrections = [], isLoading } = useQuery({
    queryKey: ['corrections', slug],
    queryFn: () => fetchCorrections(slug!),
    enabled: !!slug,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createCorrection(slug!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrections', slug] });
      toast.success(t('corrections.correctionCreated'));
      setCreateOpen(false);
      setReason('');
      setRequestedTime('');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveCorrection(slug!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrections', slug] });
      toast.success(t('corrections.correctionApproved'));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectCorrection(slug!, id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrections', slug] });
      toast.success(t('corrections.correctionRejected'));
    },
  });

  const correctionsList = Array.isArray(corrections) ? corrections : corrections.data || [];

  const tabs = [
    { key: 'my', label: t('corrections.myRequests') },
    { key: 'pending', label: t('corrections.pendingQueue') },
  ] as const;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <ClipboardCheck className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-charcoal tracking-tight">{t('corrections.title')}</h1>
            <p className="text-sm text-kresna-gray">{t('corrections.title')}</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} variant="gradient" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          {t('corrections.requestCorrection')}
        </Button>
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

      {/* Corrections list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-kresna-light border border-kresna-border animate-pulse" />
          ))}
        </div>
      ) : correctionsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-kresna-border bg-kresna-light px-6 py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
            <ClipboardCheck className="h-8 w-8 text-primary-600" />
          </div>
          <p className="text-lg font-semibold text-charcoal mb-1">{t('corrections.noCorrections')}</p>
          <Button variant="gradient" onClick={() => setCreateOpen(true)} className="gap-1.5 mt-6">
            <Plus className="h-4 w-4" />
            {t('corrections.requestCorrection')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {correctionsList.map((req: any) => (
            <div
              key={req.id}
              className="rounded-2xl border border-kresna-border bg-white p-5 shadow-card hover:shadow-kresna transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border',
                      statusStyles[req.status] || statusStyles.pending
                    )}>
                      {t(`common.${req.status}` as any) || req.status}
                    </span>
                    <span className="text-xs text-kresna-gray">
                      {new Date(req.createdAt || req.requestedAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Original → Requested time display */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-xl bg-kresna-light px-3 py-2 border border-kresna-border">
                      <Clock className="h-4 w-4 text-kresna-gray" />
                      <span className="text-sm font-medium text-kresna-gray-dark">
                        {req.originalClockIn
                          ? new Date(req.originalClockIn).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-kresna-border shrink-0" />
                    <div className="flex items-center gap-2 rounded-xl bg-primary-50 px-3 py-2 border border-primary-200">
                      <Clock className="h-4 w-4 text-primary-600" />
                      <span className="text-sm font-semibold text-primary-700">
                        {req.requestedClockIn
                          ? new Date(req.requestedClockIn).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </span>
                    </div>
                  </div>

                  {req.reason && (
                    <p className="text-sm text-kresna-gray">{req.reason}</p>
                  )}
                </div>

                {tab === 'pending' && req.status === 'pending' && (
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
            <DialogTitle className="text-xl">{t('corrections.requestCorrection')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-kresna-gray-dark mb-2 block">
                {t('corrections.correctionType')}
              </label>
              <Select value={correctionType} onValueChange={setCorrectionType}>
                <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="changeClockIn">{t('corrections.types.changeClockIn')}</SelectItem>
                  <SelectItem value="changeClockOut">{t('corrections.types.changeClockOut')}</SelectItem>
                  <SelectItem value="addClockOut">{t('corrections.types.addClockOut')}</SelectItem>
                  <SelectItem value="addBreak">{t('corrections.types.addBreak')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-kresna-gray-dark mb-2 block">
                {t('corrections.requested')}
              </label>
              <Input
                type="datetime-local"
                value={requestedTime}
                onChange={(e) => setRequestedTime(e.target.value)}
                className="rounded-xl h-12"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-kresna-gray-dark mb-2 block">
                {t('corrections.reason')} <span className="text-red-500">*</span>
              </label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('corrections.reasonRequired')}
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
              onClick={() => createMutation.mutate({ correctionType, requestedTime, reason })}
              disabled={!reason || !requestedTime}
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
