import { authClient } from '@/lib/auth-client';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

interface UseOrganizationReturn {
  organization: Organization | null;
  isLoading: boolean;
  setActiveOrganization: (orgId: string) => Promise<void>;
  createOrganization: (data: { name: string; slug: string; logo?: string }) => Promise<Organization>;
}

export function useOrganization(): UseOrganizationReturn {
  const { data: activeOrg, isPending: isLoading } = authClient.useActiveOrganization();

  const setActiveOrganization = async (orgId: string) => {
    await authClient.organization.setActive({ organizationId: orgId });
  };

  const createOrganization = async (data: { name: string; slug: string; logo?: string }) => {
    const result = await authClient.organization.create(data);
    if (result.error) {
      throw new Error(result.error.message || 'Failed to create organization');
    }
    return result.data as Organization;
  };

  return {
    organization: activeOrg as Organization | null,
    isLoading,
    setActiveOrganization,
    createOrganization,
  };
}
