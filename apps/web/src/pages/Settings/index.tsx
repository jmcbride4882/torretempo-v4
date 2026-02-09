import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
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

import { LocationManager } from '@/components/locations/LocationManager';
import { TeamManager } from '@/components/team/TeamManager';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type SettingsTab = 'locations' | 'team' | 'notifications' | 'security';

interface TabItem {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const tabs: TabItem[] = [
  {
    id: 'locations',
    label: 'Locations',
    icon: MapPin,
    description: 'Manage work sites and geofencing',
  },
  {
    id: 'team',
    label: 'Team',
    icon: Users,
    description: 'Manage team members and permissions',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Configure notification preferences',
  },
  {
    id: 'security',
    label: 'Security',
    icon: Lock,
    description: 'Security settings and access control',
  },
];

export default function SettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [activeTab, setActiveTab] = useState<SettingsTab>('locations');

  if (!slug) {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/50">
            <SettingsIcon className="h-5 w-5 text-neutral-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-200">Settings</h1>
            <p className="text-sm text-neutral-400">Manage your workspace configuration</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="border-b border-zinc-800">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'relative flex items-center gap-2 whitespace-nowrap border-b-2 px-6 py-4 text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'border-primary-500 text-neutral-200'
                      : 'border-transparent text-neutral-400 hover:text-neutral-300'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-6">
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
  const push = usePushNotifications(slug);

  // Local preferences state (in a real app these would be fetched/persisted via API)
  const [prefs, setPrefs] = useState<NotifPref[]>([
    {
      id: 'shift_reminders',
      label: 'Shift reminders',
      description: 'Get notified 30 minutes before your shift starts',
      icon: Clock,
      enabled: true,
    },
    {
      id: 'swap_updates',
      label: 'Swap updates',
      description: 'Notifications when swap requests are sent, accepted, or rejected',
      icon: Users,
      enabled: true,
    },
    {
      id: 'schedule_changes',
      label: 'Schedule changes',
      description: 'When your roster is updated or new shifts are published',
      icon: Bell,
      enabled: true,
    },
    {
      id: 'email_digest',
      label: 'Email weekly digest',
      description: 'Receive a weekly summary of your hours and upcoming shifts',
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
          <h3 className="text-lg font-semibold text-neutral-200">Push Notifications</h3>
          <p className="text-sm text-neutral-400">Receive push notifications on this device</p>
        </div>

        {!push.isSupported ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex items-center gap-3">
            <BellOff className="h-5 w-5 text-neutral-500" />
            <p className="text-sm text-neutral-400">
              Push notifications are not supported in this browser
            </p>
          </div>
        ) : push.permission === 'denied' ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-center gap-3">
            <BellOff className="h-5 w-5 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-400">Notifications blocked</p>
              <p className="text-xs text-neutral-400">
                You've blocked notifications for this site. Enable them in your browser settings.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'h-10 w-10 rounded-lg flex items-center justify-center',
                push.isSubscribed ? 'bg-emerald-500/20' : 'bg-zinc-800/50'
              )}>
                <Smartphone className={cn('h-5 w-5', push.isSubscribed ? 'text-emerald-400' : 'text-neutral-500')} />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-200">
                  {push.isSubscribed ? 'Push notifications enabled' : 'Push notifications disabled'}
                </p>
                <p className="text-xs text-neutral-400">
                  {push.isSubscribed
                    ? 'You will receive notifications even when the app is closed'
                    : 'Enable to get notified about shifts and swaps'}
                </p>
              </div>
            </div>
            <Button
              variant={push.isSubscribed ? 'outline' : 'default'}
              size="sm"
              onClick={push.isSubscribed ? push.unsubscribe : push.subscribe}
              disabled={push.isLoading}
            >
              {push.isSubscribed ? 'Disable' : 'Enable'}
            </Button>
          </div>
        )}
        {push.error && (
          <p className="text-xs text-red-400">{push.error}</p>
        )}
      </div>

