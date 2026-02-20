import { useTranslation } from 'react-i18next';
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

function useRoleConfig() {
  const { t } = useTranslation();

  return {
    owner: {
      label: t('roles.owner'),
      icon: Crown,
      variant: 'default' as const,
      color: 'text-amber-600',
    },
    admin: {
      label: t('roles.admin'),
      icon: Shield,
      variant: 'secondary' as const,
      color: 'text-primary-600',
    },
    member: {
      label: t('roles.member'),
      icon: User,
      variant: 'ghost' as const,
      color: 'text-kresna-gray',
    },
  };
}

export function OrganizationCard({ organization, onSelect, isLoading }: OrganizationCardProps) {
  const { t } = useTranslation();
  const roleConfig = useRoleConfig();
  const roleInfo = roleConfig[organization.role] || roleConfig.member;
  const RoleIcon = roleInfo.icon;

  return (
    <div className="group">
      <Card className="relative overflow-hidden border-kresna-border bg-white transition-all duration-300 hover:border-primary-300 hover:shadow-md">
        <div className="relative p-5">
          <div className="flex items-start justify-between gap-4">
            {/* Left section: Logo and info */}
            <div className="flex items-start gap-4">
              {/* Organization avatar/logo */}
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50 ring-1 ring-primary-200 transition-all group-hover:ring-primary-300">
                  {organization.logo ? (
                    <img
                      src={organization.logo}
                      alt={organization.name}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <Building2 className="h-6 w-6 text-primary-600" />
                  )}
                </div>
                {/* Role indicator dot */}
                <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${
                  organization.role === 'owner' ? 'bg-amber-500' :
                  organization.role === 'admin' ? 'bg-primary-500' : 'bg-kresna-gray'
                }`} />
              </div>

              {/* Organization details */}
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-lg font-semibold text-charcoal transition-colors group-hover:text-primary-600 break-words">
                  {organization.name}
                </h3>
                <p className="mt-0.5 text-sm text-kresna-gray">
                  <code className="rounded bg-kresna-light px-1.5 py-0.5 font-mono text-xs text-kresna-gray">
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
                    <span className="flex items-center gap-1 text-xs text-kresna-gray">
                      <Users className="h-3 w-3" />
                      {organization.memberCount} {organization.memberCount === 1 ? t('team.member') : t('team.members')}
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
              className="shrink-0 gap-2 bg-primary-50 text-primary-700 ring-1 ring-primary-200 transition-all hover:bg-primary-600 hover:text-white disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
              ) : (
                <>
                  {t('common.enter')}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default OrganizationCard;
