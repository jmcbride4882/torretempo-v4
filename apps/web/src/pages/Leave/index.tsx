import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarOff, Plus, Check, X } from 'lucide-react';
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

const statusVariant: Record<string, 'warning' | 'success' | 'destructive' | 'secondary'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  cancelled: 'secondary',
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
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('leave.title')}</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {t('leave.requestLeave')}
        </Button>
      </div>

      {/* Leave balance */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{t('team.vacationDays')}</p>
            <p className="text-2xl font-bold text-slate-900">18 <span className="text-sm font-normal text-slate-400">/ 22 {t('common.days')}</span></p>
          </div>
          <div className="w-32">
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-primary-500" style={{ width: '82%' }} />
            </div>
            <p className="text-xs text-slate-400 mt-1 text-right">18 {t('team.available').toLowerCase()}</p>
          </div>
        </div>
      </Card>

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

      {/* Requests list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <CalendarOff className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-slate-500">{t('leave.noLeave')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any) => (
            <Card key={req.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={statusVariant[req.status] || 'secondary'}>
                      {t(`common.${req.status}` as any) || req.status}
                    </Badge>
                    <Badge variant="ghost">
                      {t(`leave.types.${req.leaveType}` as any) || req.leaveType}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-900 font-medium">
                    {new Date(req.startDate).toLocaleDateString('es-ES')} - {new Date(req.endDate).toLocaleDateString('es-ES')}
                  </p>
                  {req.reason && <p className="text-sm text-slate-500 mt-1">{req.reason}</p>}
                </div>
                {tab === 'team' && req.status === 'pending' && (
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
            <DialogTitle>{t('leave.requestLeave')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('leave.leaveType')}</label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('common.startDate')}</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('common.endDate')}</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('leave.reason')}</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('common.optional')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => createMutation.mutate({ leaveType, startDate, endDate, reason })}
              disabled={!startDate || !endDate}
            >
              {t('common.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
