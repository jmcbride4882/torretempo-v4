/**
 * UsersPage - Admin Users Management
 * List users, search, ban/unban, grant/revoke admin access
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Users,
  Search,
  RefreshCw,
  Shield,
  ShieldOff,
  Ban,
  CheckCircle2,
  MoreVertical,
  Mail,
  MailCheck,
  Building2,
  UserMinus,
  UserPlus,
  Edit,
  Download,
  Square,
  CheckSquare,
  X,
  Trash2,
  AlertTriangle,
  Key,
  User,
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
  fetchUsers,
  banUser,
  unbanUser,
  grantAdmin,
  revokeAdmin,
  updateUser,
  bulkBanUsers,
  bulkDeleteUsers,
  sendPasswordReset,
  resendVerificationEmail,
} from '@/lib/api/admin';
import type { AdminUser } from '@/lib/api/admin';

export default function UsersPage() {
  // State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 12;

  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    type: 'ban' | 'unban' | 'grant-admin' | 'revoke-admin';
    user: AdminUser;
  } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Edit modal state
  const [editModal, setEditModal] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: null as 'admin' | null,
    emailVerified: false,
  });
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBanModal, setBulkBanModal] = useState(false);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [bulkBanReason, setBulkBanReason] = useState('');
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState('');
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // Fetch users
  const loadUsers = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setIsRefreshing(silent);

      try {
        const response = await fetchUsers({
          search: searchQuery || undefined,
          role: roleFilter !== 'all' ? roleFilter : undefined,
          banned: statusFilter === 'banned' ? true : statusFilter === 'active' ? false : undefined,
          isAdmin: statusFilter === 'admin' ? true : undefined,
          page,
          limit,
        });
        setUsers(response.users || []);
        setTotal(response.total || 0);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [searchQuery, roleFilter, statusFilter, page]
  );

  useEffect(() => {
    loadUsers();
    // Auto-refresh every 10 seconds for live data
    const interval = setInterval(() => loadUsers(true), 10000);
    return () => clearInterval(interval);
  }, [loadUsers]);

  // Handlers
  const handleRefresh = () => loadUsers(true);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter === 'banned') params.set('banned', 'true');
      else if (statusFilter === 'active') params.set('banned', 'false');
      if (statusFilter === 'admin') params.set('isAdmin', 'true');

      const url = `/api/admin/users/export${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      toast.success('Users exported successfully');
    } catch (error) {
      console.error('Error exporting users:', error);
      toast.error('Failed to export users');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAction = async () => {
    if (!confirmModal) return;

    setIsActionLoading(true);
    try {
      switch (confirmModal.type) {
        case 'ban':
          await banUser(confirmModal.user.id);
          toast.success(`${confirmModal.user.name} has been banned`);
          break;
        case 'unban':
          await unbanUser(confirmModal.user.id);
          toast.success(`${confirmModal.user.name} has been unbanned`);
          break;
        case 'grant-admin':
          await grantAdmin(confirmModal.user.id);
          toast.success(`${confirmModal.user.name} is now a platform admin`);
          break;
        case 'revoke-admin':
          await revokeAdmin(confirmModal.user.id);
          toast.success(`Admin access revoked from ${confirmModal.user.name}`);
          break;
      }
      setConfirmModal(null);
      loadUsers(true);
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
      toast.error('User name is required');
      return;
    }
    if (!editForm.email.trim()) {
      toast.error('Email is required');
      return;
    }

    setIsEditLoading(true);
    try {
      await updateUser(editModal.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        emailVerified: editForm.emailVerified,
      });
      toast.success(`${editForm.name} has been updated`);
      setEditModal(null);
      loadUsers(true);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    } finally {
      setIsEditLoading(false);
    }
  };

  const openEditModal = (user: AdminUser) => {
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.isAdmin ? 'admin' : null,
      emailVerified: user.emailVerified,
    });
    setEditModal(user);
  };

  // Email action handlers
  const handleSendPasswordReset = async (user: AdminUser) => {
    try {
      await sendPasswordReset(user.id);
      toast.success(`Password reset email sent to ${user.email}`);
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast.error('Failed to send password reset email');
    }
  };

  const handleResendVerification = async (user: AdminUser) => {
    if (user.emailVerified) {
      toast.error('Email is already verified');
      return;
    }
    
    try {
      await resendVerificationEmail(user.id);
      toast.success(`Verification email sent to ${user.email}`);
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast.error('Failed to send verification email');
    }
  };

  // Impersonation handler
  const handleImpersonate = async (user: AdminUser) => {
    if (user.isAdmin) {
      toast.error('Cannot impersonate other administrators');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to impersonate ${user.name} (${user.email})?\n\nYou will be logged in as this user and can perform actions on their behalf. This action is logged in the audit trail.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/users/${user.id}/impersonate`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Impersonation failed');
      }

      toast.success(`Now impersonating ${user.name}`);
      
      // Redirect to tenant dashboard or refresh to update session
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error) {
      console.error('Error during impersonation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to impersonate user');
    }
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

  const selectableUsers = users.filter((u) => !u.banned);
  const allSelected = selectableUsers.length > 0 && selectableUsers.every((u) => selectedIds.has(u.id));
  const someSelected = selectableUsers.some((u) => selectedIds.has(u.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableUsers.map((u) => u.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Bulk ban handler
  const handleBulkBan = async () => {
    if (!bulkBanReason.trim()) {
      toast.error('Ban reason is required');
      return;
    }
    setIsBulkLoading(true);
    try {
      const result = await bulkBanUsers(Array.from(selectedIds), bulkBanReason.trim());
      toast.success(`${result.success} user(s) banned successfully`);
      if (result.failed > 0) {
        toast.warning(`${result.failed} user(s) failed to ban`);
      }
      setBulkBanModal(false);
      setBulkBanReason('');
      clearSelection();
      loadUsers(true);
    } catch (error) {
      toast.error('Failed to ban users');
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (bulkDeleteConfirm !== 'DELETE') {
      toast.error('Type DELETE to confirm');
      return;
    }
    setIsBulkLoading(true);
    try {
      const result = await bulkDeleteUsers(Array.from(selectedIds));
      toast.success(`${result.success} user(s) deleted successfully`);
      if (result.failed > 0) {
        toast.warning(`${result.failed} user(s) failed to delete`);
      }
      setBulkDeleteModal(false);
      setBulkDeleteConfirm('');
      clearSelection();
      loadUsers(true);
    } catch (error) {
      toast.error('Failed to delete users');
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Stats
  const adminCount = users.filter((u) => u.isAdmin).length;
  const bannedCount = users.filter((u) => u.banned).length;
  const verifiedCount = users.filter((u) => u.emailVerified).length;
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 shadow-lg shadow-blue-500/10">
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Users</h1>
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
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="glass-card border-white/10 pl-9 text-white placeholder:text-neutral-500 focus:border-blue-500"
          />
        </div>

        {/* Role filter */}
        <Select
          value={roleFilter}
          onValueChange={(value) => {
            setRoleFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px] glass-card border-white/10 text-white">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent className="glass-card border-white/10">
            <SelectItem value="all" className="text-neutral-200">All Roles</SelectItem>
            <SelectItem value="owner" className="text-neutral-200">Owner</SelectItem>
            <SelectItem value="tenantAdmin" className="text-neutral-200">Tenant Admin</SelectItem>
            <SelectItem value="manager" className="text-neutral-200">Manager</SelectItem>
            <SelectItem value="employee" className="text-neutral-200">Employee</SelectItem>
          </SelectContent>
        </Select>

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
            <SelectItem value="banned" className="text-neutral-200">Banned</SelectItem>
            <SelectItem value="admin" className="text-neutral-200">Admins Only</SelectItem>
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
        {users.length > 0 && (
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-neutral-300 transition-colors hover:bg-white/10"
          >
            {allSelected ? (
              <CheckSquare className="h-4 w-4 text-blue-400" />
            ) : someSelected ? (
              <div className="relative">
                <Square className="h-4 w-4 text-blue-400" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-sm bg-blue-400" />
                </div>
              </div>
            ) : (
              <Square className="h-4 w-4" />
            )}
            <span className="text-xs font-medium">Select All</span>
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">{total}</span> total
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">{adminCount}</span> admins
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">{verifiedCount}</span> verified
          </span>
        </div>
        {bannedCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-neutral-400">
              <span className="font-medium text-neutral-200">{bannedCount}</span> banned
            </span>
          </div>
        )}
      </motion.div>

      {/* Users grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <UserCardSkeleton key={i} />
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            hasFilters={searchQuery !== '' || roleFilter !== 'all' || statusFilter !== 'all'}
            onClearFilters={() => {
              setSearchQuery('');
              setRoleFilter('all');
              setStatusFilter('all');
            }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {users.map((user, index) => (
                <UserCard
                  key={user.id}
                  user={user}
                  index={index}
                  isSelected={selectedIds.has(user.id)}
                  onToggleSelect={() => toggleSelection(user.id)}
                  onEdit={() => openEditModal(user)}
                  onBan={() => setConfirmModal({ type: 'ban', user })}
                  onUnban={() => setConfirmModal({ type: 'unban', user })}
                  onGrantAdmin={() => setConfirmModal({ type: 'grant-admin', user })}
                  onRevokeAdmin={() => setConfirmModal({ type: 'revoke-admin', user })}
                  onSendPasswordReset={() => handleSendPasswordReset(user)}
                  onResendVerification={() => handleResendVerification(user)}
                  onImpersonate={() => handleImpersonate(user)}
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
      <Dialog open={!!confirmModal} onOpenChange={() => setConfirmModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmModal?.type === 'ban' && 'Ban User'}
              {confirmModal?.type === 'unban' && 'Unban User'}
              {confirmModal?.type === 'grant-admin' && 'Grant Admin Access'}
              {confirmModal?.type === 'revoke-admin' && 'Revoke Admin Access'}
            </DialogTitle>
            <DialogDescription>
              {confirmModal?.type === 'ban' && (
                <>
                  Are you sure you want to ban <strong>{confirmModal.user.name}</strong>?
                  They will be logged out and unable to access the platform.
                </>
              )}
              {confirmModal?.type === 'unban' && (
                <>
                  Unban <strong>{confirmModal?.user.name}</strong>? They will regain access
                  to the platform.
                </>
              )}
              {confirmModal?.type === 'grant-admin' && (
                <>
                  Grant platform admin access to <strong>{confirmModal?.user.name}</strong>?
                  They will have full access to all admin features.
                </>
              )}
              {confirmModal?.type === 'revoke-admin' && (
                <>
                  Revoke admin access from <strong>{confirmModal?.user.name}</strong>?
                  They will lose access to admin features.
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
              variant={confirmModal?.type === 'ban' || confirmModal?.type === 'revoke-admin' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={isActionLoading}
              className={confirmModal?.type === 'unban' || confirmModal?.type === 'grant-admin' ? 'bg-emerald-600 hover:bg-emerald-500' : ''}
            >
              {isActionLoading ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details, role, and email verification status
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Name field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">
                Name
              </label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter user name"
                className="glass-card border-white/10 text-white"
                autoFocus
              />
            </div>

            {/* Email field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">
                Email
              </label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="user@example.com"
                className="glass-card border-white/10 text-white"
              />
            </div>

            {/* Role field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">
                Platform Role
              </label>
              <Select
                value={editForm.role || 'user'}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, role: value === 'admin' ? 'admin' : null })
                }
              >
                <SelectTrigger className="glass-card border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10">
                  <SelectItem value="user" className="text-neutral-200">Regular User</SelectItem>
                  <SelectItem value="admin" className="text-neutral-200">Platform Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Email Verified toggle */}
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="space-y-0.5">
                <label className="text-sm font-medium text-neutral-300">
                  Email Verified
                </label>
                <p className="text-xs text-neutral-500">
                  Manually verify user's email address
                </p>
              </div>
              <Button
                type="button"
                variant={editForm.emailVerified ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditForm({ ...editForm, emailVerified: !editForm.emailVerified })}
                className={editForm.emailVerified ? 'bg-emerald-600 hover:bg-emerald-500' : ''}
              >
                {editForm.emailVerified ? 'Verified' : 'Unverified'}
              </Button>
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
              disabled={isEditLoading || !editForm.name.trim() || !editForm.email.trim()}
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
              <span className="text-blue-400">{selectedIds.size}</span> selected
            </span>
            <div className="h-5 w-px bg-white/10" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBulkBanModal(true)}
              className="gap-1.5 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
            >
              <Ban className="h-4 w-4" />
              Ban Selected
            </Button>
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

      {/* Bulk Ban Modal */}
      <Dialog open={bulkBanModal} onOpenChange={() => { setBulkBanModal(false); setBulkBanReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Ban {selectedIds.size} User{selectedIds.size !== 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              These users will be logged out and unable to access the platform.
              Already-banned users are excluded from selection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium text-neutral-300">
              Ban Reason <span className="text-red-400">*</span>
            </label>
            <Input
              value={bulkBanReason}
              onChange={(e) => setBulkBanReason(e.target.value)}
              placeholder="Enter reason for banning..."
              className="glass-card border-white/10 text-white"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setBulkBanModal(false); setBulkBanReason(''); }} disabled={isBulkLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkBan}
              disabled={isBulkLoading || !bulkBanReason.trim()}
              className="bg-amber-600 hover:bg-amber-500"
            >
              {isBulkLoading ? 'Banning...' : `Ban ${selectedIds.size} User${selectedIds.size !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Modal */}
      <Dialog open={bulkDeleteModal} onOpenChange={() => { setBulkDeleteModal(false); setBulkDeleteConfirm(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Delete {selectedIds.size} User{selectedIds.size !== 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              <span className="text-red-400">This action cannot be undone.</span>{' '}
              All data for these users will be permanently deleted.
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
              {isBulkLoading ? 'Deleting...' : `Delete ${selectedIds.size} User${selectedIds.size !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// User Card Component
interface UserCardProps {
  user: AdminUser;
  index: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onBan: () => void;
  onUnban: () => void;
  onGrantAdmin: () => void;
  onRevokeAdmin: () => void;
  onSendPasswordReset: () => void;
  onResendVerification: () => void;
  onImpersonate: () => void;
}

function UserCard({ user, index, isSelected, onToggleSelect, onEdit, onBan, onUnban, onGrantAdmin, onRevokeAdmin, onSendPasswordReset, onResendVerification, onImpersonate }: UserCardProps) {
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
        'hover:border-white/20 hover:bg-white/[0.07] hover:shadow-xl hover:shadow-blue-500/5',
        user.banned && 'border-red-500/20 bg-red-500/5',
        isSelected && 'border-blue-500/40 bg-blue-500/10 ring-1 ring-blue-500/20'
      )}
    >
      {/* Gradient accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {/* Selection checkbox — top-left */}
      {!user.banned && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
          className={cn(
            'absolute left-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-md border transition-all',
            isSelected
              ? 'border-blue-500 bg-blue-500 text-white'
              : 'border-white/20 bg-white/5 text-transparent opacity-0 group-hover:opacity-100 hover:border-white/40'
          )}
        >
          {isSelected ? (
            <CheckSquare className="h-4 w-4" />
          ) : (
            <Square className="h-4 w-4 text-neutral-400" />
          )}
        </button>
      )}

      <div className="relative p-5">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name}
                  className="h-11 w-11 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/80 to-indigo-600/80 text-sm font-semibold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              {user.isAdmin && (
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500">
                  <Shield className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-white">{user.name}</h3>
              <p className="truncate text-sm text-neutral-500">{user.email}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-white">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-card border-white/10">
              <DropdownMenuItem onClick={onEdit} className="gap-2 text-blue-400">
                <Edit className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              {!user.isAdmin && (
                <>
                  <DropdownMenuItem onClick={onImpersonate} className="gap-2 text-purple-400">
                    <User className="h-4 w-4" />
                    Impersonate User
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                </>
              )}
              <DropdownMenuItem onClick={onSendPasswordReset} className="gap-2 text-orange-400">
                <Key className="h-4 w-4" />
                Send Password Reset
              </DropdownMenuItem>
              {!user.emailVerified && (
                <DropdownMenuItem onClick={onResendVerification} className="gap-2 text-cyan-400">
                  <MailCheck className="h-4 w-4" />
                  Resend Verification
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-white/10" />
              {user.isAdmin ? (
                <DropdownMenuItem onClick={onRevokeAdmin} className="gap-2 text-amber-400">
                  <ShieldOff className="h-4 w-4" />
                  Revoke Admin
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onGrantAdmin} className="gap-2 text-emerald-400">
                  <Shield className="h-4 w-4" />
                  Grant Admin
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-white/10" />
              {user.banned ? (
                <DropdownMenuItem onClick={onUnban} className="gap-2 text-emerald-400">
                  <UserPlus className="h-4 w-4" />
                  Unban User
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onBan} className="gap-2 text-red-400">
                  <UserMinus className="h-4 w-4" />
                  Ban User
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {user.isAdmin && (
            <Badge className="border border-amber-500/30 bg-amber-500/20 text-amber-300">
              <Shield className="mr-1 h-3 w-3" />
              Admin
            </Badge>
          )}
          {user.banned ? (
            <Badge className="border border-red-500/30 bg-red-500/20 text-red-300">
              <Ban className="mr-1 h-3 w-3" />
              Banned
            </Badge>
          ) : user.emailVerified ? (
            <Badge className="border border-emerald-500/30 bg-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Verified
            </Badge>
          ) : (
            <Badge className="border border-neutral-500/30 bg-neutral-500/20 text-neutral-300">
              <Mail className="mr-1 h-3 w-3" />
              Unverified
            </Badge>
          )}
        </div>

        {/* Organizations */}
        {user.organizations.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-1.5 text-neutral-500">
              <Building2 className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Organizations</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {user.organizations.slice(0, 3).map((org) => (
                <span
                  key={org.id}
                  className="rounded-md bg-white/5 px-2 py-1 text-xs text-neutral-300"
                >
                  {org.name}
                </span>
              ))}
              {user.organizations.length > 3 && (
                <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-neutral-500">
                  +{user.organizations.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/5 pt-4 text-xs text-neutral-500">
          <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
          <span className="capitalize">{user.role}</span>
        </div>
      </div>
    </motion.div>
  );
}

// Skeleton
function UserCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/10" />
          <div className="space-y-1.5">
            <div className="h-5 w-28 rounded bg-white/10" />
            <div className="h-4 w-36 rounded bg-white/10" />
          </div>
        </div>
        <div className="h-8 w-8 rounded bg-white/10" />
      </div>
      <div className="mb-4 flex gap-2">
        <div className="h-6 w-20 rounded-full bg-white/10" />
      </div>
      <div className="mb-4">
        <div className="mb-2 h-3 w-20 rounded bg-white/10" />
        <div className="flex gap-1.5">
          <div className="h-6 w-20 rounded bg-white/10" />
          <div className="h-6 w-16 rounded bg-white/10" />
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
        <h3 className="mb-1 text-lg font-semibold text-white">No matching users</h3>
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
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20"
      >
        <Users className="h-8 w-8 text-blue-400" />
      </motion.div>
      <h3 className="mb-1 text-lg font-semibold text-white">No users yet</h3>
      <p className="max-w-sm text-sm text-neutral-400">
        When users sign up, they'll appear here.
      </p>
    </motion.div>
  );
}
