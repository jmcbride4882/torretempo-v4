import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';

type RedirectState = 'loading' | 'to-org' | 'to-select' | 'to-create';

/**
 * Smart onboarding redirect component.
 * Determines where to send the user based on their organization status:
 * - Has active org → go directly to that org's roster
 * - Has orgs but none active → go to select organization
 * - No orgs at all → go to create organization
 */
export function OnboardingRedirect() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { organization, isLoading: orgLoading, listUserOrganizations, setActiveOrganization } = useOrganization();
  
  const [redirectState, setRedirectState] = useState<RedirectState>('loading');
  const [targetSlug, setTargetSlug] = useState<string | null>(null);

  useEffect(() => {
    const determineRedirect = async () => {
      // Wait for auth to be ready
      if (authLoading || orgLoading) return;
      
      // If not authenticated, will be handled by ProtectedRoute
      if (!isAuthenticated) {
        setRedirectState('loading');
        return;
      }

      // If user has an active organization, go to it
      if (organization) {
        setTargetSlug(organization.slug);
        setRedirectState('to-org');
        return;
      }

      // Check if user has any organizations
      try {
        const orgs = await listUserOrganizations();
        
        if (orgs.length === 0) {
          // No orgs - go to create
          setRedirectState('to-create');
        } else if (orgs.length === 1 && orgs[0]) {
          // Exactly one org - auto-select it and go
          const singleOrg = orgs[0];
          await setActiveOrganization(singleOrg.id);
          setTargetSlug(singleOrg.slug);
          setRedirectState('to-org');
        } else {
          // Multiple orgs - let user choose
          setRedirectState('to-select');
        }
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
        // On error, default to create flow
        setRedirectState('to-create');
      }
    };

    determineRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, orgLoading, isAuthenticated, organization]);

  // Show loading state
  if (redirectState === 'loading' || authLoading || orgLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-primary-600" />
          <span className="text-sm text-neutral-400">Setting up your workspace...</span>
        </motion.div>
      </div>
    );
  }

  // Redirect based on state
  if (redirectState === 'to-org' && targetSlug) {
    return <Navigate to={`/t/${targetSlug}/roster`} replace />;
  }

  if (redirectState === 'to-select') {
    return <Navigate to="/onboarding/select" replace />;
  }

  if (redirectState === 'to-create') {
    return <Navigate to="/onboarding/create" replace />;
  }

  // Fallback - should not reach here
  return <Navigate to="/onboarding/create" replace />;
}

export default OnboardingRedirect;
