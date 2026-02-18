import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Plus, Check, X, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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

const statusVariant: Record<string, 'warning' | 'success' | 'destructive' | 'secondary'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
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
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('corrections.title')}</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {t('corrections.requestCorrection')}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              tab === item.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Corrections list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      ) : correctionsList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <ClipboardCheck className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-slate-500">{t('corrections.noCorrections')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {correctionsList.map((req: any) => (
            <Card key={req.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant[req.status] || 'secondary'}>
                      {t(`common.${req.status}` as any) || req.status}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {new Date(req.createdAt || req.requestedAt).toLocaleDateString('es-ES')}
                    </span>
                  </div>

                  {/* Original vs Requested */}
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{req.originalClockIn ? new Date(req.originalClockIn).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                    <div className="flex items-center gap-1.5 text-primary-600 font-medium">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{req.requestedClockIn ? new Date(req.requestedClockIn).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                    </div>
                  </div>

                  {req.reason && (
                    <p className="text-sm text-slate-500">{req.reason}</p>
                  )}
                </div>

                {tab === 'pending' && req.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => approveMutation.mutate(req.id)}
                      className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectMutation.mutate({ id: req.id, reason: t('common.rejected') })}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('corrections.requestCorrection')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('corrections.correctionType')}</label>
              <Select value={correctionType} onValueChange={setCorrectionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="changeClockIn">{t('corrections.types.changeClockIn')}</SelectItem>
                  <SelectItem value="changeClockOut">{t('corrections.types.changeClockOut')}</SelectItem>
                  <SelectItem value="addClockOut">{t('corrections.types.addClockOut')}</SelectItem>
                  <SelectItem value="addBreak">{t('corrections.types.addBreak')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('corrections.requested')}</label>
              <Input type="datetime-local" value={requestedTime} onChange={(e) => setRequestedTime(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                {t('corrections.reason')} <span className="text-red-500">*</span>
              </label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('corrections.reasonRequired')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => createMutation.mutate({ correctionType, requestedTime, reason })}
              disabled={!reason || !requestedTime}
            >
              {t('common.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
