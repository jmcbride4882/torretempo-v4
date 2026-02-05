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
import {
  fetchTenants,
  suspendTenant,
  unsuspendTenant,
  deleteTenant,
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
        if (silent) toast.success('Tenants refreshed');
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

  const handleAction = async () => {
    if (!confirmModal) return;

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
          await deleteTenant(confirmModal.tenant.id);
          toast.success(`${confirmModal.tenant.name} has been deleted`);
          break;
      }
      setConfirmModal(null);
      loadTenants(true);
    } catch (error) {
      console.error('Error performing action:', error);
      toast.error('Failed to perform action');
    } finally {
      setIsActionLoading(false);
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
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex items-center justify-center gap-2"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-neutral-400 hover:text-white"
          >
            Previous
          </Button>
          <span className="text-sm text-neutral-400">
            Page <span className="font-medium text-white">{page}</span> of{' '}
            <span className="font-medium text-white">{totalPages}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-neutral-400 hover:text-white"
          >
            Next
          </Button>
        </motion.div>
      )}

      {/* Confirmation Modal */}
      <Dialog open={!!confirmModal} onOpenChange={() => setConfirmModal(null)}>
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
              disabled={isActionLoading}
              className={confirmModal?.type === 'unsuspend' ? 'bg-emerald-600 hover:bg-emerald-500' : ''}
            >
              {isActionLoading ? 'Processing...' : confirmModal?.type === 'delete' ? 'Delete' : confirmModal?.type === 'suspend' ? 'Suspend' : 'Reactivate'}
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
  onSuspend: () => void;
  onUnsuspend: () => void;
  onDelete: () => void;
}

function TenantCard({ tenant, index, onSuspend, onUnsuspend, onDelete }: TenantCardProps) {
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
        isSuspended && 'border-red-500/20 bg-red-500/5'
      )}
    >
      {/* Gradient accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

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
