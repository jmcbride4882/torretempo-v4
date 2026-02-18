import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Clock, MapPin, Loader2, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';

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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import type { Location } from '@/types/roster';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ShiftTemplate {
  id: string;
  name: string;
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  break_minutes: number;
  location_id: string | null;
  location_name?: string | null;
  color: string | null;
  is_active: boolean;
}

interface ShiftTemplateFormData {
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  location_id: string | null;
  color: string;
}

interface ShiftTemplateManagerProps {
  organizationSlug: string;
}

export function ShiftTemplateManager({ organizationSlug }: ShiftTemplateManagerProps) {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<ShiftTemplate | null>(null);

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/org/${organizationSlug}/shift-templates`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch shift templates');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error(t('templates.fetchFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch locations
  const fetchLocations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/org/${organizationSlug}/locations`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }

      const data = await response.json();
      setLocations(data.locations || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchLocations();
  }, [organizationSlug]);

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    fetchTemplates();
    toast.success(t('templates.createSuccess'));
  };

  const handleEditSuccess = () => {
    setEditingTemplate(null);
    fetchTemplates();
    toast.success(t('templates.updateSuccess'));
  };

  const handleDelete = async (template: ShiftTemplate) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/org/${organizationSlug}/shift-templates/${template.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      setDeletingTemplate(null);
      fetchTemplates();
      toast.success(t('templates.deleteSuccess'));
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error(t('templates.deleteFailed'));
    }
  };

  const calculateDuration = (startTime: string, endTime: string, breakMinutes: number): string => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = (startHour ?? 0) * 60 + (startMin ?? 0);
    const endMinutes = (endHour ?? 0) * 60 + (endMin ?? 0);
    const totalMinutes = endMinutes - startMinutes - breakMinutes;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-400">{t('templates.loadingTemplates')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{t('templates.title')}</h3>
          <p className="text-sm text-slate-500">{t('templates.subtitle')}</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('templates.newTemplate')}
        </Button>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Clock className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">{t('templates.noTemplatesTitle')}</h3>
          <p className="mb-6 text-sm text-slate-500">
            {t('templates.noTemplatesDescription')}
          </p>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('templates.createFirst')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'group relative overflow-hidden rounded-xl border bg-white p-4 shadow-sm transition-all hover:bg-slate-50',
                  'border-slate-200 hover:border-slate-300'
                )}
              >
                {/* Color indicator */}
                {template.color && (
                  <div
                    className="absolute left-0 top-0 h-full w-1"
                    style={{ backgroundColor: template.color }}
                  />
                )}

                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{template.name}</h4>
                      {template.location_name && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="h-3 w-3" />
                          <span>{template.location_name}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTemplate(template)}
                        className="h-8 w-8 p-0 hover:bg-slate-100"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingTemplate(template)}
                        className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Time details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span>
                        {template.start_time} - {template.end_time}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {template.break_minutes > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {t('templates.breakBadge', { minutes: template.break_minutes })}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {t('templates.workBadge', { duration: calculateDuration(template.start_time, template.end_time, template.break_minutes) })}
                      </Badge>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Modal */}
      <TemplateFormModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleCreateSuccess}
        locations={locations}
        organizationSlug={organizationSlug}
        isLoadingLocations={isLoadingLocations}
      />

      {/* Edit Modal */}
      {editingTemplate && (
        <TemplateFormModal
          open={true}
          onOpenChange={() => setEditingTemplate(null)}
          onSuccess={handleEditSuccess}
          locations={locations}
          organizationSlug={organizationSlug}
          isLoadingLocations={isLoadingLocations}
          editingTemplate={editingTemplate}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
        <DialogContent className="border-slate-200 bg-white">
          <DialogHeader>
            <DialogTitle className="text-slate-900">{t('templates.deleteTitle')}</DialogTitle>
            <DialogDescription className="text-slate-500">
              {t('templates.deleteConfirmMessage', { name: deletingTemplate?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingTemplate(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingTemplate && handleDelete(deletingTemplate)}
            >
              {t('templates.deleteButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// TEMPLATE FORM MODAL
// ============================================================================

interface TemplateFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  locations: Location[];
  organizationSlug: string;
  isLoadingLocations: boolean;
  editingTemplate?: ShiftTemplate;
}

function TemplateFormModal({
  open,
  onOpenChange,
  onSuccess,
  locations,
  organizationSlug,
  isLoadingLocations,
  editingTemplate,
}: TemplateFormModalProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ShiftTemplateFormData>({
    name: '',
    start_time: '09:00',
    end_time: '17:00',
    break_minutes: 30,
    location_id: null,
    color: '#10b981', // Emerald-500
  });

  // Reset/populate form when modal opens
  useEffect(() => {
    if (open) {
      if (editingTemplate) {
        setFormData({
          name: editingTemplate.name,
          start_time: editingTemplate.start_time,
          end_time: editingTemplate.end_time,
          break_minutes: editingTemplate.break_minutes,
          location_id: editingTemplate.location_id,
          color: editingTemplate.color || '#10b981',
        });
      } else {
        setFormData({
          name: '',
          start_time: '09:00',
          end_time: '17:00',
          break_minutes: 30,
          location_id: locations[0]?.id || null,
          color: '#10b981',
        });
      }
      setError(null);
    }
  }, [open, editingTemplate, locations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate
      if (!formData.name.trim()) {
        throw new Error(t('templates.templateNameRequired'));
      }

      // Validate time format (HH:mm)
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(formData.start_time)) {
        throw new Error(t('templates.invalidStartTime'));
      }
      if (!timeRegex.test(formData.end_time)) {
        throw new Error(t('templates.invalidEndTime'));
      }

      // Validate break minutes
      if (formData.break_minutes < 0 || formData.break_minutes > 120) {
        throw new Error(t('templates.breakMinutesRange'));
      }

      const url = editingTemplate
        ? `${API_URL}/api/v1/org/${organizationSlug}/shift-templates/${editingTemplate.id}`
        : `${API_URL}/api/v1/org/${organizationSlug}/shift-templates`;

      const response = await fetch(url, {
        method: editingTemplate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingTemplate ? 'update' : 'create'} template`);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-200 bg-white sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-slate-900">
              {editingTemplate ? t('templates.editTitle') : t('templates.createTitle')}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {editingTemplate
                ? t('templates.editDescription')
                : t('templates.createDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <p className="text-sm text-red-600">{error}</p>
              </motion.div>
            )}

            {/* Template name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-700">
                {t('templates.name')} *
              </Label>
              <Input
                id="name"
                placeholder={t('templates.templateNamePlaceholder')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                required
              />
            </div>

            {/* Time range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time" className="text-slate-700">
                  {t('templates.startTimeRequired')} *
                </Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="border-slate-200 bg-white text-slate-900"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time" className="text-slate-700">
                  {t('templates.endTimeRequired')} *
                </Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="border-slate-200 bg-white text-slate-900"
                  required
                />
              </div>
            </div>

            {/* Break minutes */}
            <div className="space-y-2">
              <Label htmlFor="break_minutes" className="text-slate-700">
                {t('templates.breakMinutes')}
              </Label>
              <Input
                id="break_minutes"
                type="number"
                min="0"
                max="120"
                value={formData.break_minutes}
                onChange={(e) => setFormData({ ...formData, break_minutes: parseInt(e.target.value) || 0 })}
                className="border-slate-200 bg-white text-slate-900"
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-slate-700">
                {t('templates.defaultLocation')}
              </Label>
              <Select
                value={formData.location_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, location_id: value === 'none' ? null : value })}
                disabled={isLoadingLocations}
              >
                <SelectTrigger className="border-slate-200 bg-white text-slate-900">
                  <SelectValue placeholder={isLoadingLocations ? t('common.loading') : t('templates.selectLocation')} />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white">
                  <SelectItem value="none">{t('templates.noDefaultLocation')}</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color picker */}
            <div className="space-y-2">
              <Label htmlFor="color" className="text-slate-700">
                {t('templates.colorLabel')}
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-10 w-20 cursor-pointer border-slate-200 bg-white"
                />
                <span className="text-sm text-slate-500">{formData.color}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {editingTemplate ? t('templates.updating') : t('templates.creating')}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {editingTemplate ? t('templates.updateButton') : t('templates.createButton')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
