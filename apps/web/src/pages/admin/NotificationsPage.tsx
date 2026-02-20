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
  info: 'bg-primary-50 text-primary-700 border-primary-200',
  warning: 'bg-primary-50 text-primary-700 border-primary-200',
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
        toast.error(t('admin.notifications.failedToLoad'));
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
      toast.error(t('admin.notifications.titleRequired'));
      return;
    }
    if (!form.message.trim()) {
      toast.error(t('admin.notifications.messageRequired'));
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
      toast.success(t('admin.notifications.broadcastSent'));
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
      toast.error(t('admin.notifications.failedToSend'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;

    setIsActionLoading(true);
    try {
      await deleteBroadcast(deleteModal.id);
      toast.success(t('admin.notifications.broadcastDeleted'));
      setDeleteModal(null);
      loadBroadcasts();
    } catch (error) {
      console.error('Error deleting broadcast:', error);
      toast.error(t('admin.notifications.failedToDelete'));
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-kresna-light p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-50 border border-primary-200">
              <Bell className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-charcoal">{t('admin.notifications.title')}</h1>
              <p className="text-sm text-kresna-gray mt-1">
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
              className="bg-primary-600 hover:bg-primary-700"
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
            <RefreshCw className="w-8 h-8 text-kresna-gray mx-auto mb-3 animate-spin" />
            <p className="text-kresna-gray">{t('common.loading')}</p>
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-kresna-border mx-auto mb-3" />
            <p className="text-kresna-gray">{t('admin.notifications.noBroadcasts')}</p>
            <Button
              size="sm"
              onClick={() => setCreateModal(true)}
              className="mt-4 bg-primary-600 hover:bg-primary-700"
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
                    'rounded-xl border border-kresna-border bg-white shadow-sm p-6',
                    isExpired && 'opacity-60'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-charcoal">
                          {broadcast.title}
                        </h3>
                        <Badge className={severityColors[broadcast.severity]}>
                          <SeverityIcon className="w-3 h-3 mr-1" />
                          {t(`admin.notifications.severity${broadcast.severity.charAt(0).toUpperCase()}${broadcast.severity.slice(1)}`)}
                        </Badge>
                        {isExpired && (
                          <Badge className="bg-kresna-light text-kresna-gray border-kresna-border">
                            {t('admin.notifications.expired')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-kresna-gray-dark mb-4">
                        {broadcast.message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-kresna-gray">
                        <div className="flex items-center gap-1">
                          <TargetIcon className="w-3 h-3" />
                          <span>
                            {broadcast.target_type === 'all'
                              ? t('admin.notifications.allUsers')
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
                            {t('admin.notifications.expiresOn', { date: new Date(broadcast.expires_at).toLocaleDateString() })}
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
          <DialogContent className="bg-white border-kresna-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-charcoal">
                {t('admin.notifications.createBroadcast')}
              </DialogTitle>
              <DialogDescription className="text-kresna-gray">
                {t('admin.notifications.sendDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-kresna-gray-dark mb-2 block">
                  {t('admin.notifications.titleLabel')} *
                </label>
                <Input
                  placeholder={t('admin.notifications.titlePlaceholder')}
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  className="bg-kresna-light border-kresna-border text-charcoal"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-kresna-gray-dark mb-2 block">
                  {t('admin.notifications.messageLabel')} *
                </label>
                <textarea
                  placeholder={t('admin.notifications.messagePlaceholder')}
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 bg-kresna-light border border-kresna-border rounded-md text-charcoal placeholder:text-kresna-gray focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-kresna-gray-dark mb-2 block">
                    {t('admin.notifications.severity')}
                  </label>
                  <Select
                    value={form.severity}
                    onValueChange={(value: any) =>
                      setForm({ ...form, severity: value })
                    }
                  >
                    <SelectTrigger className="bg-kresna-light border-kresna-border text-charcoal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-kresna-border">
                      <SelectItem value="info">{t('admin.notifications.severityInfo')}</SelectItem>
                      <SelectItem value="warning">{t('admin.notifications.severityWarning')}</SelectItem>
                      <SelectItem value="urgent">{t('admin.notifications.severityUrgent')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-kresna-gray-dark mb-2 block">
                    {t('admin.notifications.target')}
                  </label>
                  <Select
                    value={form.target_type}
                    onValueChange={(value: any) =>
                      setForm({ ...form, target_type: value })
                    }
                  >
                    <SelectTrigger className="bg-kresna-light border-kresna-border text-charcoal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-kresna-border">
                      <SelectItem value="all">{t('admin.notifications.allUsers')}</SelectItem>
                      <SelectItem value="organization">
                        {t('admin.notifications.specificOrgs')}
                      </SelectItem>
                      <SelectItem value="user">{t('admin.notifications.specificUsers')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.target_type !== 'all' && (
                <div>
                  <label className="text-sm font-medium text-kresna-gray-dark mb-2 block">
                    {t('admin.notifications.targetIdsLabel')}
                  </label>
                  <Input
                    placeholder={t('admin.notifications.targetIdsPlaceholder')}
                    value={form.target_ids}
                    onChange={(e) =>
                      setForm({ ...form, target_ids: e.target.value })
                    }
                    className="bg-kresna-light border-kresna-border text-charcoal"
                  />
                  <p className="text-xs text-kresna-gray mt-1">
                    {t('admin.notifications.targetIdsHint')}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-kresna-gray-dark mb-2 block">
                  {t('admin.notifications.expirationLabel')}
                </label>
                <Input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) =>
                    setForm({ ...form, expires_at: e.target.value })
                  }
                  className="bg-kresna-light border-kresna-border text-charcoal"
                />
                <p className="text-xs text-kresna-gray mt-1">
                  {t('admin.notifications.expirationHint')}
                </p>
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
                disabled={isActionLoading || !form.title.trim() || !form.message.trim()}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {isActionLoading ? t('admin.notifications.sending') : t('common.save')}
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
                {t('admin.notifications.deleteBroadcast')}
              </DialogTitle>
              <DialogDescription className="text-kresna-gray">
                {t('admin.notifications.deleteConfirmation', { title: deleteModal.title })}
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
                {isActionLoading ? t('admin.notifications.deleting') : t('admin.notifications.deleteBroadcast')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
