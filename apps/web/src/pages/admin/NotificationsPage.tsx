/**
 * NotificationsPage - Admin Broadcast Messages
 * Platform admins can send broadcast notifications to users
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Bell,
  Plus,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Info,
  AlertCircle,
  Users,
  Building2,
  UserCircle,
  Calendar,
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
import { cn } from '@/lib/utils';
import {
  fetchBroadcasts,
  createBroadcast,
  deleteBroadcast,
} from '@/lib/api/admin';
import type { BroadcastMessage } from '@/lib/api/admin';

const severityColors = {
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
};

const severityIcons = {
  info: Info,
  warning: AlertTriangle,
  urgent: AlertCircle,
};

const targetTypeIcons = {
  all: Users,
  organization: Building2,
  user: UserCircle,
};

export default function NotificationsPage() {
  const { t } = useTranslation();

  // State
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal state
  const [createModal, setCreateModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<BroadcastMessage | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    message: '',
    severity: 'info' as 'info' | 'warning' | 'urgent',
    target_type: 'all' as 'all' | 'organization' | 'user',
    target_ids: '',
    expires_at: '',
  });

  // Fetch broadcasts
  const loadBroadcasts = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setIsRefreshing(silent);

      try {
        const response = await fetchBroadcasts();
        setBroadcasts(response.broadcasts || []);
      } catch (error) {
        console.error('Error fetching broadcasts:', error);
        toast.error('Failed to load broadcasts');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadBroadcasts();
  }, [loadBroadcasts]);

  // Handlers
  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!form.message.trim()) {
      toast.error('Message is required');
      return;
    }

    setIsActionLoading(true);
    try {
      const target_ids = form.target_ids
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

      await createBroadcast({
        title: form.title.trim(),
        message: form.message.trim(),
        severity: form.severity,
        target_type: form.target_type,
        target_ids: target_ids.length > 0 ? target_ids : undefined,
        expires_at: form.expires_at || undefined,
      });
      toast.success('Broadcast sent successfully');
      setCreateModal(false);
      setForm({
        title: '',
        message: '',
        severity: 'info',
        target_type: 'all',
        target_ids: '',
        expires_at: '',
      });
      loadBroadcasts();
    } catch (error) {
      console.error('Error creating broadcast:', error);
      toast.error('Failed to send broadcast');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;

    setIsActionLoading(true);
    try {
      await deleteBroadcast(deleteModal.id);
      toast.success('Broadcast deleted');
      setDeleteModal(null);
      loadBroadcasts();
    } catch (error) {
      console.error('Error deleting broadcast:', error);
      toast.error('Failed to delete broadcast');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
              <Bell className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">{t('admin.notifications.title')}</h1>
              <p className="text-sm text-zinc-500 mt-1">
                {t('admin.notifications.createBroadcast')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadBroadcasts()}
              disabled={isRefreshing}
              className="border-zinc-200 hover:bg-zinc-100"
            >
              <RefreshCw
                className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')}
              />
              {t('admin.refresh')}
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateModal(true)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('common.create')}
            </Button>
          </div>
        </div>
      </div>

      {/* Broadcasts List */}
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-zinc-400 mx-auto mb-3 animate-spin" />
            <p className="text-zinc-500">{t('common.loading')}</p>
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500">{t('admin.notifications.noBroadcasts')}</p>
            <Button
              size="sm"
              onClick={() => setCreateModal(true)}
              className="mt-4 bg-amber-600 hover:bg-amber-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('admin.notifications.createBroadcast')}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {broadcasts.map((broadcast) => {
              const SeverityIcon = severityIcons[broadcast.severity];
              const TargetIcon = targetTypeIcons[broadcast.target_type];
              const isExpired = broadcast.expires_at && new Date(broadcast.expires_at) < new Date();

              return (
                <div
                  key={broadcast.id}
                  className={cn(
                    'rounded-xl border border-zinc-200 bg-white shadow-sm p-6',
                    isExpired && 'opacity-60'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-zinc-900">
                          {broadcast.title}
                        </h3>
                        <Badge className={severityColors[broadcast.severity]}>
                          <SeverityIcon className="w-3 h-3 mr-1" />
                          {broadcast.severity}
                        </Badge>
                        {isExpired && (
                          <Badge className="bg-zinc-100 text-zinc-500 border-zinc-200">
                            Expired
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-zinc-700 mb-4">
                        {broadcast.message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <div className="flex items-center gap-1">
                          <TargetIcon className="w-3 h-3" />
                          <span>
                            {broadcast.target_type === 'all'
                              ? 'All users'
                              : `${broadcast.target_type} (${broadcast.target_ids?.length || 0})`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(broadcast.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {broadcast.expires_at && (
                          <span>
                            Expires:{' '}
                            {new Date(broadcast.expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteModal(broadcast)}
                      className="border-red-200 hover:bg-red-50 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {createModal && (
        <Dialog open={createModal} onOpenChange={setCreateModal}>
          <DialogContent className="bg-white border-zinc-200 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-zinc-900">
                {t('admin.notifications.createBroadcast')}
              </DialogTitle>
              <DialogDescription className="text-zinc-500">
                Send a notification to users or organizations
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-zinc-700 mb-2 block">
                  Title *
                </label>
                <Input
                  placeholder="Important update"
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  className="bg-zinc-50 border-zinc-200 text-zinc-900"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700 mb-2 block">
                  Message *
                </label>
                <textarea
                  placeholder="Broadcast message content..."
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-md text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-zinc-700 mb-2 block">
                    Severity
                  </label>
                  <Select
                    value={form.severity}
                    onValueChange={(value: any) =>
                      setForm({ ...form, severity: value })
                    }
                  >
                    <SelectTrigger className="bg-zinc-50 border-zinc-200 text-zinc-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-zinc-200">
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-700 mb-2 block">
                    Target
                  </label>
                  <Select
                    value={form.target_type}
                    onValueChange={(value: any) =>
                      setForm({ ...form, target_type: value })
                    }
                  >
                    <SelectTrigger className="bg-zinc-50 border-zinc-200 text-zinc-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-zinc-200">
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="organization">
                        Specific Organizations
                      </SelectItem>
                      <SelectItem value="user">Specific Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.target_type !== 'all' && (
                <div>
                  <label className="text-sm font-medium text-zinc-700 mb-2 block">
                    Target IDs (comma-separated)
                  </label>
                  <Input
                    placeholder="id1, id2, id3"
                    value={form.target_ids}
                    onChange={(e) =>
                      setForm({ ...form, target_ids: e.target.value })
                    }
                    className="bg-zinc-50 border-zinc-200 text-zinc-900"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Enter user or organization IDs separated by commas
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-zinc-700 mb-2 block">
                  Expiration Date (optional)
                </label>
                <Input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) =>
                    setForm({ ...form, expires_at: e.target.value })
                  }
                  className="bg-zinc-50 border-zinc-200 text-zinc-900"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Leave empty for no expiration
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateModal(false)}
                disabled={isActionLoading}
                className="border-zinc-200 hover:bg-zinc-100"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isActionLoading || !form.title.trim() || !form.message.trim()}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isActionLoading ? 'Sending...' : t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <Dialog open={!!deleteModal} onOpenChange={() => setDeleteModal(null)}>
          <DialogContent className="bg-white border-zinc-200">
            <DialogHeader>
              <DialogTitle className="text-zinc-900 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                Delete Broadcast
              </DialogTitle>
              <DialogDescription className="text-zinc-500">
                Are you sure you want to delete "{deleteModal.title}"? This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteModal(null)}
                disabled={isActionLoading}
                className="border-zinc-200 hover:bg-zinc-100"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isActionLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {isActionLoading ? 'Deleting...' : 'Delete Broadcast'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
