import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Settings as SettingsIcon,
  MapPin,
  Users,
  Bell,
  BellOff,
  Lock,
  Smartphone,
  Mail,
  Clock,
  Moon,
  Shield,
  LogOut,
  Monitor,
} from 'lucide-react';

import { toast } from 'sonner';
import { LocationManager } from '@/components/locations/LocationManager';
import { TeamManager } from '@/components/team/TeamManager';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type SettingsTab = 'locations' | 'team' | 'notifications' | 'security';

export default function SettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('locations');

  if (!slug) {
    return null;
  }

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
    { id: 'locations', label: t('settings.locations'), icon: MapPin, description: t('settings.locationsDesc') },
    { id: 'team', label: t('settings.team'), icon: Users, description: t('settings.teamDesc') },
    { id: 'notifications', label: t('nav.notifications'), icon: Bell, description: t('settings.notificationsDesc') },
    { id: 'security', label: t('settings.security'), icon: Lock, description: t('settings.securityDesc') },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-kresna-light">
          <SettingsIcon className="h-5 w-5 text-kresna-gray-dark" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-charcoal tracking-tight">{t('settings.title')}</h1>
          <p className="text-sm text-kresna-gray">{t('settings.subtitle')}</p>
        </div>
      </div>

      {/* Tabs + Content */}
      <div className="rounded-3xl border border-kresna-border bg-white shadow-card overflow-hidden">
        {/* Tab bar */}
        <div className="border-b border-kresna-border bg-kresna-light/30">
          <div className="flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'relative flex items-center gap-2 whitespace-nowrap border-b-2 px-6 py-4 text-sm font-medium transition-colors min-h-touch',
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 bg-white'
                      : 'border-transparent text-kresna-gray hover:text-kresna-gray-dark hover:bg-white/50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-6 lg:p-8">
          {activeTab === 'locations' && <LocationManager organizationSlug={slug} />}
          {activeTab === 'team' && <TeamManager organizationSlug={slug} />}
          {activeTab === 'notifications' && <NotificationSettings slug={slug} />}
          {activeTab === 'security' && <SecuritySettings />}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// NOTIFICATION SETTINGS
// ============================================================================

interface NotifPref {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}

