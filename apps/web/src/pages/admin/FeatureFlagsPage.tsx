/**
 * FeatureFlagsPage - Admin Feature Flags Management
 * Platform admins can manage feature flags for per-organization feature toggling
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

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
        toast.error(t('admin.featureFlags.failedToLoad'));
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
      toast.error(t('admin.featureFlags.flagKeyRequired'));
      return;
    }

    setIsActionLoading(true);
    try {
      await createFeatureFlag({
        flag_key: form.flag_key.trim(),
        description: form.description.trim() || undefined,
        enabled_globally: form.enabled_globally,
      });
      toast.success(t('admin.featureFlags.flagCreated'));
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
      toast.error(t('admin.featureFlags.failedToCreate'));
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
      toast.success(t('admin.featureFlags.flagUpdated'));
      setEditModal(null);
      loadFlags();
    } catch (error) {
      console.error('Error updating flag:', error);
      toast.error(t('admin.featureFlags.failedToUpdate'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;

    setIsActionLoading(true);
    try {
      await deleteFeatureFlag(deleteModal.id);
      toast.success(t('admin.featureFlags.flagDeleted'));
      setDeleteModal(null);
      loadFlags();
    } catch (error) {
      console.error('Error deleting flag:', error);
      toast.error(t('admin.featureFlags.failedToDelete'));
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
          ? t('admin.featureFlags.disabledGlobally')
          : t('admin.featureFlags.enabledGlobally')
      );
      loadFlags();
    } catch (error) {
      console.error('Error toggling flag:', error);
      toast.error(t('admin.featureFlags.failedToToggle'));
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
    <div className="min-h-screen bg-kresna-light p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-50 border border-primary-200">
              <Flag className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-charcoal">{t('admin.featureFlags.title')}</h1>
              <p className="text-sm text-kresna-gray mt-1">
                {t('admin.featureFlags.perTenant')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadFlags()}
              disabled={isRefreshing}
              className="border-kresna-border hover:bg-kresna-light"
            >
              <RefreshCw
                className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')}
              />
              {t('admin.refresh')}
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateModal(true)}
              className="bg-primary-600 hover:bg-primary-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('admin.featureFlags.createFlag')}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-kresna-gray" />
          <Input
            placeholder={t('admin.featureFlags.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-kresna-border text-charcoal placeholder:text-kresna-gray"
          />
        </div>
      </div>

      {/* Flags List */}
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-kresna-gray mx-auto mb-3 animate-spin" />
            <p className="text-kresna-gray">{t('common.loading')}</p>
          </div>
        ) : filteredFlags.length === 0 ? (
          <div className="text-center py-12">
            <Flag className="w-12 h-12 text-kresna-border mx-auto mb-3" />
            <p className="text-kresna-gray">
              {searchQuery ? t('admin.featureFlags.noFlagsMatch') : t('admin.featureFlags.noFlagsYet')}
            </p>
            {!searchQuery && (
              <Button
                size="sm"
                onClick={() => setCreateModal(true)}
                className="mt-4 bg-primary-600 hover:bg-primary-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('admin.featureFlags.createFirstFlag')}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredFlags.map((flag) => (
              <div
                key={flag.id}
                className="rounded-xl border border-kresna-border bg-white shadow-sm p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <code className="text-lg font-mono font-semibold text-charcoal">
                        {flag.flag_key}
                      </code>
                      {flag.enabled_globally ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          <Globe className="w-3 h-3 mr-1" />
                          {t('admin.featureFlags.enabled')}
                        </Badge>
                      ) : (
                        <Badge className="bg-kresna-light text-kresna-gray border-kresna-border">
                          {t('admin.featureFlags.disabled')}
                        </Badge>
                      )}
                    </div>
                    {flag.description && (
                      <p className="text-sm text-kresna-gray mb-3">
                        {flag.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-kresna-gray">
                      {flag.enabled_for_orgs &&
                        flag.enabled_for_orgs.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            <span>
                              {t('admin.featureFlags.enabledForOrgs', { count: flag.enabled_for_orgs.length })}
                            </span>
                          </div>
                        )}
                      {flag.disabled_for_orgs &&
                        flag.disabled_for_orgs.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            <span>
                              {t('admin.featureFlags.disabledForOrgs', { count: flag.disabled_for_orgs.length })}
                            </span>
                          </div>
                        )}
                      <span>
                        {t('admin.featureFlags.createdOn', { date: new Date(flag.created_at).toLocaleDateString() })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleGlobal(flag)}
                      className={cn(
                        'border-kresna-border',
                        flag.enabled_globally
                          ? 'hover:bg-emerald-50 text-emerald-600'
                          : 'hover:bg-kresna-light text-kresna-gray'
                      )}
                    >
                      {flag.enabled_globally ? (
                        <ToggleRight className="w-4 h-4 mr-2" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 mr-2" />
                      )}
                      {t('admin.featureFlags.toggle')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(flag)}
                      className="border-kresna-border hover:bg-kresna-light"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteModal(flag)}
                      className="border-red-200 hover:bg-red-50 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {createModal && (
        <Dialog open={createModal} onOpenChange={setCreateModal}>
          <DialogContent className="bg-white border-kresna-border">
            <DialogHeader>
              <DialogTitle className="text-charcoal">
                {t('admin.featureFlags.createFeatureFlag')}
              </DialogTitle>
              <DialogDescription className="text-kresna-gray">
                {t('admin.featureFlags.createDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-kresna-gray-dark mb-2 block">
                  {t('admin.featureFlags.flagKeyLabel')} *
                </label>
                <Input
                  placeholder={t('admin.featureFlags.flagKeyPlaceholder')}
                  value={form.flag_key}
                  onChange={(e) =>
                    setForm({ ...form, flag_key: e.target.value })
                  }
                  className="bg-kresna-light border-kresna-border text-charcoal placeholder:text-kresna-gray"
                />
                <p className="text-xs text-kresna-gray mt-1">
                  {t('admin.featureFlags.flagKeyHint')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-kresna-gray-dark mb-2 block">
                  {t('admin.featureFlags.descriptionLabel')}
                </label>
                <Input
                  placeholder={t('admin.featureFlags.descriptionPlaceholder')}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="bg-kresna-light border-kresna-border text-charcoal placeholder:text-kresna-gray"
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
                  className="w-4 h-4 rounded bg-kresna-light border-kresna-border"
                />
                <label
                  htmlFor="enabled_globally"
                  className="text-sm text-kresna-gray-dark"
                >
                  {t('admin.featureFlags.global')}
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateModal(false)}
                disabled={isActionLoading}
                className="border-kresna-border hover:bg-kresna-light"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isActionLoading || !form.flag_key.trim()}
                className="bg-primary-600 hover:bg-primary-500"
              >
                {isActionLoading ? t('admin.featureFlags.creating') : t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Modal */}
      {editModal && (
        <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
          <DialogContent className="bg-white border-kresna-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-charcoal">
                {t('admin.featureFlags.editFeatureFlag')}
              </DialogTitle>
              <DialogDescription className="text-kresna-gray">
                {t('admin.featureFlags.editDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-kresna-gray-dark mb-2 block">
                  {t('admin.featureFlags.flagKeyReadOnly')}
                </label>
                <Input
                  value={form.flag_key}
                  disabled
                  className="bg-kresna-light border-kresna-border text-kresna-gray"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-kresna-gray-dark mb-2 block">
                  {t('admin.featureFlags.descriptionLabel')}
                </label>
                <Input
                  placeholder={t('admin.featureFlags.descriptionPlaceholder')}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="bg-kresna-light border-kresna-border text-charcoal placeholder:text-kresna-gray"
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
                  className="w-4 h-4 rounded bg-kresna-light border-kresna-border"
                />
                <label
                  htmlFor="edit_enabled_globally"
                  className="text-sm text-kresna-gray-dark"
                >
                  {t('admin.featureFlags.global')}
                </label>
              </div>
              <div>
                <label className="text-sm font-medium text-kresna-gray-dark mb-2 block">
                  {t('admin.featureFlags.enabledForOrgsLabel')}
                </label>
                <Input
                  placeholder={t('admin.featureFlags.orgIdsPlaceholder')}
                  value={form.enabled_for_orgs}
                  onChange={(e) =>
                    setForm({ ...form, enabled_for_orgs: e.target.value })
                  }
                  className="bg-kresna-light border-kresna-border text-charcoal placeholder:text-kresna-gray"
                />
                <p className="text-xs text-kresna-gray mt-1">
                  {t('admin.featureFlags.enabledOrgsHint')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-kresna-gray-dark mb-2 block">
                  {t('admin.featureFlags.disabledForOrgsLabel')}
                </label>
                <Input
                  placeholder={t('admin.featureFlags.orgIdsPlaceholder')}
                  value={form.disabled_for_orgs}
                  onChange={(e) =>
                    setForm({ ...form, disabled_for_orgs: e.target.value })
                  }
                  className="bg-kresna-light border-kresna-border text-charcoal placeholder:text-kresna-gray"
                />
                <p className="text-xs text-kresna-gray mt-1">
                  {t('admin.featureFlags.disabledOrgsHint')}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditModal(null)}
                disabled={isActionLoading}
                className="border-kresna-border hover:bg-kresna-light"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={isActionLoading}
                className="bg-primary-600 hover:bg-primary-500"
              >
                {isActionLoading ? t('admin.featureFlags.updating') : t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <Dialog open={!!deleteModal} onOpenChange={() => setDeleteModal(null)}>
          <DialogContent className="bg-white border-kresna-border">
            <DialogHeader>
              <DialogTitle className="text-charcoal flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                {t('admin.featureFlags.deleteFeatureFlag')}
              </DialogTitle>
              <DialogDescription className="text-kresna-gray">
                {t('admin.featureFlags.deleteConfirmation', { key: deleteModal.flag_key })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteModal(null)}
                disabled={isActionLoading}
                className="border-kresna-border hover:bg-kresna-light"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isActionLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {isActionLoading ? t('admin.featureFlags.deleting') : t('common.delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
