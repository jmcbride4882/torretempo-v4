import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, MapPin, Loader2, AlertCircle, Check, Map } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MapPicker } from './MapPicker';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Location {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  lat: string | null;
  lng: string | null;
  geofence_radius: number | null;
  created_at: string;
}

interface LocationFormData {
  name: string;
  address: string;
  lat: string;
  lng: string;
  geofence_radius: string;
}

interface LocationManagerProps {
  organizationSlug: string;
}

export function LocationManager({ organizationSlug }: LocationManagerProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);

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
      toast.error('Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [organizationSlug]);

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    fetchLocations();
    toast.success('Location created successfully');
  };

  const handleEditSuccess = () => {
    setEditingLocation(null);
    fetchLocations();
    toast.success('Location updated successfully');
  };

  const handleDelete = async (location: Location) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/org/${organizationSlug}/locations/${location.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete location');
      }

      setDeletingLocation(null);
      fetchLocations();
      toast.success('Location deleted successfully');
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error('Failed to delete location');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        <span className="ml-2 text-sm text-zinc-400">Loading locations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">Locations</h3>
          <p className="text-sm text-zinc-500">Manage work sites and geofencing for clock-ins</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Location
        </Button>
      </div>

      {/* Locations Grid */}
      {locations.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
            <MapPin className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-zinc-900">No locations yet</h3>
          <p className="mb-6 text-sm text-zinc-500">
            Add locations to track where employees work and enable geofencing
          </p>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create First Location
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {locations.map((location, index) => (
              <motion.div
                key={location.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'group relative overflow-hidden rounded-xl border bg-white p-4 transition-all hover:bg-zinc-50',
                  'border-zinc-200 hover:border-zinc-300'
                )}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-zinc-900">{location.name}</h4>
                      {location.address && (
                        <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
                          {location.address}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingLocation(location)}
                        className="h-8 w-8 p-0 hover:bg-zinc-100"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingLocation(location)}
                        className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2">
                    {location.lat && location.lng && (
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Map className="h-3.5 w-3.5 text-zinc-400" />
                        <span>
                          {parseFloat(location.lat).toFixed(6)}, {parseFloat(location.lng).toFixed(6)}
                        </span>
                      </div>
                    )}

                    {location.geofence_radius && (
                      <Badge variant="outline" className="text-xs">
                        {location.geofence_radius}m geofence
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Modal */}
      <LocationFormModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleCreateSuccess}
        organizationSlug={organizationSlug}
      />

      {/* Edit Modal */}
      {editingLocation && (
        <LocationFormModal
          open={true}
          onOpenChange={() => setEditingLocation(null)}
          onSuccess={handleEditSuccess}
          organizationSlug={organizationSlug}
          editingLocation={editingLocation}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deletingLocation} onOpenChange={() => setDeletingLocation(null)}>
        <DialogContent className="border-zinc-200 bg-white">
          <DialogHeader>
            <DialogTitle className="text-zinc-900">Delete Location</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Are you sure you want to delete &quot;{deletingLocation?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingLocation(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingLocation && handleDelete(deletingLocation)}
            >
              Delete Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// LOCATION FORM MODAL
// ============================================================================

interface LocationFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  organizationSlug: string;
  editingLocation?: Location;
}

function LocationFormModal({
  open,
  onOpenChange,
  onSuccess,
  organizationSlug,
  editingLocation,
}: LocationFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    address: '',
    lat: '',
    lng: '',
    geofence_radius: '100',
  });

  // Reset/populate form when modal opens
  useEffect(() => {
    if (open) {
      if (editingLocation) {
        setFormData({
          name: editingLocation.name,
          address: editingLocation.address || '',
          lat: editingLocation.lat || '',
          lng: editingLocation.lng || '',
          geofence_radius: editingLocation.geofence_radius?.toString() || '100',
        });
      } else {
        setFormData({
          name: '',
          address: '',
          lat: '',
          lng: '',
          geofence_radius: '100',
        });
      }
      setError(null);
    }
  }, [open, editingLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate
      if (!formData.name.trim()) {
        throw new Error('Location name is required');
      }

      // Validate coordinates (optional, but must be valid if provided)
      if (formData.lat && formData.lng) {
        const lat = parseFloat(formData.lat);
        const lng = parseFloat(formData.lng);
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          throw new Error('Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180');
        }
      }

      // Validate geofence radius
      const geofenceRadius = formData.geofence_radius ? parseInt(formData.geofence_radius) : null;
      if (geofenceRadius !== null && (isNaN(geofenceRadius) || geofenceRadius < 0)) {
        throw new Error('Geofence radius must be a positive number');
      }

      // Prepare request body
      const body: Record<string, unknown> = {
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
        geofence_radius: geofenceRadius,
      };

      const url = editingLocation
        ? `${API_URL}/api/v1/org/${organizationSlug}/locations/${editingLocation.id}`
        : `${API_URL}/api/v1/org/${organizationSlug}/locations`;

      const response = await fetch(url, {
        method: editingLocation ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${editingLocation ? 'update' : 'create'} location`);
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
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 border-zinc-200 bg-white p-0 sm:max-w-[600px]">
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="p-6 pb-4">
            <DialogHeader>
              <DialogTitle className="text-zinc-900">
                {editingLocation ? 'Edit Location' : 'Create Location'}
              </DialogTitle>
              <DialogDescription className="text-zinc-500">
                {editingLocation
                  ? 'Update the location details below.'
                  : 'Add a new work site for scheduling and time tracking.'}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
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

            {/* Location name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-700">
                Location Name *
              </Label>
              <Input
                id="name"
                placeholder="e.g., Main Office, Warehouse A"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400"
                required
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-zinc-700">
                Address (Optional)
              </Label>
              <Input
                id="address"
                placeholder="e.g., 123 Main St, Madrid"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400"
              />
            </div>

            {/* Map Picker */}
            <div className="space-y-2">
              <Label className="text-zinc-700">
                Location on Map (Optional)
              </Label>
              <p className="text-xs text-zinc-500">
                Tap on the map to set coordinates, or use "Expand Map" for full screen view
              </p>
              <MapPicker
                lat={formData.lat ? parseFloat(formData.lat) : undefined}
                lng={formData.lng ? parseFloat(formData.lng) : undefined}
                onLocationSelect={(lat, lng) => {
                  setFormData({
                    ...formData,
                    lat: lat.toFixed(6),
                    lng: lng.toFixed(6),
                  });
                }}
                height="250px"
              />
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lat" className="text-zinc-700">
                  Latitude (Optional)
                </Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  placeholder="e.g., 40.416775"
                  value={formData.lat}
                  onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                  className="border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lng" className="text-zinc-700">
                  Longitude (Optional)
                </Label>
                <Input
                  id="lng"
                  type="number"
                  step="any"
                  placeholder="e.g., -3.703790"
                  value={formData.lng}
                  onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                  className="border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400"
                />
              </div>
            </div>

            {/* Geofence radius */}
            <div className="space-y-2">
              <Label htmlFor="geofence_radius" className="text-zinc-700">
                Geofence Radius (meters)
              </Label>
              <Input
                id="geofence_radius"
                type="number"
                min="0"
                placeholder="e.g., 100"
                value={formData.geofence_radius}
                onChange={(e) => setFormData({ ...formData, geofence_radius: e.target.value })}
                className="border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400"
              />
              <p className="text-xs text-zinc-500">
                Employees must be within this radius to clock in (requires GPS)
              </p>
            </div>
          </div>

          <div className="border-t border-zinc-200 p-6 pt-4">
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {editingLocation ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {editingLocation ? 'Update Location' : 'Create Location'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
