import { useState, useEffect } from 'react';
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

const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

const ROLE_COLORS = {
  owner: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  admin: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  member: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

export function TeamManager({ organizationSlug }: TeamManagerProps) {
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
      toast.error('Failed to load team members');
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
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        <span className="ml-2 text-sm text-neutral-400">Loading team members...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-200">Team Members</h3>
          <p className="text-sm text-neutral-400">
            {members.length} {members.length === 1 ? 'member' : 'members'} in your organization
          </p>
        </div>
        <Button
          onClick={() => setIsInviteModalOpen(true)}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {/* Members List */}
      {members.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center backdrop-blur-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800/50">
            <Users className="h-8 w-8 text-neutral-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-neutral-200">No team members yet</h3>
          <p className="text-sm text-neutral-400">
            Team members will appear here once they're added to your organization
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
                    'group relative overflow-hidden rounded-xl border bg-zinc-900/50 p-4 backdrop-blur-sm transition-all hover:bg-zinc-900/80',
                    'border-zinc-800 hover:border-zinc-700'
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="relative h-12 w-12 shrink-0">
                      {member.user?.image ? (
                        <img
                          src={member.user.image}
                          alt={member.user.name || 'User'}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-800 text-lg font-semibold text-neutral-300">
                          {member.user?.name?.[0]?.toUpperCase() || member.user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                      
                      {/* Role badge overlay */}
                      <div className="absolute -bottom-1 -right-1 rounded-full bg-zinc-900 p-1">
                        <RoleIcon className={cn(
                          'h-4 w-4',
                          member.role === 'owner' && 'text-amber-400',
                          member.role === 'admin' && 'text-blue-400',
                          member.role === 'member' && 'text-zinc-400'
                        )} />
                      </div>
                    </div>

                    {/* Member Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-neutral-200 truncate">
                          {member.user?.name || 'Unknown User'}
                        </h4>
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs', ROLE_COLORS[member.role])}
                        >
                          {ROLE_LABELS[member.role]}
                        </Badge>
                      </div>
                      <p className="text-sm text-neutral-400 truncate">
                        {member.user?.email || 'No email'}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        Joined {new Date(member.createdAt).toLocaleDateString()}
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
      <div className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
        <AlertCircle className="h-5 w-5 shrink-0 text-blue-400 mt-0.5" />
        <div className="text-sm text-blue-300">
          <p className="font-medium mb-1">Invite team members via email</p>
          <p className="text-blue-300/80">
            Click "Invite Member" to send an invitation email. New members will receive a link to join your organization.
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
