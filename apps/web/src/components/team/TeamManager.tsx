import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, Crown, User, Loader2, AlertCircle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InviteMemberModal } from '@/components/team/InviteMemberModal';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface TeamMember {
  id: string;
  userId: string;
  organizationId: string;
  role: 'owner' | 'admin' | 'member';
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

interface TeamManagerProps {
  organizationSlug: string;
}

const ROLE_ICONS = {
  owner: Crown,
  admin: Shield,
  member: User,
};

const ROLE_LABEL_KEYS = {
  owner: 'team.roleOwner',
  admin: 'team.roleAdmin',
  member: 'team.roleMember',
} as const;

const ROLE_COLORS = {
  owner: 'bg-amber-50 text-amber-700 border-amber-200',
  admin: 'bg-blue-50 text-blue-700 border-blue-200',
  member: 'bg-slate-50 text-slate-600 border-slate-200',
};

export function TeamManager({ organizationSlug }: TeamManagerProps) {
  const { t } = useTranslation();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // Fetch team members
  const fetchMembers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/org/${organizationSlug}/members`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }

      const data = await response.json();
      setMembers(data.members || []);

      // Extract organizationId from first member (all members share same org)
      if (data.members && data.members.length > 0) {
        setOrganizationId(data.members[0].organizationId);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error(t('team.failedLoadMembers'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [organizationSlug]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-400">{t('team.loadingMembers')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{t('team.teamMembers')}</h3>
          <p className="text-sm text-slate-500">
            {t('team.memberInOrg', { count: members.length })}
          </p>
        </div>
        <Button
          onClick={() => setIsInviteModalOpen(true)}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4" />
          {t('team.inviteMember')}
        </Button>
      </div>

      {/* Members List */}
      {members.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Users className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">{t('team.noMembersYet')}</h3>
          <p className="text-sm text-slate-500">
            {t('team.noMembersDesc')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {members.map((member, index) => {
              const RoleIcon = ROLE_ICONS[member.role];

              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'group relative overflow-hidden rounded-xl border bg-white p-4 transition-all hover:bg-slate-50',
                    'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="relative h-12 w-12 shrink-0">
                      {member.user?.image ? (
                        <img
                          src={member.user.image}
                          alt={member.user.name || t('team.unknownUser')}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-600">
                          {member.user?.name?.[0]?.toUpperCase() || member.user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}

                      {/* Role badge overlay */}
                      <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-1">
                        <RoleIcon className={cn(
                          'h-4 w-4',
                          member.role === 'owner' && 'text-amber-500',
                          member.role === 'admin' && 'text-blue-500',
                          member.role === 'member' && 'text-slate-500'
                        )} />
                      </div>
                    </div>

                    {/* Member Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900 truncate">
                          {member.user?.name || t('team.unknownUser')}
                        </h4>
                        <Badge
                          variant="outline"
                          className={cn('text-xs', ROLE_COLORS[member.role])}
                        >
                          {t(ROLE_LABEL_KEYS[member.role])}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 truncate">
                        {member.user?.email || t('team.noEmail')}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {t('team.joined', { date: new Date(member.createdAt).toLocaleDateString() })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Info note */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <AlertCircle className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium mb-1">{t('team.inviteInfoTitle')}</p>
          <p className="text-blue-600">
            {t('team.inviteInfoDesc')}
          </p>
        </div>
      </div>

      {/* Invite Member Modal */}
      {organizationId && (
        <InviteMemberModal
          open={isInviteModalOpen}
          onOpenChange={setIsInviteModalOpen}
          onSuccess={() => {
            fetchMembers(); // Refresh member list after successful invitation
          }}
          organizationId={organizationId}
        />
      )}
    </div>
  );
}
