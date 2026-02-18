/**
 * UsersPage - Admin Users Management
 * List users, search, ban/unban, grant/revoke admin access
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import { DateRangePicker } from '@/components/ui/date-range-picker';
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
  const { t } = useTranslation();

  // State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 12;

  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    type: 'ban' | 'unban' | 'grant-admin' | 'revoke-admin';
    user: AdminUser;
  } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [banReason, setBanReason] = useState('');

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
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
          limit,
        });
        setUsers(response.users || []);
        setTotal(response.total || 0);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error(t('admin.toasts.failedLoadUsers'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [searchQuery, roleFilter, statusFilter, startDate, endDate, page]
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
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

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
      toast.success(t('admin.toasts.usersExportSuccess'));
    } catch (error) {
      console.error('Error exporting users:', error);
      toast.error(t('admin.toasts.failedExportUsers'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleAction = async () => {
    if (!confirmModal) return;

    // Validate ban reason if banning
    if (confirmModal.type === 'ban' && !banReason.trim()) {
      toast.error(t('admin.users.banReasonRequired'));
      return;
    }

    setIsActionLoading(true);
    try {
      switch (confirmModal.type) {
        case 'ban':
          await banUser(confirmModal.user.id, banReason.trim());
          toast.success(t('admin.toasts.userBanned', { name: confirmModal.user.name }));
          break;
        case 'unban':
          await unbanUser(confirmModal.user.id);
          toast.success(t('admin.toasts.userUnbanned', { name: confirmModal.user.name }));
          break;
        case 'grant-admin':
          await grantAdmin(confirmModal.user.id);
          toast.success(t('admin.toasts.adminGranted', { name: confirmModal.user.name }));
          break;
        case 'revoke-admin':
          await revokeAdmin(confirmModal.user.id);
          toast.success(t('admin.toasts.adminRevoked', { name: confirmModal.user.name }));
          break;
      }
      setConfirmModal(null);
      setBanReason('');
      loadUsers(true);
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
      toast.error(t('admin.toasts.userNameRequired'));
      return;
    }
    if (!editForm.email.trim()) {
      toast.error(t('admin.toasts.emailRequired'));
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
      toast.success(t('admin.toasts.userUpdated', { name: editForm.name }));
      setEditModal(null);
      loadUsers(true);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(t('admin.toasts.failedUpdateUser'));
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
      toast.success(t('admin.toasts.passwordResetSent', { email: user.email }));
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast.error(t('admin.toasts.failedPasswordReset'));
    }
  };

  const handleResendVerification = async (user: AdminUser) => {
    if (user.emailVerified) {
      toast.error(t('admin.toasts.emailAlreadyVerified'));
      return;
    }

    try {
      await resendVerificationEmail(user.id);
      toast.success(t('admin.toasts.verificationSent', { email: user.email }));
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast.error(t('admin.toasts.failedVerification'));
    }
  };

  // Impersonation handler
  const handleImpersonate = async (user: AdminUser) => {
    if (user.isAdmin) {
      toast.error(t('admin.toasts.cannotImpersonateAdmin'));
      return;
    }

    const confirmed = window.confirm(
      t('admin.toasts.impersonateConfirm', { name: user.name, email: user.email })
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

      toast.success(t('admin.toasts.nowImpersonating', { name: user.name }));

      // Redirect to tenant dashboard or refresh to update session
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error) {
      console.error('Error during impersonation:', error);
      toast.error(error instanceof Error ? error.message : t('admin.toasts.failedImpersonate'));
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
      toast.error(t('admin.users.banReasonRequired'));
      return;
    }
    setIsBulkLoading(true);
    try {
      const result = await bulkBanUsers(Array.from(selectedIds), bulkBanReason.trim());
      toast.success(t('admin.toasts.bulkBanSuccess', { count: result.success }));
      if (result.failed > 0) {
        toast.warning(t('admin.toasts.bulkBanFailed', { count: result.failed }));
      }
      setBulkBanModal(false);
      setBulkBanReason('');
      clearSelection();
      loadUsers(true);
    } catch (error) {
      toast.error(t('admin.toasts.failedBanUsers'));
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (bulkDeleteConfirm !== 'DELETE') {
      toast.error(t('admin.toasts.typeDeleteConfirm'));
      return;
    }
    setIsBulkLoading(true);
    try {
      const result = await bulkDeleteUsers(Array.from(selectedIds));
      toast.success(t('admin.toasts.bulkDeleteUsersSuccess', { count: result.success }));
      if (result.failed > 0) {
        // Show detailed error messages
        result.errors.forEach((error) => {
          toast.error(error, { duration: 5000 });
        });
      }
      setBulkDeleteModal(false);
      setBulkDeleteConfirm('');
      clearSelection();
      loadUsers(true);
    } catch (error) {
      toast.error(t('admin.toasts.failedDeleteUsers'));
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Stats
  const adminCount = users.filter((u) => u.isAdmin).length;
  const bannedCount = users.filter((u) => u.banned).length;
  const verifiedCount = users.filter((u) => u.emailVerified).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 shadow-sm">
            <Users className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{t('admin.users.title')}</h1>
            <p className="text-sm text-slate-500">
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
              className="gap-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
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
              className="gap-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
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
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            type="text"
            placeholder={t('common.search') + '...'}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white shadow-sm pl-9 text-slate-900 placeholder:text-slate-400 focus:border-violet-500"
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
          <SelectTrigger className="w-[140px] rounded-xl border border-slate-200 bg-white shadow-sm text-slate-900">
            <SelectValue placeholder={t('common.filter')} />
          </SelectTrigger>
          <SelectContent className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <SelectItem value="all" className="text-slate-700">{t('admin.filters.allRoles')}</SelectItem>
            <SelectItem value="owner" className="text-slate-700">{t('admin.filters.owner')}</SelectItem>
            <SelectItem value="tenantAdmin" className="text-slate-700">{t('admin.filters.tenantAdmin')}</SelectItem>
            <SelectItem value="manager" className="text-slate-700">{t('admin.filters.manager')}</SelectItem>
            <SelectItem value="employee" className="text-slate-700">{t('admin.filters.employee')}</SelectItem>
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
          <SelectTrigger className="w-[140px] rounded-xl border border-slate-200 bg-white shadow-sm text-slate-900">
            <SelectValue placeholder={t('common.filter')} />
          </SelectTrigger>
          <SelectContent className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <SelectItem value="all" className="text-slate-700">{t('admin.filters.allStatus')}</SelectItem>
            <SelectItem value="active" className="text-slate-700">{t('admin.active')}</SelectItem>
            <SelectItem value="banned" className="text-slate-700">{t('admin.banned')}</SelectItem>
            <SelectItem value="admin" className="text-slate-700">{t('admin.admins')}</SelectItem>
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
        {users.length > 0 && (
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700 transition-colors hover:bg-slate-100"
          >
            {allSelected ? (
              <CheckSquare className="h-4 w-4 text-violet-600" />
            ) : someSelected ? (
              <div className="relative">
                <Square className="h-4 w-4 text-violet-600" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-sm bg-violet-600" />
                </div>
              </div>
            ) : (
              <Square className="h-4 w-4" />
            )}
            <span className="text-xs font-medium">{t('admin.selectAll')}</span>
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="text-slate-500">
            <span className="font-medium text-slate-700">{total}</span> {t('admin.total')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-violet-500" />
          <span className="text-slate-500">
            <span className="font-medium text-slate-700">{adminCount}</span> {t('admin.admins')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-slate-500">
            <span className="font-medium text-slate-700">{verifiedCount}</span> {t('admin.verified')}
          </span>
        </div>
        {bannedCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-slate-500">
              <span className="font-medium text-slate-700">{bannedCount}</span> {t('admin.banned')}
            </span>
          </div>
        )}
      </div>

      {/* Users grid */}
      <div>
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
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Dialog open={!!confirmModal} onOpenChange={() => { setConfirmModal(null); setBanReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmModal?.type === 'ban' && t('admin.users.ban')}
              {confirmModal?.type === 'unban' && t('admin.users.unban')}
              {confirmModal?.type === 'grant-admin' && t('admin.users.grantAdmin')}
              {confirmModal?.type === 'revoke-admin' && t('admin.users.revokeAdmin')}
            </DialogTitle>
            <DialogDescription>
              {confirmModal?.type === 'ban' && (
                <>
                  {t('admin.users.banConfirm', { name: confirmModal.user.name })}
                </>
              )}
              {confirmModal?.type === 'unban' && (
                <>
                  {t('admin.users.unbanConfirm', { name: confirmModal?.user.name })}
                </>
              )}
              {confirmModal?.type === 'grant-admin' && (
                <>
                  {t('admin.users.grantAdminConfirm', { name: confirmModal?.user.name })}
                </>
              )}
              {confirmModal?.type === 'revoke-admin' && (
                <>
                  {t('admin.users.revokeAdminConfirm', { name: confirmModal?.user.name })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Ban reason input (only for ban action) */}
          {confirmModal?.type === 'ban' && (
            <div className="space-y-2 py-2">
              <label className="text-sm font-medium text-slate-700">
                {t('admin.users.banReason')} <span className="text-red-400">*</span>
              </label>
              <Input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder={t('admin.users.banReason') + '...'}
                className="rounded-xl border border-slate-200 bg-white shadow-sm text-slate-900"
                autoFocus
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => { setConfirmModal(null); setBanReason(''); }}
              disabled={isActionLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant={confirmModal?.type === 'ban' || confirmModal?.type === 'revoke-admin' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={isActionLoading || (confirmModal?.type === 'ban' && !banReason.trim())}
              className={confirmModal?.type === 'unban' || confirmModal?.type === 'grant-admin' ? 'bg-emerald-600 hover:bg-emerald-500' : ''}
            >
              {isActionLoading ? t('common.loading') + '...' : t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('admin.users.editUser')}</DialogTitle>
            <DialogDescription>
              {t('admin.users.editUserDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {t('admin.users.name')}
              </label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder={t('admin.users.name')}
                className="rounded-xl border border-slate-200 bg-white shadow-sm text-slate-900"
                autoFocus
              />
            </div>

            {/* Email field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {t('admin.users.email')}
              </label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="user@example.com"
                className="rounded-xl border border-slate-200 bg-white shadow-sm text-slate-900"
              />
            </div>

            {/* Role field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {t('admin.users.platformRole')}
              </label>
              <Select
                value={editForm.role || 'user'}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, role: value === 'admin' ? 'admin' : null })
                }
              >
                <SelectTrigger className="rounded-xl border border-slate-200 bg-white shadow-sm text-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <SelectItem value="user" className="text-slate-700">{t('admin.users.regularUser')}</SelectItem>
                  <SelectItem value="admin" className="text-slate-700">{t('admin.users.platformAdmin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Email Verified toggle */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="space-y-0.5">
                <label className="text-sm font-medium text-slate-700">
                  {t('admin.users.emailVerified')}
                </label>
                <p className="text-xs text-slate-500">
                  {t('admin.users.manuallyVerify')}
                </p>
              </div>
              <Button
                type="button"
                variant={editForm.emailVerified ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditForm({ ...editForm, emailVerified: !editForm.emailVerified })}
                className={editForm.emailVerified ? 'bg-emerald-600 hover:bg-emerald-500' : ''}
              >
                {editForm.emailVerified ? t('admin.users.emailVerified') : t('admin.users.unverified')}
              </Button>
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
              disabled={isEditLoading || !editForm.name.trim() || !editForm.email.trim()}
              className="bg-violet-600 hover:bg-violet-500"
            >
              {isEditLoading ? t('common.loading') + '...' : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div
          className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-5 py-3 shadow-lg"
        >
          <span className="text-sm font-medium text-slate-700">
            <span className="text-violet-600">{selectedIds.size}</span> {t('admin.selected')}
          </span>
          <div className="h-5 w-px bg-slate-200" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBulkBanModal(true)}
            className="gap-1.5 text-violet-600 hover:bg-violet-50 hover:text-violet-700"
          >
            <Ban className="h-4 w-4" />
            {t('admin.users.ban')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBulkDeleteModal(true)}
            className="gap-1.5 text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            {t('common.delete')}
          </Button>
          <div className="h-5 w-px bg-slate-200" />
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="gap-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
            {t('admin.clearSelection')}
          </Button>
        </div>
      )}

      {/* Bulk Ban Modal */}
      <Dialog open={bulkBanModal} onOpenChange={() => { setBulkBanModal(false); setBulkBanReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-violet-600" />
              {t('admin.bulkBan.title', { count: selectedIds.size })}
            </DialogTitle>
            <DialogDescription>
              {t('admin.bulkBan.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium text-slate-700">
              {t('admin.users.banReason')} <span className="text-red-400">*</span>
            </label>
            <Input
              value={bulkBanReason}
              onChange={(e) => setBulkBanReason(e.target.value)}
              placeholder={t('admin.users.banReason') + '...'}
              className="rounded-xl border border-slate-200 bg-white shadow-sm text-slate-900"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setBulkBanModal(false); setBulkBanReason(''); }} disabled={isBulkLoading}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkBan}
              disabled={isBulkLoading || !bulkBanReason.trim()}
              className="bg-violet-600 hover:bg-violet-500"
            >
              {isBulkLoading ? t('common.loading') + '...' : t('admin.bulkBan.banCount', { count: selectedIds.size })}
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
              {t('admin.bulkDelete.title', { count: selectedIds.size })}
            </DialogTitle>
            <DialogDescription>
              <span className="text-red-400">{t('admin.bulkDelete.cannotUndo')}</span>{' '}
              {t('admin.bulkDelete.usersWarning')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm text-slate-700">
              {t('admin.bulkDelete.typeDeleteLabel')} <code className="rounded bg-slate-100 px-1.5 py-0.5 text-red-400">DELETE</code>:
            </label>
            <Input
              value={bulkDeleteConfirm}
              onChange={(e) => setBulkDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="rounded-xl border border-slate-200 bg-white shadow-sm text-slate-900"
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

function UserCard({ user, isSelected, onToggleSelect, onEdit, onBan, onUnban, onGrantAdmin, onRevokeAdmin, onSendPasswordReset, onResendVerification, onImpersonate }: UserCardProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300',
        'hover:border-slate-300 hover:shadow-md',
        user.banned && 'border-red-200 bg-red-50',
        isSelected && 'border-violet-400 bg-violet-50 ring-1 ring-violet-300'
      )}
    >
      {/* Gradient accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {/* Selection checkbox -- top-left */}
      {!user.banned && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
          className={cn(
            'absolute left-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-md border transition-all',
            isSelected
              ? 'border-violet-500 bg-violet-500 text-white'
              : 'border-slate-300 bg-slate-50 text-transparent opacity-0 group-hover:opacity-100 hover:border-slate-400'
          )}
        >
          {isSelected ? (
            <CheckSquare className="h-4 w-4" />
          ) : (
            <Square className="h-4 w-4 text-slate-400" />
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
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-sm font-semibold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              {user.isAdmin && (
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500">
                  <Shield className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-slate-900">{user.name}</h3>
              <p className="truncate text-sm text-slate-500">{user.email}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <DropdownMenuItem onClick={onEdit} className="gap-2 text-blue-600">
                <Edit className="h-4 w-4" />
                {t('common.edit')}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-200" />
              {!user.isAdmin && (
                <>
                  <DropdownMenuItem onClick={onImpersonate} className="gap-2 text-purple-600">
                    <User className="h-4 w-4" />
                    {t('admin.users.impersonate')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-200" />
                </>
              )}
              <DropdownMenuItem onClick={onSendPasswordReset} className="gap-2 text-orange-600">
                <Key className="h-4 w-4" />
                {t('admin.users.sendPasswordReset')}
              </DropdownMenuItem>
              {!user.emailVerified && (
                <DropdownMenuItem onClick={onResendVerification} className="gap-2 text-cyan-600">
                  <MailCheck className="h-4 w-4" />
                  {t('admin.users.resendVerification')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-slate-200" />
              {user.isAdmin ? (
                <DropdownMenuItem onClick={onRevokeAdmin} className="gap-2 text-violet-600">
                  <ShieldOff className="h-4 w-4" />
                  {t('admin.users.revokeAdmin')}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onGrantAdmin} className="gap-2 text-emerald-600">
                  <Shield className="h-4 w-4" />
                  {t('admin.users.grantAdmin')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-slate-200" />
              {user.banned ? (
                <DropdownMenuItem onClick={onUnban} className="gap-2 text-emerald-600">
                  <UserPlus className="h-4 w-4" />
                  {t('admin.users.unban')}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onBan} className="gap-2 text-red-500">
                  <UserMinus className="h-4 w-4" />
                  {t('admin.users.ban')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {user.isAdmin && (
            <Badge className="border border-violet-300 bg-violet-50 text-violet-700">
              <Shield className="mr-1 h-3 w-3" />
              {t('admin.users.platformAdmin')}
            </Badge>
          )}
          {user.banned ? (
            <Badge className="border border-red-300 bg-red-50 text-red-700">
              <Ban className="mr-1 h-3 w-3" />
              {t('admin.banned')}
            </Badge>
          ) : user.emailVerified ? (
            <Badge className="border border-emerald-300 bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              {t('admin.verified')}
            </Badge>
          ) : (
            <Badge className="border border-slate-300 bg-slate-50 text-slate-600">
              <Mail className="mr-1 h-3 w-3" />
              {t('admin.users.unverified')}
            </Badge>
          )}
        </div>

        {/* Organizations */}
        {user.organizations.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-1.5 text-slate-500">
              <Building2 className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wider">{t('admin.users.organizations')}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {user.organizations.slice(0, 3).map((org) => (
                <span
                  key={org.id}
                  className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-700"
                >
                  {org.name}
                </span>
              ))}
              {user.organizations.length > 3 && (
                <span className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-500">
                  +{user.organizations.length - 3} {t('common.more')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500">
          <span>{t('admin.users.joined')} {new Date(user.createdAt).toLocaleDateString()}</span>
          <span className="capitalize">{user.role}</span>
        </div>
      </div>
    </div>
  );
}

// Skeleton
function UserCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-slate-100" />
          <div className="space-y-1.5">
            <div className="h-5 w-28 rounded bg-slate-100" />
            <div className="h-4 w-36 rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-8 w-8 rounded bg-slate-100" />
      </div>
      <div className="mb-4 flex gap-2">
        <div className="h-6 w-20 rounded-full bg-slate-100" />
      </div>
      <div className="mb-4">
        <div className="mb-2 h-3 w-20 rounded bg-slate-100" />
        <div className="flex gap-1.5">
          <div className="h-6 w-20 rounded bg-slate-100" />
          <div className="h-6 w-16 rounded bg-slate-100" />
        </div>
      </div>
      <div className="border-t border-slate-200 pt-4">
        <div className="h-3 w-24 rounded bg-slate-100" />
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
        className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center"
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100">
          <Search className="h-7 w-7 text-slate-500" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-slate-900">{t('admin.noMatchingResults')}</h3>
        <p className="mb-4 max-w-sm text-sm text-slate-500">
          {t('admin.adjustFilters')}
        </p>
        <Button
          variant="ghost"
          onClick={onClearFilters}
          className="gap-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          {t('admin.clearFilters')}
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center"
    >
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50"
      >
        <Users className="h-8 w-8 text-violet-600" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-slate-900">{t('admin.users.noUsersYet')}</h3>
      <p className="max-w-sm text-sm text-slate-500">
        {t('admin.users.usersAppearHere')}
      </p>
    </div>
  );
}
