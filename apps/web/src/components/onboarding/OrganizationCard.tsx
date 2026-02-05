import { motion } from 'framer-motion';
import { Building2, Users, ArrowRight, Crown, Shield, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { UserOrganization } from '@/hooks/useOrganization';

interface OrganizationCardProps {
  organization: UserOrganization;
  onSelect: (org: UserOrganization) => void;
  isLoading?: boolean;
  index?: number;
}

const roleConfig = {
  owner: {
    label: 'Owner',
    icon: Crown,
    variant: 'default' as const,
    color: 'text-amber-400',
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    variant: 'secondary' as const,
    color: 'text-primary-400',
  },
  member: {
    label: 'Member',
    icon: User,
    variant: 'ghost' as const,
    color: 'text-neutral-400',
  },
};

export function OrganizationCard({ organization, onSelect, isLoading, index = 0 }: OrganizationCardProps) {
  const roleInfo = roleConfig[organization.role] || roleConfig.member;
  const RoleIcon = roleInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.1,
        ease: [0.23, 1, 0.32, 1]
      }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group"
    >
      <Card className="relative overflow-hidden border-white/10 bg-neutral-900/60 backdrop-blur-xl transition-all duration-300 hover:border-primary-500/40 hover:shadow-lg hover:shadow-primary-600/10">
        {/* Gradient accent line */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        
        {/* Glow effect on hover */}
        <div className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-r from-primary-600/20 via-transparent to-primary-600/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <div className="relative p-5">
          <div className="flex items-start justify-between gap-4">
            {/* Left section: Logo and info */}
            <div className="flex items-start gap-4">
              {/* Organization avatar/logo */}
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 ring-1 ring-white/10 transition-all group-hover:ring-primary-500/30">
                  {organization.logo ? (
                    <img
                      src={organization.logo}
                      alt={organization.name}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <Building2 className="h-6 w-6 text-primary-400" />
                  )}
                </div>
                {/* Role indicator dot */}
                <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-neutral-900 ${
                  organization.role === 'owner' ? 'bg-amber-500' :
                  organization.role === 'admin' ? 'bg-primary-500' : 'bg-neutral-500'
                }`} />
              </div>

              {/* Organization details */}
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-semibold text-white transition-colors group-hover:text-primary-400">
                  {organization.name}
                </h3>
                <p className="mt-0.5 text-sm text-neutral-500">
                  <code className="rounded bg-neutral-800/60 px-1.5 py-0.5 font-mono text-xs text-neutral-400">
                    /t/{organization.slug}
                  </code>
                </p>
                
                {/* Meta info row */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant={roleInfo.variant} className="gap-1 text-xs">
                    <RoleIcon className={`h-3 w-3 ${roleInfo.color}`} />
                    {roleInfo.label}
                  </Badge>
                  
                  {organization.memberCount !== undefined && (
                    <span className="flex items-center gap-1 text-xs text-neutral-500">
                      <Users className="h-3 w-3" />
                      {organization.memberCount} {organization.memberCount === 1 ? 'member' : 'members'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right section: Enter button */}
            <Button
              onClick={() => onSelect(organization)}
              disabled={isLoading}
              size="sm"
              className="shrink-0 gap-2 bg-white/5 text-white ring-1 ring-white/10 transition-all hover:bg-primary-600 hover:ring-primary-500/50 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                <>
                  Enter
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default OrganizationCard;
