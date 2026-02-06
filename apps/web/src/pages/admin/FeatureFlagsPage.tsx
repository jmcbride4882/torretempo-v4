/**
 * FeatureFlagsPage - Admin Feature Flags Management
 * Platform admins can manage feature flags for per-organization feature toggling
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Flag,
  Search,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Building2,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  fetchFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
} from '@/lib/api/admin';
import type { FeatureFlag } from '@/lib/api/admin';

export default function FeatureFlagsPage() {
  // State
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<FeatureFlag | null>(null);
  const [deleteModal, setDeleteModal] = useState<FeatureFlag | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    flag_key: '',
    description: '',
    enabled_globally: false,
    enabled_for_orgs: '',
    disabled_for_orgs: '',
  });

  // Fetch flags
  const loadFlags = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setIsRefreshing(silent);

      try {
        const response = await fetchFeatureFlags();
        setFlags(response.flags || []);
      } catch (error) {
        console.error('Error fetching feature flags:', error);
        toast.error('Failed to load feature flags');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  // Handlers
  const handleCreate = async () => {
    if (!form.flag_key.trim()) {
      toast.error('Flag key is required');
      return;
    }

    setIsActionLoading(true);
    try {
      await createFeatureFlag({
        flag_key: form.flag_key.trim(),
        description: form.description.trim() || undefined,
        enabled_globally: form.enabled_globally,
      });
      toast.success('Feature flag created');
      setCreateModal(false);
      setForm({
        flag_key: '',
        description: '',
        enabled_globally: false,
        enabled_for_orgs: '',
        disabled_for_orgs: '',
      });
      loadFlags();
    } catch (error) {
      console.error('Error creating flag:', error);
      toast.error('Failed to create feature flag');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editModal) return;

    setIsActionLoading(true);
    try {
      const enabledOrgs = form.enabled_for_orgs
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      const disabledOrgs = form.disabled_for_orgs
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

      await updateFeatureFlag(editModal.id, {
        description: form.description.trim() || undefined,
        enabled_globally: form.enabled_globally,
        enabled_for_orgs: enabledOrgs.length > 0 ? enabledOrgs : undefined,
        disabled_for_orgs: disabledOrgs.length > 0 ? disabledOrgs : undefined,
      });
      toast.success('Feature flag updated');
      setEditModal(null);
      loadFlags();
    } catch (error) {
      console.error('Error updating flag:', error);
      toast.error('Failed to update feature flag');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;

    setIsActionLoading(true);
    try {
      await deleteFeatureFlag(deleteModal.id);
      toast.success('Feature flag deleted');
      setDeleteModal(null);
      loadFlags();
    } catch (error) {
      console.error('Error deleting flag:', error);
      toast.error('Failed to delete feature flag');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleGlobal = async (flag: FeatureFlag) => {
    try {
      await updateFeatureFlag(flag.id, {
        enabled_globally: !flag.enabled_globally,
      });
      toast.success(
        flag.enabled_globally
          ? 'Feature disabled globally'
          : 'Feature enabled globally'
      );
      loadFlags();
    } catch (error) {
      console.error('Error toggling flag:', error);
      toast.error('Failed to toggle feature');
    }
  };

  // Open edit modal with pre-filled form
  const openEditModal = (flag: FeatureFlag) => {
    setEditModal(flag);
    setForm({
      flag_key: flag.flag_key,
      description: flag.description || '',
      enabled_globally: flag.enabled_globally,
      enabled_for_orgs: (flag.enabled_for_orgs || []).join(', '),
      disabled_for_orgs: (flag.disabled_for_orgs || []).join(', '),
    });
  };

  // Filter flags
  const filteredFlags = flags.filter((flag) => {
    const query = searchQuery.toLowerCase();
    return (
      flag.flag_key.toLowerCase().includes(query) ||
      flag.description?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30">
              <Flag className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Feature Flags</h1>
              <p className="text-sm text-zinc-400 mt-1">
                Manage per-organization feature toggles
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadFlags()}
              disabled={isRefreshing}
              className="border-zinc-700 hover:bg-zinc-800"
            >
              <RefreshCw
                className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')}
              />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateModal(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Flag
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <Input
            placeholder="Search by flag key or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-900/50 border-zinc-800 text-white"
          />
        </div>
      </div>

      {/* Flags List */}
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-zinc-600 mx-auto mb-3 animate-spin" />
            <p className="text-zinc-500">Loading feature flags...</p>
          </div>
        ) : filteredFlags.length === 0 ? (
          <div className="text-center py-12">
            <Flag className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">
              {searchQuery ? 'No flags match your search' : 'No feature flags yet'}
            </p>
            {!searchQuery && (
              <Button
                size="sm"
                onClick={() => setCreateModal(true)}
                className="mt-4 bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Flag
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredFlags.map((flag) => (
              <motion.div
                key={flag.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 rounded-xl border border-white/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <code className="text-lg font-mono font-semibold text-white">
                        {flag.flag_key}
                      </code>
                      {flag.enabled_globally ? (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                          <Globe className="w-3 h-3 mr-1" />
                          Enabled Globally
                        </Badge>
                      ) : (
                        <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">
                          Disabled Globally
                        </Badge>
                      )}
                    </div>
                    {flag.description && (
                      <p className="text-sm text-zinc-400 mb-3">
                        {flag.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      {flag.enabled_for_orgs &&
                        flag.enabled_for_orgs.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            <span>
                              Enabled for {flag.enabled_for_orgs.length} org(s)
                            </span>
                          </div>
                        )}
                      {flag.disabled_for_orgs &&
                        flag.disabled_for_orgs.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            <span>
                              Disabled for {flag.disabled_for_orgs.length} org(s)
                            </span>
                          </div>
                        )}
                      <span>
                        Created{' '}
                        {new Date(flag.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleGlobal(flag)}
                      className={cn(
                        'border-zinc-700',
                        flag.enabled_globally
                          ? 'hover:bg-emerald-500/10 text-emerald-400'
                          : 'hover:bg-zinc-800 text-zinc-400'
                      )}
                    >
                      {flag.enabled_globally ? (
                        <ToggleRight className="w-4 h-4 mr-2" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 mr-2" />
                      )}
                      Toggle
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(flag)}
                      className="border-zinc-700 hover:bg-zinc-800"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteModal(flag)}
                      className="border-red-500/30 hover:bg-red-500/10 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {createModal && (
          <Dialog open={createModal} onOpenChange={setCreateModal}>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-white">
                  Create Feature Flag
                </DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Create a new feature flag for per-organization toggling
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-2 block">
                    Flag Key *
                  </label>
                  <Input
                    placeholder="e.g., enable_advanced_reports"
                    value={form.flag_key}
                    onChange={(e) =>
                      setForm({ ...form, flag_key: e.target.value })
                    }
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Use snake_case for flag keys
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-2 block">
                    Description
                  </label>
                  <Input
                    placeholder="Brief description of the feature"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enabled_globally"
                    checked={form.enabled_globally}
                    onChange={(e) =>
                      setForm({ ...form, enabled_globally: e.target.checked })
                    }
                    className="w-4 h-4 rounded bg-zinc-800 border-zinc-700"
                  />
                  <label
                    htmlFor="enabled_globally"
                    className="text-sm text-zinc-300"
                  >
                    Enable globally for all organizations
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateModal(false)}
                  disabled={isActionLoading}
                  className="border-zinc-700 hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={isActionLoading || !form.flag_key.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isActionLoading ? 'Creating...' : 'Create Flag'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editModal && (
          <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">
                  Edit Feature Flag
                </DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Update flag settings and per-organization overrides
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-2 block">
                    Flag Key (read-only)
                  </label>
                  <Input
                    value={form.flag_key}
                    disabled
                    className="bg-zinc-800/50 border-zinc-700 text-zinc-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-2 block">
                    Description
                  </label>
                  <Input
                    placeholder="Brief description of the feature"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit_enabled_globally"
                    checked={form.enabled_globally}
                    onChange={(e) =>
                      setForm({ ...form, enabled_globally: e.target.checked })
                    }
                    className="w-4 h-4 rounded bg-zinc-800 border-zinc-700"
                  />
                  <label
                    htmlFor="edit_enabled_globally"
                    className="text-sm text-zinc-300"
                  >
                    Enable globally for all organizations
                  </label>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-2 block">
                    Enabled for Organizations (comma-separated IDs)
                  </label>
                  <Input
                    placeholder="org-uuid-1, org-uuid-2"
                    value={form.enabled_for_orgs}
                    onChange={(e) =>
                      setForm({ ...form, enabled_for_orgs: e.target.value })
                    }
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Override global setting for specific organizations
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-2 block">
                    Disabled for Organizations (comma-separated IDs)
                  </label>
                  <Input
                    placeholder="org-uuid-3, org-uuid-4"
                    value={form.disabled_for_orgs}
                    onChange={(e) =>
                      setForm({ ...form, disabled_for_orgs: e.target.value })
                    }
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Disable for specific organizations even if globally enabled
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setEditModal(null)}
                  disabled={isActionLoading}
                  className="border-zinc-700 hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={isActionLoading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isActionLoading ? 'Updating...' : 'Update Flag'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal && (
          <Dialog open={!!deleteModal} onOpenChange={() => setDeleteModal(null)}>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-400" />
                  Delete Feature Flag
                </DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Are you sure you want to delete{' '}
                  <code className="text-white font-mono">
                    {deleteModal.flag_key}
                  </code>
                  ? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteModal(null)}
                  disabled={isActionLoading}
                  className="border-zinc-700 hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={isActionLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isActionLoading ? 'Deleting...' : 'Delete Flag'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
