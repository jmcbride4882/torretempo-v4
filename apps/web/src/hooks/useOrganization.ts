import { authClient } from '@/lib/auth-client';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export interface UserOrganization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  createdAt: Date;
  role: 'owner' | 'admin' | 'member';
  memberCount?: number;
}

interface UseOrganizationReturn {
  organization: Organization | null;
  isLoading: boolean;
  setActiveOrganization: (orgId: string) => Promise<void>;
  createOrganization: (data: { name: string; slug: string; logo?: string }) => Promise<Organization>;
  listUserOrganizations: () => Promise<UserOrganization[]>;
  acceptInvitation: (invitationId: string) => Promise<{ organizationId: string }>;
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

  const listUserOrganizations = async (): Promise<UserOrganization[]> => {
    const result = await authClient.organization.list();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to fetch organizations');
    }
    // Map Better Auth response to our UserOrganization type
    return (result.data || []).map((org: Record<string, unknown>) => ({
      id: org.id as string,
      name: org.name as string,
      slug: org.slug as string,
      logo: org.logo as string | null | undefined,
      createdAt: new Date(org.createdAt as string),
      role: (org.role || 'member') as 'owner' | 'admin' | 'member',
      memberCount: (org.memberCount as number) || undefined,
    }));
  };

  const acceptInvitation = async (invitationId: string): Promise<{ organizationId: string }> => {
    const result = await authClient.organization.acceptInvitation({
      invitationId,
    });
    if (result.error) {
      throw new Error(result.error.message || 'Failed to accept invitation');
    }
    const data = result.data as unknown as { member: { organizationId: string }; invitation: { organizationId: string } };
    return {
      organizationId: data.member?.organizationId || data.invitation?.organizationId,
    };
  };

  return {
    organization: activeOrg as Organization | null,
    isLoading,
    setActiveOrganization,
    createOrganization,
    listUserOrganizations,
    acceptInvitation,
  };
}
