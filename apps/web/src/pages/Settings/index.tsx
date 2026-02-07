import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, MapPin, Users, Bell, Lock } from 'lucide-react';

import { LocationManager } from '@/components/locations/LocationManager';
import { cn } from '@/lib/utils';

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
          {activeTab === 'team' && <PlaceholderContent tab="team" />}
          {activeTab === 'notifications' && <PlaceholderContent tab="notifications" />}
          {activeTab === 'security' && <PlaceholderContent tab="security" />}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PLACEHOLDER CONTENT
// ============================================================================

function PlaceholderContent({ tab }: { tab: SettingsTab }) {
  const content: Record<Exclude<SettingsTab, 'locations'>, { title: string; description: string; items: string[] }> = {
    team: {
      title: 'Team Management',
      description: 'Invite team members, assign roles, and manage permissions',
      items: [
        'Invite new team members',
        'Assign roles (Admin, Manager, Employee)',
        'Manage permissions',
        'View team activity',
      ],
    },
    notifications: {
      title: 'Notification Preferences',
      description: 'Configure how and when you receive notifications',
      items: [
        'Email notifications',
        'Push notifications',
        'Shift reminders',
        'Approval requests',
      ],
    },
    security: {
      title: 'Security Settings',
      description: 'Manage security and access control',
      items: [
        'Two-factor authentication',
        'Session management',
        'Access logs',
        'API keys',
      ],
    },
  };

  const data = content[tab as Exclude<SettingsTab, 'locations'>];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-neutral-200">{data.title}</h3>
        <p className="text-sm text-neutral-400">{data.description}</p>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <p className="mb-4 text-sm text-neutral-400">Coming soon</p>
        <ul className="mx-auto max-w-md space-y-2 text-left text-sm text-neutral-500">
          {data.items.map((item: string, index: number) => (
            <li key={index} className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
