import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchMembers } from '@/lib/api/members';

interface UseMyRoleReturn {
  role: string | null;
  isManager: boolean;
  isTenantAdmin: boolean;
  isOwner: boolean;
  isLoading: boolean;
}

export function useMyRole(): UseMyRoleReturn {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['my-role', slug],
    queryFn: () => fetchMembers(slug!),
    enabled: !!slug && !!user,
    staleTime: 5 * 60 * 1000,
  });

  const membership = data?.members.find((m) => m.userId === user?.id);
  const role = membership?.role ?? null;

  return {
    role,
    isManager: role === 'manager' || role === 'tenantAdmin' || role === 'owner',
    isTenantAdmin: role === 'tenantAdmin' || role === 'owner',
    isOwner: role === 'owner',
    isLoading,
  };
}