      {/* Notification Preferences */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-neutral-200">Preferences</h3>
          <p className="text-sm text-neutral-400">Choose which notifications you receive</p>
        </div>

        <div className="space-y-2">
          {prefs.map((pref) => {
            const Icon = pref.icon;
            return (
              <div
                key={pref.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-zinc-800/50 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-200">{pref.label}</p>
                    <p className="text-xs text-neutral-500">{pref.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => togglePref(pref.id)}
                  className={cn(
                    'relative h-6 w-11 rounded-full transition-colors',
                    pref.enabled ? 'bg-primary-500' : 'bg-zinc-700'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform',
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
          <h3 className="text-lg font-semibold text-neutral-200 flex items-center gap-2">
            <Moon className="h-5 w-5 text-primary-400" />
            Do Not Disturb
          </h3>
          <p className="text-sm text-neutral-400">
            Silence notifications during rest hours (Right to Disconnect — Art. 88 LOPDGDD)
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-200">Enable Do Not Disturb</p>
              <p className="text-xs text-neutral-500">
                No notifications will be sent during quiet hours
              </p>
            </div>
            <button
              onClick={() => setDndEnabled(!dndEnabled)}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                dndEnabled ? 'bg-primary-500' : 'bg-zinc-700'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                  dndEnabled && 'translate-x-5'
                )}
              />
            </button>
          </div>

          {dndEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-4 pt-2 border-t border-zinc-800"
            >
              <div className="flex-1">
                <label className="text-xs text-neutral-500 block mb-1">From</label>
                <input
                  type="time"
                  value={dndStart}
                  onChange={(e) => setDndStart(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-neutral-500 block mb-1">To</label>
                <input
                  type="time"
                  value={dndEnd}
                  onChange={(e) => setDndEnd(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
                />
              </div>
            </motion.div>
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
  const { signOut } = useAuth();

  // Mock sessions — in a real app these come from the API
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

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) return;
    if (newPassword.length < 8) return;
    // In a real app, call API
    setPasswordChanged(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordChanged(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Active Sessions */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-neutral-200">Active Sessions</h3>
          <p className="text-sm text-neutral-400">Manage your logged-in devices</p>
        </div>

        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                'rounded-xl border p-4 flex items-center justify-between',
                session.current
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-zinc-800 bg-zinc-900/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'h-10 w-10 rounded-lg flex items-center justify-center',
                  session.current ? 'bg-emerald-500/20' : 'bg-zinc-800/50'
                )}>
                  <Monitor className={cn(
                    'h-5 w-5',
                    session.current ? 'text-emerald-400' : 'text-neutral-500'
                  )} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-neutral-200">{session.device}</p>
                    {session.current && (
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">
                    {session.browser} &middot; {session.ip}
                  </p>
                  <p className="text-[11px] text-neutral-600">
                    Last active: {new Date(session.lastActive).toLocaleString('es-ES')}
                  </p>
                </div>
              </div>
              {!session.current && (
                <Button variant="outline" size="sm" className="text-red-400 border-red-500/20 hover:bg-red-500/10">
                  <LogOut className="mr-1 h-3.5 w-3.5" />
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Change Password */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-neutral-200">Change Password</h3>
          <p className="text-sm text-neutral-400">Update your account password</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
          {passwordChanged && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center gap-2"
            >
              <Shield className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Password updated successfully</span>
            </motion.div>
          )}

          <div>
            <label className="text-xs text-neutral-500 block mb-1">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500 block mb-1">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500 block mb-1">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
              placeholder="Re-enter new password"
            />
          </div>
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-400">Passwords do not match</p>
          )}
          <Button
            onClick={handleChangePassword}
            disabled={!currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 8}
          >
            Update Password
          </Button>
        </div>
      </div>

      {/* Sign Out All Devices */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-neutral-200">Sign Out Everywhere</h3>
          <p className="text-sm text-neutral-400">
            Sign out of all devices including this one
          </p>
        </div>
        <Button
          variant="outline"
          className="text-red-400 border-red-500/20 hover:bg-red-500/10"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out all devices
        </Button>
      </div>
    </div>
  );
}