function NotificationSettings({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const push = usePushNotifications(slug);

  const [prefs, setPrefs] = useState<NotifPref[]>([
    {
      id: 'shift_reminders',
      label: t('settings.shiftReminders'),
      description: t('settings.shiftRemindersDesc'),
      icon: Clock,
      enabled: true,
    },
    {
      id: 'swap_updates',
      label: t('settings.swapUpdates'),
      description: t('settings.swapUpdatesDesc'),
      icon: Users,
      enabled: true,
    },
    {
      id: 'schedule_changes',
      label: t('settings.scheduleChanges'),
      description: t('settings.scheduleChangesDesc'),
      icon: Bell,
      enabled: true,
    },
    {
      id: 'email_digest',
      label: t('settings.emailDigest'),
      description: t('settings.emailDigestDesc'),
      icon: Mail,
      enabled: false,
    },
  ]);

  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndStart, setDndStart] = useState('22:00');
  const [dndEnd, setDndEnd] = useState('07:00');

  const togglePref = (id: string) => {
    setPrefs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  return (
    <div className="space-y-8">
      {/* Push Notifications */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-charcoal">{t('settings.pushNotifications')}</h3>
          <p className="text-sm text-kresna-gray mt-1">{t('settings.pushNotificationsDesc')}</p>
        </div>

        {!push.isSupported ? (
          <div className="rounded-2xl border border-kresna-border bg-kresna-light p-5 flex items-center gap-3">
            <BellOff className="h-5 w-5 text-kresna-gray" />
            <p className="text-sm text-kresna-gray">{t('settings.pushNotSupported')}</p>
          </div>
        ) : push.permission === 'denied' ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-center gap-3">
            <BellOff className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-700">{t('settings.pushBlocked')}</p>
              <p className="text-xs text-red-600 mt-0.5">{t('settings.pushBlockedDesc')}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-kresna-border bg-white p-5 flex items-center justify-between shadow-card">
            <div className="flex items-center gap-3">
              <div className={cn(
                'h-10 w-10 rounded-xl flex items-center justify-center',
                push.isSubscribed ? 'bg-emerald-50' : 'bg-kresna-light'
              )}>
                <Smartphone className={cn('h-5 w-5', push.isSubscribed ? 'text-emerald-600' : 'text-kresna-gray')} />
              </div>
              <div>
                <p className="text-sm font-medium text-charcoal">
                  {push.isSubscribed ? t('settings.pushEnabled') : t('settings.pushDisabled')}
                </p>
                <p className="text-xs text-kresna-gray mt-0.5">
                  {push.isSubscribed
                    ? t('settings.pushEnabledDesc')
                    : t('settings.pushDisabledDesc')}
                </p>
              </div>
            </div>
            <Button
              variant={push.isSubscribed ? 'outline' : 'gradient'}
              size="sm"
              onClick={push.isSubscribed ? push.unsubscribe : push.subscribe}
              disabled={push.isLoading}
              className="rounded-xl"
            >
              {push.isSubscribed ? t('settings.disable') : t('settings.enable')}
            </Button>
          </div>
        )}
        {push.error && (
          <p className="text-xs text-red-600">{push.error}</p>
        )}
      </div>

      {/* Notification Preferences */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-charcoal">{t('settings.preferences')}</h3>
          <p className="text-sm text-kresna-gray mt-1">{t('settings.preferencesDesc')}</p>
        </div>

        <div className="space-y-3">
          {prefs.map((pref) => {
            const Icon = pref.icon;
            return (
              <div
                key={pref.id}
                className="rounded-2xl border border-kresna-border bg-white p-5 flex items-center justify-between shadow-card"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-kresna-light flex items-center justify-center">
                    <Icon className="h-5 w-5 text-kresna-gray" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-charcoal">{pref.label}</p>
                    <p className="text-xs text-kresna-gray mt-0.5">{pref.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => togglePref(pref.id)}
                  className={cn(
                    'relative h-7 w-12 rounded-full transition-colors shrink-0',
                    pref.enabled ? 'bg-primary-500' : 'bg-kresna-border'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform shadow-sm',
                      pref.enabled && 'translate-x-5'
                    )}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Do Not Disturb */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-charcoal flex items-center gap-2">
            <Moon className="h-5 w-5 text-primary-600" />
            {t('settings.dnd')}
          </h3>
          <p className="text-sm text-kresna-gray mt-1">{t('settings.dndDesc')}</p>
        </div>

        <div className="rounded-2xl border border-kresna-border bg-white p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-charcoal">{t('settings.enableDnd')}</p>
              <p className="text-xs text-kresna-gray mt-0.5">{t('settings.enableDndDesc')}</p>
            </div>
            <button
              onClick={() => setDndEnabled(!dndEnabled)}
              className={cn(
                'relative h-7 w-12 rounded-full transition-colors shrink-0',
                dndEnabled ? 'bg-primary-500' : 'bg-kresna-border'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform shadow-sm',
                  dndEnabled && 'translate-x-5'
                )}
              />
            </button>
          </div>

          {dndEnabled && (
            <div className="flex items-center gap-4 pt-4 border-t border-kresna-border">
              <div className="flex-1">
                <label className="text-xs font-medium text-kresna-gray-dark block mb-1.5">{t('settings.from')}</label>
                <Input
                  type="time"
                  value={dndStart}
                  onChange={(e) => setDndStart(e.target.value)}
                  className="rounded-xl h-11"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-kresna-gray-dark block mb-1.5">{t('settings.to')}</label>
                <Input
                  type="time"
                  value={dndEnd}
                  onChange={(e) => setDndEnd(e.target.value)}
                  className="rounded-xl h-11"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SECURITY SETTINGS
// ============================================================================

interface Session {
  id: string;
  device: string;
  browser: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

function SecuritySettings() {
  const { t } = useTranslation();
  const { signOut } = useAuth();

  const [sessions] = useState<Session[]>([
    {
      id: '1',
      device: 'Windows PC',
      browser: 'Chrome 120',
      ip: '192.168.1.x',
      lastActive: new Date().toISOString(),
      current: true,
    },
    {
      id: '2',
      device: 'iPhone 15',
      browser: 'Safari 17',
      ip: '10.0.0.x',
      lastActive: new Date(Date.now() - 3600000 * 2).toISOString(),
      current: false,
    },
  ]);

  const [passwordChanged, setPasswordChanged] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) return;
    if (newPassword.length < 8) return;

    setIsChangingPassword(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });

      if (result.error) {
        toast.error(result.error.message || t('errors.unexpected'));
        return;
      }

      toast.success(t('settings.passwordUpdated'));
      setPasswordChanged(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordChanged(false), 3000);
    } catch {
      toast.error(t('errors.unexpected'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Active Sessions */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-charcoal">{t('settings.activeSessions')}</h3>
          <p className="text-sm text-kresna-gray mt-1">{t('settings.activeSessionsDesc')}</p>
        </div>

        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                'rounded-2xl border p-5 flex items-center justify-between',
                session.current
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-kresna-border bg-white shadow-card'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center',
                  session.current ? 'bg-emerald-100' : 'bg-kresna-light'
                )}>
                  <Monitor className={cn(
                    'h-5 w-5',
                    session.current ? 'text-emerald-600' : 'text-kresna-gray'
                  )} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-charcoal">{session.device}</p>
                    {session.current && (
                      <span className="rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-2.5 py-0.5 border border-emerald-200">
                        {t('settings.current')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-kresna-gray mt-0.5">
                    {session.browser} &middot; {session.ip}
                  </p>
                  <p className="text-[11px] text-kresna-gray">
                    {t('settings.lastActive')}: {new Date(session.lastActive).toLocaleString('es-ES')}
                  </p>
                </div>
              </div>
              {!session.current && (
                <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl">
                  <LogOut className="mr-1.5 h-3.5 w-3.5" />
                  {t('settings.revoke')}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Change Password */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-charcoal">{t('settings.changePassword')}</h3>
          <p className="text-sm text-kresna-gray mt-1">{t('settings.changePasswordDesc')}</p>
        </div>

        <div className="rounded-2xl border border-kresna-border bg-white p-6 shadow-card space-y-4">
          {passwordChanged && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span className="text-sm text-emerald-700 font-medium">{t('settings.passwordUpdated')}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-kresna-gray-dark block mb-1.5">{t('settings.currentPassword')}</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="rounded-xl h-11"
              placeholder={t('settings.enterCurrentPassword')}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-kresna-gray-dark block mb-1.5">{t('settings.newPassword')}</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-xl h-11"
              placeholder={t('settings.atLeast8')}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-kresna-gray-dark block mb-1.5">{t('settings.confirmPassword')}</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-xl h-11"
              placeholder={t('settings.reenterPassword')}
            />
          </div>
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-600">{t('settings.passwordsNoMatch')}</p>
          )}
          <Button
            variant="gradient"
            onClick={handleChangePassword}
            disabled={isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 8}
            loading={isChangingPassword}
            className="rounded-xl"
          >
            {t('settings.updatePassword')}
          </Button>
        </div>
      </div>

      {/* Sign Out All Devices */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-charcoal">{t('settings.signOutEverywhere')}</h3>
          <p className="text-sm text-kresna-gray mt-1">{t('settings.signOutEverywhereDesc')}</p>
        </div>
        <Button
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t('settings.signOutAll')}
        </Button>
      </div>
    </div>
  );
}
