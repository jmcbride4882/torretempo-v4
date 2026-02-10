import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Plus, Pencil, Trash2, Copy } from 'lucide-react';
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
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function fetchTemplates(slug: string) {
  const res = await fetch(`${API_BASE}/api/v1/org/${slug}/shift-templates`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch templates');
  return res.json();
}

async function createTemplate(slug: string, data: any) {
  const res = await fetch(`${API_BASE}/api/v1/org/${slug}/shift-templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create template');
  return res.json();
}

async function updateTemplate(slug: string, id: string, data: any) {
  const res = await fetch(`${API_BASE}/api/v1/org/${slug}/shift-templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update template');
  return res.json();
}

async function deleteTemplate(slug: string, id: string) {
  const res = await fetch(`${API_BASE}/api/v1/org/${slug}/shift-templates/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete template');
  return res.json();
}

export default function ShiftTemplatesPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [breakMinutes, setBreakMinutes] = useState('30');
  const [role, setRole] = useState('');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['shift-templates', slug],
    queryFn: () => fetchTemplates(slug!),
    enabled: !!slug,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createTemplate(slug!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-templates', slug] });
      toast.success(t('common.success'));
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTemplate(slug!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-templates', slug] });
      toast.success(t('common.success'));
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(slug!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-templates', slug] });
      toast.success(t('common.success'));
    },
  });

  const templateList = Array.isArray(templates) ? templates : templates.data || [];

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setName('');
    setStartTime('');
    setEndTime('');
    setBreakMinutes('30');
    setRole('');
  }

  function openCreate() {
    closeDialog();
    setDialogOpen(true);
  }

  function openEdit(tpl: any) {
    setEditingId(tpl.id);
    setName(tpl.name || '');
    setStartTime(tpl.startTime || '');
    setEndTime(tpl.endTime || '');
    setBreakMinutes(String(tpl.breakMinutes || 30));
    setRole(tpl.role || '');
    setDialogOpen(true);
  }

  function handleSubmit() {
    const data = { name, startTime, endTime, breakMinutes: Number(breakMinutes), role };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('templates.title')}</h1>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {t('templates.createTemplate')}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : templateList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Clock className="h-8 w-8 text-zinc-400" />
          </div>
          <p className="text-zinc-500">{t('templates.noTemplates')}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templateList.map((tpl: any) => (
            <Card key={tpl.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-zinc-900">{tpl.name}</h3>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tpl)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteMutation.mutate(tpl.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-zinc-700">{tpl.startTime} - {tpl.endTime}</span>
                </div>
                {tpl.breakMinutes && (
                  <p className="text-zinc-500">{t('templates.breakMinutes', { minutes: tpl.breakMinutes })}</p>
                )}
                {tpl.role && (
                  <Badge variant="secondary">{tpl.role}</Badge>
                )}
              </div>
              <Button variant="outline" size="sm" className="w-full mt-4">
                <Copy className="h-3.5 w-3.5 mr-2" />
                {t('templates.applyToRoster')}
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? t('templates.editTemplate') : t('templates.createTemplate')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-zinc-700 mb-1.5 block">{t('common.name')}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('templates.namePlaceholder')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-zinc-700 mb-1.5 block">{t('templates.startTime')}</label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700 mb-1.5 block">{t('templates.endTime')}</label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 mb-1.5 block">{t('templates.break')}</label>
              <Input type="number" value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} min="0" max="120" />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 mb-1.5 block">{t('templates.role')}</label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder={t('common.optional')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={!name || !startTime || !endTime}>
              {editingId ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
