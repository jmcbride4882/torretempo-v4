/**
 * TenantsPage - Admin Tenants Management
 * List organizations, search, suspend, and delete with confirmations
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Building2,
  Search,
  RefreshCw,
  Users,
  AlertTriangle,
  Trash2,
  Ban,
  CheckCircle2,
  MoreVertical,
  ExternalLink,
  Crown,
  Edit,
  Download,
  Square,
  CheckSquare,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  fetchTenants,
  suspendTenant,
  unsuspendTenant,
  deleteTenant,
  updateTenant,
  bulkDeleteTenants,
} from '@/lib/api/admin';
import type { Tenant } from '@/lib/api/admin';

// Tier badge colors
const tierColors: Record<string, string> = {
  free: 'bg-zinc-100 text-zinc-600 border-zinc-300',
  starter: 'bg-blue-50 text-blue-700 border-blue-200',
  pro: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  enterprise: 'bg-amber-50 text-amber-700 border-amber-200',
};

// Status badge colors
const statusColors: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspended: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-zinc-100 text-zinc-600 border-zinc-300',
  past_due: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function TenantsPage() {
  const { t } = useTranslation();

  // State
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 12;

  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    type: 'suspend' | 'unsuspend' | 'delete';
    tenant: Tenant;
  } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Edit modal state
  const [editModal, setEditModal] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    logo: '',
    subscriptionTier: 'starter' as 'free' | 'starter' | 'pro' | 'enterprise',
  });
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState('');
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // Fetch tenants
  const loadTenants = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setIsRefreshing(silent);

      try {
        const response = await fetchTenants({
          search: searchQuery || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          tier: tierFilter !== 'all' ? tierFilter : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
          limit,
        });
        setTenants(response.tenants || []);
        setTotal(response.total || 0);
      } catch (error) {
        console.error('Error fetching tenants:', error);
        toast.error(t('admin.toasts.failedLoadTenants'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [searchQuery, statusFilter, tierFilter, startDate, endDate, page]
  );

  useEffect(() => {
    loadTenants();
    // Auto-refresh every 10 seconds for live data
    const interval = setInterval(() => loadTenants(true), 10000);
    return () => clearInterval(interval);
  }, [loadTenants]);

  // Handlers
  const handleRefresh = () => loadTenants(true);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (tierFilter !== 'all') params.set('tier', tierFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const url = `/api/admin/tenants/export${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `tenants-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      toast.success(t('admin.toasts.exportSuccess'));
    } catch (error) {
      console.error('Error exporting tenants:', error);
      toast.error(t('admin.toasts.failedExport'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleAction = async () => {
    if (!confirmModal) return;

    // Validate delete confirmation
    if (confirmModal.type === 'delete' && deleteConfirmation !== confirmModal.tenant.slug) {
      toast.error(t('admin.toasts.confirmationMismatch'));
      return;
    }

    setIsActionLoading(true);
    try {
      switch (confirmModal.type) {
        case 'suspend':
          await suspendTenant(confirmModal.tenant.id);
          toast.success(t('admin.toasts.tenantSuspended', { name: confirmModal.tenant.name }));
          break;
        case 'unsuspend':
          await unsuspendTenant(confirmModal.tenant.id);
          toast.success(t('admin.toasts.tenantReactivated', { name: confirmModal.tenant.name }));
          break;
        case 'delete':
          await deleteTenant(confirmModal.tenant.id, deleteConfirmation);
          toast.success(t('admin.toasts.tenantDeleted', { name: confirmModal.tenant.name }));
          break;
      }
      setConfirmModal(null);
      setDeleteConfirmation('');
      loadTenants(true);
    } catch (error) {
      console.error('Error performing action:', error);
      toast.error(t('admin.toasts.failedAction'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editModal) return;

    // Validate form
    if (!editForm.name.trim()) {
      toast.error(t('admin.toasts.orgNameRequired'));
      return;
    }

    setIsEditLoading(true);
    try {
      await updateTenant(editModal.id, {
        name: editForm.name.trim(),
        logo: editForm.logo.trim() || undefined,
        subscriptionTier: editForm.subscriptionTier,
      });
      toast.success(t('admin.toasts.tenantUpdated', { name: editForm.name }));
      setEditModal(null);
      loadTenants(true);
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast.error(t('admin.toasts.failedUpdateTenant'));
    } finally {
      setIsEditLoading(false);
    }
  };

  const openEditModal = (tenant: Tenant) => {
    setEditForm({
      name: tenant.name,
      logo: tenant.logo || '',
      subscriptionTier: tenant.subscriptionTier,
    });
    setEditModal(tenant);
  };

  // Selection helpers
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = tenants.length > 0 && tenants.every((t) => selectedIds.has(t.id));
  const someSelected = tenants.some((t) => selectedIds.has(t.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tenants.map((t) => t.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (bulkDeleteConfirm !== 'DELETE') {
      toast.error(t('admin.toasts.typeDeleteConfirm'));
      return;
    }
    setIsBulkLoading(true);
    try {
      const result = await bulkDeleteTenants(Array.from(selectedIds));
      toast.success(t('admin.toasts.bulkDeleteSuccess', { count: result.success }));
      if (result.failed > 0) {
        toast.warning(t('admin.toasts.bulkDeleteFailed', { count: result.failed }));
      }
      setBulkDeleteModal(false);
      setBulkDeleteConfirm('');
      clearSelection();
      loadTenants(true);
    } catch (error) {
      toast.error(t('admin.toasts.failedDeleteTenants'));
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Stats
  const activeCount = tenants.filter((t) => t.subscriptionStatus === 'active').length;
  const suspendedCount = tenants.filter((t) => t.subscriptionStatus === 'suspended').length;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 shadow-sm">
            <Building2 className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">{t('admin.tenants.title')}</h1>
            <p className="text-sm text-zinc-500">
              {t('admin.liveMonitoring')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
            >
              <Download className={cn('h-4 w-4', isExporting && 'animate-bounce')} />
              <span className="hidden sm:inline">{isExporting ? t('admin.exporting') : t('admin.exportCsv')}</span>
            </Button>
          </div>
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              <span className="hidden sm:inline">{t('admin.refresh')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            type="text"
            placeholder={t('common.search') + '...'}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-zinc-200 bg-white shadow-sm pl-9 text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500"
          />
        </div>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px] rounded-xl border border-zinc-200 bg-white shadow-sm text-zinc-900">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <SelectItem value="all" className="text-zinc-700">{t('admin.filters.allStatus')}</SelectItem>
            <SelectItem value="active" className="text-zinc-700">{t('admin.filters.active')}</SelectItem>
            <SelectItem value="suspended" className="text-zinc-700">{t('admin.filters.suspended')}</SelectItem>
            <SelectItem value="cancelled" className="text-zinc-700">{t('admin.filters.cancelled')}</SelectItem>
            <SelectItem value="past_due" className="text-zinc-700">{t('admin.filters.pastDue')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Tier filter */}
        <Select
          value={tierFilter}
          onValueChange={(value) => {
            setTierFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px] rounded-xl border border-zinc-200 bg-white shadow-sm text-zinc-900">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <SelectItem value="all" className="text-zinc-700">{t('admin.filters.allTiers')}</SelectItem>
            <SelectItem value="free" className="text-zinc-700">{t('admin.filters.free')}</SelectItem>
            <SelectItem value="starter" className="text-zinc-700">{t('admin.filters.starter')}</SelectItem>
            <SelectItem value="pro" className="text-zinc-700">{t('admin.filters.pro')}</SelectItem>
            <SelectItem value="enterprise" className="text-zinc-700">{t('admin.filters.enterprise')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Date range filter */}
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={(value) => {
            setStartDate(value);
            setPage(1);
          }}
          onEndDateChange={(value) => {
            setEndDate(value);
            setPage(1);
          }}
          onClear={() => {
            setStartDate('');
            setEndDate('');
            setPage(1);
          }}
        />
      </div>

      {/* Stats bar */}
      <div
        className="flex flex-wrap items-center gap-4 text-sm sm:gap-6"
      >
        {/* Select All checkbox */}
        {tenants.length > 0 && (
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            {allSelected ? (
              <CheckSquare className="h-4 w-4 text-amber-600" />
            ) : someSelected ? (
              <div className="relative">
                <Square className="h-4 w-4 text-amber-600" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-sm bg-amber-600" />
                </div>
              </div>
            ) : (
              <Square className="h-4 w-4" />
            )}
            <span className="text-xs font-medium">{t('admin.selectAll')}</span>
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-zinc-500">
            <span className="font-medium text-zinc-700">{total}</span> {t('admin.total')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-zinc-500">
            <span className="font-medium text-zinc-700">{activeCount}</span> {t('admin.active')}
          </span>
        </div>
        {suspendedCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-zinc-500">
              <span className="font-medium text-zinc-700">{suspendedCount}</span> {t('admin.suspended')}
            </span>
          </div>
        )}
      </div>

      {/* Tenants grid */}
      <div>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <TenantCardSkeleton key={i} />
            ))}
          </div>
        ) : tenants.length === 0 ? (
          <EmptyState
            hasFilters={searchQuery !== '' || statusFilter !== 'all' || tierFilter !== 'all'}
            onClearFilters={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setTierFilter('all');
            }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tenants.map((tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                isSelected={selectedIds.has(tenant.id)}
                onToggleSelect={() => toggleSelection(tenant.id)}
                onEdit={() => openEditModal(tenant)}
                onSuspend={() => setConfirmModal({ type: 'suspend', tenant })}
                onUnsuspend={() => setConfirmModal({ type: 'unsuspend', tenant })}
                onDelete={() => setConfirmModal({ type: 'delete', tenant })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div>
        <PaginationControls
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      </div>

      {/* Confirmation Modal */}
      <Dialog open={!!confirmModal} onOpenChange={() => {
        setConfirmModal(null);
        setDeleteConfirmation('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmModal?.type === 'suspend' && t('admin.tenants.suspend')}
              {confirmModal?.type === 'unsuspend' && t('admin.tenants.unsuspend')}
              {confirmModal?.type === 'delete' && t('common.delete')}
            </DialogTitle>
            <DialogDescription>
              {confirmModal?.type === 'suspend' && (
                <>
                  {t('admin.tenants.suspendConfirm', { name: confirmModal.tenant.name })}
                </>
              )}
              {confirmModal?.type === 'unsuspend' && (
                <>
                  {t('admin.tenants.unsuspendConfirm', { name: confirmModal?.tenant.name })}
                </>
              )}
              {confirmModal?.type === 'delete' && (
                <>
                  <span className="text-red-500">{t('admin.tenants.deleteConfirm', { name: confirmModal?.tenant.name })}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Delete confirmation input */}
          {confirmModal?.type === 'delete' && (
            <div className="space-y-2">
              <label className="text-sm text-zinc-700">
                {t('admin.tenants.typeSlugConfirm', { slug: confirmModal.tenant.slug })}
              </label>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={confirmModal.tenant.slug}
                className="rounded-xl border border-zinc-200 bg-white shadow-sm text-zinc-900"
                autoFocus
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmModal(null)}
              disabled={isActionLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant={confirmModal?.type === 'delete' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={isActionLoading || (confirmModal?.type === 'delete' && deleteConfirmation !== confirmModal?.tenant.slug)}
              className={confirmModal?.type === 'unsuspend' ? 'bg-emerald-600 hover:bg-emerald-500' : ''}
            >
              {isActionLoading ? t('common.loading') + '...' : confirmModal?.type === 'delete' ? t('common.delete') : confirmModal?.type === 'suspend' ? t('admin.tenants.suspend') : t('admin.tenants.unsuspend')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('admin.tenants.edit')}</DialogTitle>
            <DialogDescription>
              {t('admin.tenants.edit')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">
                {t('admin.tenants.orgName')}
              </label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder={t('admin.tenants.orgName')}
                className="rounded-xl border border-zinc-200 bg-white shadow-sm text-zinc-900"
                autoFocus
              />
            </div>

            {/* Logo field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">
                {t('admin.tenants.logoUrl')}
              </label>
              <Input
                value={editForm.logo}
                onChange={(e) => setEditForm({ ...editForm, logo: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="rounded-xl border border-zinc-200 bg-white shadow-sm text-zinc-900"
              />
            </div>

            {/* Subscription tier field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">
                {t('admin.tenants.subscriptionTier')}
              </label>
              <Select
                value={editForm.subscriptionTier}
                onValueChange={(value: 'free' | 'starter' | 'pro' | 'enterprise') =>
                  setEditForm({ ...editForm, subscriptionTier: value })
                }
              >
                <SelectTrigger className="rounded-xl border border-zinc-200 bg-white shadow-sm text-zinc-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-zinc-200 bg-white shadow-sm">
                  <SelectItem value="free" className="text-zinc-700">{t('admin.filters.free')}</SelectItem>
                  <SelectItem value="starter" className="text-zinc-700">{t('admin.filters.starter')}</SelectItem>
                  <SelectItem value="pro" className="text-zinc-700">{t('admin.filters.pro')}</SelectItem>
                  <SelectItem value="enterprise" className="text-zinc-700">{t('admin.filters.enterprise')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditModal(null)}
              disabled={isEditLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isEditLoading || !editForm.name.trim()}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {isEditLoading ? t('common.loading') + '...' : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div
          className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-3 shadow-lg"
        >
          <span className="text-sm font-medium text-zinc-700">
            <span className="text-amber-600">{selectedIds.size}</span> {t('admin.selected')}
          </span>
          <div className="h-5 w-px bg-zinc-200" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBulkDeleteModal(true)}
            className="gap-1.5 text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            {t('common.delete')}
          </Button>
          <div className="h-5 w-px bg-zinc-200" />
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="gap-1.5 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
          >
            <X className="h-4 w-4" />
            {t('admin.clearSelection')}
          </Button>
        </div>
      )}

      {/* Bulk Delete Modal */}
      <Dialog open={bulkDeleteModal} onOpenChange={() => { setBulkDeleteModal(false); setBulkDeleteConfirm(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {t('admin.bulkDelete.title', { count: selectedIds.size })}
            </DialogTitle>
            <DialogDescription>
              <span className="text-red-500">{t('admin.bulkDelete.cannotUndo')}</span>{' '}
              {t('admin.bulkDelete.tenantsWarning')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm text-zinc-700">
              {t('admin.bulkDelete.typeDeleteLabel')} <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-red-500">DELETE</code>:
            </label>
            <Input
              value={bulkDeleteConfirm}
              onChange={(e) => setBulkDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="rounded-xl border border-zinc-200 bg-white shadow-sm text-zinc-900"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setBulkDeleteModal(false); setBulkDeleteConfirm(''); }} disabled={isBulkLoading}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isBulkLoading || bulkDeleteConfirm !== 'DELETE'}
            >
              {isBulkLoading ? t('common.loading') + '...' : t('admin.bulkDelete.deleteCount', { count: selectedIds.size })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Tenant Card Component
interface TenantCardProps {
  tenant: Tenant;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onSuspend: () => void;
  onUnsuspend: () => void;
  onDelete: () => void;
}

function TenantCard({ tenant, isSelected, onToggleSelect, onEdit, onSuspend, onUnsuspend, onDelete }: TenantCardProps) {
  const { t } = useTranslation();
  const isSuspended = tenant.subscriptionStatus === 'suspended';

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-300',
        'hover:border-zinc-300 hover:bg-zinc-50/50 hover:shadow-md',
        isSuspended && 'border-red-200 bg-red-50/50',
        isSelected && 'border-amber-400 bg-amber-50 ring-1 ring-amber-300'
      )}
    >
      {/* Gradient accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {/* Selection checkbox — top-left */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
        className={cn(
          'absolute left-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-md border transition-all',
          isSelected
            ? 'border-amber-500 bg-amber-500 text-white'
            : 'border-zinc-300 bg-zinc-50 text-transparent opacity-0 group-hover:opacity-100 hover:border-zinc-400'
        )}
      >
        {isSelected ? (
          <CheckSquare className="h-4 w-4" />
        ) : (
          <Square className="h-4 w-4 text-zinc-500" />
        )}
      </button>

      <div className="relative p-5">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 shadow-sm">
              {tenant.logo ? (
                <img src={tenant.logo} alt={tenant.name} className="h-6 w-6 rounded" />
              ) : (
                <Building2 className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-zinc-900">{tenant.name}</h3>
              <p className="truncate text-sm text-zinc-500">/{tenant.slug}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border border-zinc-200 bg-white shadow-sm">
              <DropdownMenuItem className="gap-2 text-zinc-700">
                <ExternalLink className="h-4 w-4" />
                {t('admin.tenants.viewDetails')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="gap-2 text-blue-600">
                <Edit className="h-4 w-4" />
                {t('common.edit')}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-200" />
              {isSuspended ? (
                <DropdownMenuItem onClick={onUnsuspend} className="gap-2 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('admin.tenants.unsuspend')}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onSuspend} className="gap-2 text-amber-600">
                  <Ban className="h-4 w-4" />
                  {t('admin.tenants.suspend')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDelete} className="gap-2 text-red-500">
                <Trash2 className="h-4 w-4" />
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge className={cn('border', tierColors[tenant.subscriptionTier])}>
            {t(`admin.filters.${tenant.subscriptionTier}`)}
          </Badge>
          <Badge className={cn('border', statusColors[tenant.subscriptionStatus])}>
            {t(`admin.filters.${tenant.subscriptionStatus}`)}
          </Badge>
        </div>

        {/* Stats */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-zinc-500">
              <Users className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wider">{t('admin.tenants.members')}</span>
            </div>
            <p className="text-xl font-bold text-zinc-900">{tenant.memberCount}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-zinc-500">
              <Crown className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wider">{t('admin.tenants.owner')}</span>
            </div>
            <p className="truncate text-sm font-medium text-zinc-900">
              {tenant.owner?.name || t('common.unknown')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 pt-4 text-xs text-zinc-500">
          <span>{t('admin.tenants.created')} {new Date(tenant.createdAt).toLocaleDateString()}</span>
          {isSuspended && (
            <span className="flex items-center gap-1 text-red-500">
              <AlertTriangle className="h-3 w-3" />
              {t('admin.suspended')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Skeleton
function TenantCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-zinc-100" />
          <div className="space-y-1.5">
            <div className="h-5 w-32 rounded bg-zinc-100" />
            <div className="h-4 w-20 rounded bg-zinc-100" />
          </div>
        </div>
        <div className="h-8 w-8 rounded bg-zinc-100" />
      </div>
      <div className="mb-4 flex gap-2">
        <div className="h-6 w-16 rounded-full bg-zinc-100" />
        <div className="h-6 w-16 rounded-full bg-zinc-100" />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="h-3 w-16 rounded bg-zinc-100" />
          <div className="h-6 w-12 rounded bg-zinc-100" />
        </div>
        <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="h-3 w-16 rounded bg-zinc-100" />
          <div className="h-4 w-20 rounded bg-zinc-100" />
        </div>
      </div>
      <div className="border-t border-zinc-200 pt-4">
        <div className="h-3 w-24 rounded bg-zinc-100" />
      </div>
    </div>
  );
}

// Empty State
function EmptyState({
  hasFilters,
  onClearFilters,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  const { t } = useTranslation();

  if (hasFilters) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-16 text-center"
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100">
          <Search className="h-7 w-7 text-zinc-500" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-zinc-900">{t('admin.noMatchingResults')}</h3>
        <p className="mb-4 max-w-sm text-sm text-zinc-500">
          {t('admin.adjustFilters')}
        </p>
        <Button
          variant="ghost"
          onClick={onClearFilters}
          className="gap-2 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
        >
          {t('admin.clearFilters')}
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-16 text-center"
    >
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50"
      >
        <Building2 className="h-8 w-8 text-amber-600" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-zinc-900">{t('admin.tenants.noTenantsYet')}</h3>
      <p className="max-w-sm text-sm text-zinc-500">
        {t('admin.tenants.tenantsAppearHere')}
      </p>
    </div>
  );
}
