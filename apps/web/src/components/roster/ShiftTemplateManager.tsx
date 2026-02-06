import { useState, useEffect } from 'react';
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
      toast.error('Failed to load shift templates');
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
    toast.success('Shift template created successfully');
  };

  const handleEditSuccess = () => {
    setEditingTemplate(null);
    fetchTemplates();
    toast.success('Shift template updated successfully');
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
      toast.success('Shift template deleted successfully');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
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
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        <span className="ml-2 text-sm text-neutral-400">Loading templates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-200">Shift Templates</h3>
          <p className="text-sm text-neutral-400">Reusable shift definitions for quick scheduling</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center backdrop-blur-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800/50">
            <Clock className="h-8 w-8 text-neutral-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-neutral-200">No templates yet</h3>
          <p className="mb-6 text-sm text-neutral-400">
            Create shift templates to speed up your scheduling workflow
          </p>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create First Template
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
                  'group relative overflow-hidden rounded-xl border bg-zinc-900/50 p-4 backdrop-blur-sm transition-all hover:bg-zinc-900/80',
                  'border-zinc-800 hover:border-zinc-700'
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
                      <h4 className="font-semibold text-neutral-200">{template.name}</h4>
                      {template.location_name && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
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
                        className="h-8 w-8 p-0 hover:bg-zinc-800"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingTemplate(template)}
                        className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Time details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-neutral-300">
                      <Clock className="h-4 w-4 text-neutral-500" />
                      <span>
                        {template.start_time} - {template.end_time}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {template.break_minutes > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {template.break_minutes}m break
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {calculateDuration(template.start_time, template.end_time, template.break_minutes)} work
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
        <DialogContent className="border-zinc-800 bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-neutral-200">Delete Shift Template</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Are you sure you want to delete &quot;{deletingTemplate?.name}&quot;? This will deactivate the template and it will no longer appear in the list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingTemplate(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingTemplate && handleDelete(deletingTemplate)}
            >
              Delete Template
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
        throw new Error('Template name is required');
      }

      // Validate time format (HH:mm)
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(formData.start_time)) {
        throw new Error('Invalid start time format. Use HH:mm (e.g., 09:00)');
      }
      if (!timeRegex.test(formData.end_time)) {
        throw new Error('Invalid end time format. Use HH:mm (e.g., 17:00)');
      }

      // Validate break minutes
      if (formData.break_minutes < 0 || formData.break_minutes > 120) {
        throw new Error('Break minutes must be between 0 and 120');
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
      <DialogContent className="border-zinc-800 bg-zinc-900 sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-neutral-200">
              {editingTemplate ? 'Edit Shift Template' : 'Create Shift Template'}
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              {editingTemplate
                ? 'Update the shift template details below.'
                : 'Create a reusable shift template for quick scheduling.'}
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
                <p className="text-sm text-red-300">{error}</p>
              </motion.div>
            )}

            {/* Template name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-neutral-300">
                Template Name *
              </Label>
              <Input
                id="name"
                placeholder="e.g., Morning Shift, Night Shift"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border-zinc-800 bg-zinc-950 text-neutral-200 placeholder:text-neutral-500"
                required
              />
            </div>

            {/* Time range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time" className="text-neutral-300">
                  Start Time *
                </Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="border-zinc-800 bg-zinc-950 text-neutral-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time" className="text-neutral-300">
                  End Time *
                </Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="border-zinc-800 bg-zinc-950 text-neutral-200"
                  required
                />
              </div>
            </div>

            {/* Break minutes */}
            <div className="space-y-2">
              <Label htmlFor="break_minutes" className="text-neutral-300">
                Break Minutes
              </Label>
              <Input
                id="break_minutes"
                type="number"
                min="0"
                max="120"
                value={formData.break_minutes}
                onChange={(e) => setFormData({ ...formData, break_minutes: parseInt(e.target.value) || 0 })}
                className="border-zinc-800 bg-zinc-950 text-neutral-200"
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-neutral-300">
                Default Location (Optional)
              </Label>
              <Select
                value={formData.location_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, location_id: value === 'none' ? null : value })}
                disabled={isLoadingLocations}
              >
                <SelectTrigger className="border-zinc-800 bg-zinc-950 text-neutral-200">
                  <SelectValue placeholder={isLoadingLocations ? 'Loading...' : 'Select location'} />
                </SelectTrigger>
                <SelectContent className="border-zinc-800 bg-zinc-900">
                  <SelectItem value="none">No default location</SelectItem>
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
              <Label htmlFor="color" className="text-neutral-300">
                Color
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-10 w-20 cursor-pointer border-zinc-800 bg-zinc-950"
                />
                <span className="text-sm text-neutral-400">{formData.color}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {editingTemplate ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
