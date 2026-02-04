import { authClient, type Session, type User } from '@/lib/auth-client';

interface UseAuthReturn {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const { data: session, isPending: isLoading } = authClient.useSession();

  const user = session?.user ?? null;
  const isAuthenticated = !!session && !!user;
  const isAdmin = user?.role === 'admin';

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = '/auth/signin';
  };

  return {
    session,
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    signOut: handleSignOut,
  };
}
