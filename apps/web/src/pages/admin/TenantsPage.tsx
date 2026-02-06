/**
 * TenantsPage - Admin Tenants Management
 * List organizations, search, suspend, and delete with confirmations
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  free: 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30',
  starter: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  pro: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  enterprise: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

// Status badge colors
const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  suspended: 'bg-red-500/20 text-red-300 border-red-500/30',
  cancelled: 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30',
  past_due: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

export default function TenantsPage() {
  // State
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
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
          page,
          limit,
        });
        setTenants(response.tenants || []);
        setTotal(response.total || 0);
      } catch (error) {
        console.error('Error fetching tenants:', error);
        toast.error('Failed to load tenants');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [searchQuery, statusFilter, tierFilter, page]
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
      toast.success('Tenants exported successfully');
    } catch (error) {
      console.error('Error exporting tenants:', error);
      toast.error('Failed to export tenants');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAction = async () => {
    if (!confirmModal) return;

    // Validate delete confirmation
    if (confirmModal.type === 'delete' && deleteConfirmation !== confirmModal.tenant.slug) {
      toast.error('Confirmation slug does not match');
      return;
    }

    setIsActionLoading(true);
    try {
      switch (confirmModal.type) {
        case 'suspend':
          await suspendTenant(confirmModal.tenant.id);
          toast.success(`${confirmModal.tenant.name} has been suspended`);
          break;
        case 'unsuspend':
          await unsuspendTenant(confirmModal.tenant.id);
          toast.success(`${confirmModal.tenant.name} has been reactivated`);
          break;
        case 'delete':
          await deleteTenant(confirmModal.tenant.id, deleteConfirmation);
          toast.success(`${confirmModal.tenant.name} has been deleted`);
          break;
      }
      setConfirmModal(null);
      setDeleteConfirmation('');
      loadTenants(true);
    } catch (error) {
      console.error('Error performing action:', error);
      toast.error('Failed to perform action');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editModal) return;

    // Validate form
    if (!editForm.name.trim()) {
      toast.error('Organization name is required');
      return;
    }

    setIsEditLoading(true);
    try {
      await updateTenant(editModal.id, {
        name: editForm.name.trim(),
        logo: editForm.logo.trim() || undefined,
        subscriptionTier: editForm.subscriptionTier,
      });
      toast.success(`${editForm.name} has been updated`);
      setEditModal(null);
      loadTenants(true);
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast.error('Failed to update tenant');
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
      toast.error('Type DELETE to confirm');
      return;
    }
    setIsBulkLoading(true);
    try {
      const result = await bulkDeleteTenants(Array.from(selectedIds));
      toast.success(`${result.success} tenant(s) deleted successfully`);
      if (result.failed > 0) {
        toast.warning(`${result.failed} tenant(s) failed to delete`);
      }
      setBulkDeleteModal(false);
      setBulkDeleteConfirm('');
      clearSelection();
      loadTenants(true);
    } catch (error) {
      toast.error('Failed to delete tenants');
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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600/20 to-orange-600/20 shadow-lg shadow-amber-500/10">
            <Building2 className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Tenants</h1>
            <p className="text-sm text-neutral-400">
              Live monitoring • Updates every 10 seconds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="gap-1.5 rounded-lg border border-white/5 bg-white/5 text-neutral-300 hover:bg-white/10"
            >
              <Download className={cn('h-4 w-4', isExporting && 'animate-bounce')} />
              <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-1.5 rounded-lg border border-white/5 bg-white/5 text-neutral-300 hover:bg-white/10"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <Input
            type="text"
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="glass-card border-white/10 pl-9 text-white placeholder:text-neutral-500 focus:border-amber-500"
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
          <SelectTrigger className="w-[140px] glass-card border-white/10 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="glass-card border-white/10">
            <SelectItem value="all" className="text-neutral-200">All Status</SelectItem>
            <SelectItem value="active" className="text-neutral-200">Active</SelectItem>
            <SelectItem value="suspended" className="text-neutral-200">Suspended</SelectItem>
            <SelectItem value="cancelled" className="text-neutral-200">Cancelled</SelectItem>
            <SelectItem value="past_due" className="text-neutral-200">Past Due</SelectItem>
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
          <SelectTrigger className="w-[140px] glass-card border-white/10 text-white">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent className="glass-card border-white/10">
            <SelectItem value="all" className="text-neutral-200">All Tiers</SelectItem>
            <SelectItem value="free" className="text-neutral-200">Free</SelectItem>
            <SelectItem value="starter" className="text-neutral-200">Starter</SelectItem>
            <SelectItem value="pro" className="text-neutral-200">Pro</SelectItem>
            <SelectItem value="enterprise" className="text-neutral-200">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex flex-wrap items-center gap-4 text-sm sm:gap-6"
      >
        {/* Select All checkbox */}
        {tenants.length > 0 && (
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-neutral-300 transition-colors hover:bg-white/10"
          >
            {allSelected ? (
              <CheckSquare className="h-4 w-4 text-amber-400" />
            ) : someSelected ? (
              <div className="relative">
                <Square className="h-4 w-4 text-amber-400" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-sm bg-amber-400" />
                </div>
              </div>
            ) : (
              <Square className="h-4 w-4" />
            )}
            <span className="text-xs font-medium">Select All</span>
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">{total}</span> total
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">{activeCount}</span> active
          </span>
        </div>
        {suspendedCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-neutral-400">
              <span className="font-medium text-neutral-200">{suspendedCount}</span> suspended
            </span>
          </div>
        )}
      </motion.div>

      {/* Tenants grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
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
            <AnimatePresence mode="popLayout">
              {tenants.map((tenant, index) => (
                <TenantCard
                  key={tenant.id}
                  tenant={tenant}
                  index={index}
                  isSelected={selectedIds.has(tenant.id)}
                  onToggleSelect={() => toggleSelection(tenant.id)}
                  onEdit={() => openEditModal(tenant)}
                  onSuspend={() => setConfirmModal({ type: 'suspend', tenant })}
                  onUnsuspend={() => setConfirmModal({ type: 'unsuspend', tenant })}
                  onDelete={() => setConfirmModal({ type: 'delete', tenant })}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        <PaginationControls
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      </motion.div>

      {/* Confirmation Modal */}
      <Dialog open={!!confirmModal} onOpenChange={() => {
        setConfirmModal(null);
        setDeleteConfirmation('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmModal?.type === 'suspend' && 'Suspend Organization'}
              {confirmModal?.type === 'unsuspend' && 'Reactivate Organization'}
              {confirmModal?.type === 'delete' && 'Delete Organization'}
            </DialogTitle>
            <DialogDescription>
              {confirmModal?.type === 'suspend' && (
                <>
                  Are you sure you want to suspend <strong>{confirmModal.tenant.name}</strong>?
                  Users will lose access until reactivated.
                </>
              )}
              {confirmModal?.type === 'unsuspend' && (
                <>
                  Reactivate <strong>{confirmModal?.tenant.name}</strong>? Users will regain access
                  to the platform.
                </>
              )}
              {confirmModal?.type === 'delete' && (
                <>
                  <span className="text-red-400">This action cannot be undone.</span> All data for{' '}
                  <strong>{confirmModal?.tenant.name}</strong> will be permanently deleted.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {/* Delete confirmation input */}
          {confirmModal?.type === 'delete' && (
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">
                Type <code className="rounded bg-neutral-800 px-1.5 py-0.5 text-amber-400">{confirmModal.tenant.slug}</code> to confirm:
              </label>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={confirmModal.tenant.slug}
                className="glass-card border-white/10 text-white"
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
              Cancel
            </Button>
            <Button
              variant={confirmModal?.type === 'delete' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={isActionLoading || (confirmModal?.type === 'delete' && deleteConfirmation !== confirmModal?.tenant.slug)}
              className={confirmModal?.type === 'unsuspend' ? 'bg-emerald-600 hover:bg-emerald-500' : ''}
            >
              {isActionLoading ? 'Processing...' : confirmModal?.type === 'delete' ? 'Delete' : confirmModal?.type === 'suspend' ? 'Suspend' : 'Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update organization details and subscription tier
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Name field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">
                Organization Name
              </label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter organization name"
                className="glass-card border-white/10 text-white"
                autoFocus
              />
            </div>

            {/* Logo field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">
                Logo URL <span className="text-neutral-500">(optional)</span>
              </label>
              <Input
                value={editForm.logo}
                onChange={(e) => setEditForm({ ...editForm, logo: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="glass-card border-white/10 text-white"
              />
            </div>

            {/* Subscription tier field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">
                Subscription Tier
              </label>
              <Select
                value={editForm.subscriptionTier}
                onValueChange={(value: 'free' | 'starter' | 'pro' | 'enterprise') =>
                  setEditForm({ ...editForm, subscriptionTier: value })
                }
              >
                <SelectTrigger className="glass-card border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10">
                  <SelectItem value="free" className="text-neutral-200">Free</SelectItem>
                  <SelectItem value="starter" className="text-neutral-200">Starter</SelectItem>
                  <SelectItem value="pro" className="text-neutral-200">Pro</SelectItem>
                  <SelectItem value="enterprise" className="text-neutral-200">Enterprise</SelectItem>
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
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isEditLoading || !editForm.name.trim()}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {isEditLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/95 px-5 py-3 shadow-2xl shadow-black/50 backdrop-blur-xl"
          >
            <span className="text-sm font-medium text-neutral-200">
              <span className="text-amber-400">{selectedIds.size}</span> selected
            </span>
            <div className="h-5 w-px bg-white/10" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBulkDeleteModal(true)}
              className="gap-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected
            </Button>
            <div className="h-5 w-px bg-white/10" />
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="gap-1.5 text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Modal */}
      <Dialog open={bulkDeleteModal} onOpenChange={() => { setBulkDeleteModal(false); setBulkDeleteConfirm(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Delete {selectedIds.size} Tenant{selectedIds.size !== 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              <span className="text-red-400">This action cannot be undone.</span>{' '}
              All data for these organizations including members, invitations, and subscriptions will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm text-neutral-300">
              Type <code className="rounded bg-neutral-800 px-1.5 py-0.5 text-red-400">DELETE</code> to confirm:
            </label>
            <Input
              value={bulkDeleteConfirm}
              onChange={(e) => setBulkDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="glass-card border-white/10 text-white"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setBulkDeleteModal(false); setBulkDeleteConfirm(''); }} disabled={isBulkLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isBulkLoading || bulkDeleteConfirm !== 'DELETE'}
            >
              {isBulkLoading ? 'Deleting...' : `Delete ${selectedIds.size} Tenant${selectedIds.size !== 1 ? 's' : ''}`}
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
  index: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onSuspend: () => void;
  onUnsuspend: () => void;
  onDelete: () => void;
}

function TenantCard({ tenant, index, isSelected, onToggleSelect, onEdit, onSuspend, onUnsuspend, onDelete }: TenantCardProps) {
  const isSuspended = tenant.subscriptionStatus === 'suspended';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300',
        'hover:border-white/20 hover:bg-white/[0.07] hover:shadow-xl hover:shadow-amber-500/5',
        isSuspended && 'border-red-500/20 bg-red-500/5',
        isSelected && 'border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/20'
      )}
    >
      {/* Gradient accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {/* Selection checkbox — top-left */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
        className={cn(
          'absolute left-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-md border transition-all',
          isSelected
            ? 'border-amber-500 bg-amber-500 text-white'
            : 'border-white/20 bg-white/5 text-transparent opacity-0 group-hover:opacity-100 hover:border-white/40'
        )}
      >
        {isSelected ? (
          <CheckSquare className="h-4 w-4" />
        ) : (
          <Square className="h-4 w-4 text-neutral-400" />
        )}
      </button>

      <div className="relative p-5">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600/20 to-orange-600/20 shadow-lg">
              {tenant.logo ? (
                <img src={tenant.logo} alt={tenant.name} className="h-6 w-6 rounded" />
              ) : (
                <Building2 className="h-5 w-5 text-amber-400" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-white">{tenant.name}</h3>
              <p className="truncate text-sm text-neutral-500">/{tenant.slug}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-white">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-card border-white/10">
              <DropdownMenuItem className="gap-2 text-neutral-200">
                <ExternalLink className="h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="gap-2 text-blue-400">
                <Edit className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              {isSuspended ? (
                <DropdownMenuItem onClick={onUnsuspend} className="gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Reactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onSuspend} className="gap-2 text-amber-400">
                  <Ban className="h-4 w-4" />
                  Suspend
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDelete} className="gap-2 text-red-400">
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge className={cn('border', tierColors[tenant.subscriptionTier])}>
            {tenant.subscriptionTier}
          </Badge>
          <Badge className={cn('border', statusColors[tenant.subscriptionStatus])}>
            {tenant.subscriptionStatus.replace('_', ' ')}
          </Badge>
        </div>

        {/* Stats */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/5 bg-white/5 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-neutral-500">
              <Users className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Members</span>
            </div>
            <p className="text-xl font-bold text-white">{tenant.memberCount}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/5 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-neutral-500">
              <Crown className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Owner</span>
            </div>
            <p className="truncate text-sm font-medium text-white">
              {tenant.owner?.name || 'Unknown'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/5 pt-4 text-xs text-neutral-500">
          <span>Created {new Date(tenant.createdAt).toLocaleDateString()}</span>
          {isSuspended && (
            <span className="flex items-center gap-1 text-red-400">
              <AlertTriangle className="h-3 w-3" />
              Suspended
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Skeleton
function TenantCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/10" />
          <div className="space-y-1.5">
            <div className="h-5 w-32 rounded bg-white/10" />
            <div className="h-4 w-20 rounded bg-white/10" />
          </div>
        </div>
        <div className="h-8 w-8 rounded bg-white/10" />
      </div>
      <div className="mb-4 flex gap-2">
        <div className="h-6 w-16 rounded-full bg-white/10" />
        <div className="h-6 w-16 rounded-full bg-white/10" />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="space-y-2 rounded-xl border border-white/5 bg-white/5 p-3">
          <div className="h-3 w-16 rounded bg-white/10" />
          <div className="h-6 w-12 rounded bg-white/10" />
        </div>
        <div className="space-y-2 rounded-xl border border-white/5 bg-white/5 p-3">
          <div className="h-3 w-16 rounded bg-white/10" />
          <div className="h-4 w-20 rounded bg-white/10" />
        </div>
      </div>
      <div className="border-t border-white/5 pt-4">
        <div className="h-3 w-24 rounded bg-white/10" />
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
  if (hasFilters) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center"
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-800/50">
          <Search className="h-7 w-7 text-neutral-500" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-white">No matching tenants</h3>
        <p className="mb-4 max-w-sm text-sm text-neutral-400">
          Try adjusting your filters or search query.
        </p>
        <Button
          variant="ghost"
          onClick={onClearFilters}
          className="gap-2 rounded-lg border border-white/10 text-neutral-300 hover:bg-white/5"
        >
          Clear filters
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-600/20 to-orange-600/20"
      >
        <Building2 className="h-8 w-8 text-amber-400" />
      </motion.div>
      <h3 className="mb-1 text-lg font-semibold text-white">No tenants yet</h3>
      <p className="max-w-sm text-sm text-neutral-400">
        When organizations sign up, they'll appear here.
      </p>
    </motion.div>
  );
}
