import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Calendar, Plus, Loader2, AlertCircle } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type { Location } from '@/types/roster';

interface CreateShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  locations: Location[];
  organizationSlug: string;
  defaultDate?: Date;
}

interface ShiftFormData {
  location_id: string;
  start_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  notes: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function CreateShiftModal({
  open,
  onOpenChange,
  onSuccess,
  locations,
  organizationSlug,
  defaultDate,
}: CreateShiftModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ShiftFormData>({
    location_id: '',
    start_date: defaultDate ? (defaultDate.toISOString().split('T')[0] ?? '') : (new Date().toISOString().split('T')[0] ?? ''),
    start_time: '09:00',
    end_time: '17:00',
    break_minutes: 30,
    notes: '',
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        location_id: locations[0]?.id || '',
        start_date: defaultDate ? (defaultDate.toISOString().split('T')[0] ?? '') : (new Date().toISOString().split('T')[0] ?? ''),
        start_time: '09:00',
        end_time: '17:00',
        break_minutes: 30,
        notes: '',
      });
      setError(null);
    }
  }, [open, defaultDate, locations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate form
      if (!formData.location_id) {
        throw new Error('Please select a location');
      }

      // Combine date and time into ISO timestamps
      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}:00`);
      const endDateTime = new Date(`${formData.start_date}T${formData.end_time}:00`);

      if (endDateTime <= startDateTime) {
        throw new Error('End time must be after start time');
      }

      // Create shift
      const response = await fetch(`${API_URL}/api/v1/org/${organizationSlug}/shifts`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: formData.location_id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          break_minutes: formData.break_minutes,
          notes: formData.notes || undefined,
          status: 'draft',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle compliance violations
        if (errorData.violations && Array.isArray(errorData.violations)) {
          const violationMessages = errorData.violations
            .map((v: any) => `• ${v.message}`)
            .join('\n');
          throw new Error(`Compliance violations:\n${violationMessages}`);
        }
        
        throw new Error(errorData.message || 'Failed to create shift');
      }
      
      // Success!
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Error creating shift:', err);
      setError(err instanceof Error ? err.message : 'Failed to create shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateDuration = () => {
    if (!formData.start_time || !formData.end_time) return null;
    
    const start = new Date(`2000-01-01T${formData.start_time}:00`);
    const end = new Date(`2000-01-01T${formData.end_time}:00`);
    
    if (end <= start) return null;
    
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const duration = calculateDuration();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-md border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600/20">
              <Plus className="h-4 w-4 text-primary-400" />
            </div>
            Create New Shift
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Schedule a new shift for your team. The shift will be created as a draft.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2 text-sm text-neutral-300">
                <MapPin className="h-3.5 w-3.5 text-neutral-500" />
                Location
              </Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) => setFormData({ ...formData, location_id: value })}
              >
                <SelectTrigger
                  id="location"
                  className="glass-card border-white/10 text-white focus:border-primary-500"
                >
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10">
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id} className="text-neutral-200">
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2 text-sm text-neutral-300">
                <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="glass-card border-white/10 text-white focus:border-primary-500"
                required
              />
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start-time" className="flex items-center gap-2 text-sm text-neutral-300">
                  <Clock className="h-3.5 w-3.5 text-neutral-500" />
                  Start Time
                </Label>
                <Input
                  id="start-time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="glass-card border-white/10 text-white focus:border-primary-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-time" className="text-sm text-neutral-300">
                  End Time
                </Label>
                <Input
                  id="end-time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="glass-card border-white/10 text-white focus:border-primary-500"
                  required
                />
              </div>
            </div>

            {/* Duration display */}
            {duration && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-primary-500/20 bg-primary-500/5 px-3 py-2"
              >
                <p className="text-xs text-primary-300">
                  <span className="font-medium">Duration:</span> {duration}
                  {formData.break_minutes > 0 && (
                    <span className="text-neutral-400"> (+ {formData.break_minutes}m break)</span>
                  )}
                </p>
              </motion.div>
            )}

            {/* Break Minutes */}
            <div className="space-y-2">
              <Label htmlFor="break" className="text-sm text-neutral-300">
                Break Duration (minutes)
              </Label>
              <Input
                id="break"
                type="number"
                min="0"
                step="5"
                value={formData.break_minutes}
                onChange={(e) => setFormData({ ...formData, break_minutes: parseInt(e.target.value) || 0 })}
                className="glass-card border-white/10 text-white focus:border-primary-500"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm text-neutral-300">
                Notes <span className="text-neutral-500">(optional)</span>
              </Label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="glass-card w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                rows={3}
                placeholder="Add any additional details..."
              />
            </div>

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
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-lg border border-white/5 bg-white/5 text-neutral-300 hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.location_id}
              className={cn(
                'gap-2 rounded-lg bg-primary-600 text-white hover:bg-primary-500',
                isSubmitting && 'cursor-not-allowed opacity-50'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Shift
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateShiftModal;
