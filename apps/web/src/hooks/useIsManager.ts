/**
 * Hook to determine if the current user has a management role
 * in the current organization.
 */

import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';

export function useIsManager(): boolean {
  const { user } = useAuth();
  const { organization } = useOrganization();

  const memberRole = (organization as any)?.members?.find(
    (m: any) => m.userId === user?.id
  )?.role;

  return ['manager', 'tenantAdmin', 'owner'].includes(memberRole || '');
}
