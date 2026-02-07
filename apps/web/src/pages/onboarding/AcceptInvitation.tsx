import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, Mail, ArrowRight, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';

type AcceptState = 'loading' | 'accepting' | 'success' | 'error' | 'not-logged-in';

export default function AcceptInvitation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { acceptInvitation, setActiveOrganization } = useOrganization();

  const [state, setState] = useState<AcceptState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      // User not logged in - show sign up/sign in options
      setState('not-logged-in');
      return;
    }

    // User is logged in - automatically accept invitation
    handleAcceptInvitation();
  }, [user, authLoading, id]);

  const handleAcceptInvitation = async () => {
    if (!id) {
      setErrorMessage('Invalid invitation link');
      setState('error');
      return;
    }

    setState('accepting');

    try {
      const result = await acceptInvitation(id);
      
      // Set the organization as active
      await setActiveOrganization(result.organizationId);
      
      setState('success');
      
      // Redirect to the organization dashboard after 2 seconds
      setTimeout(() => {
        // Navigate to organization dashboard
        // Note: We don't have the slug yet, so redirect to onboarding/select
        // which will redirect to the correct org
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      setState('error');
      const message = error instanceof Error ? error.message : 'Failed to accept invitation';
      setErrorMessage(message);
      
      if (message.toLowerCase().includes('expired')) {
        setErrorMessage('This invitation has expired. Please request a new one from your organization admin.');
      } else if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('not found')) {
        setErrorMessage('Invalid invitation link. Please check the link or request a new invitation.');
      } else if (message.toLowerCase().includes('already')) {
        setErrorMessage('You are already a member of this organization.');
      }
    }
  };

  const handleSignUpWithInvitation = () => {
    // Store invitation ID in sessionStorage to auto-accept after signup
    if (id) {
      sessionStorage.setItem('pendingInvitation', id);
    }
    navigate('/auth/signup');
  };

  const handleSignInWithInvitation = () => {
    // Store invitation ID in sessionStorage to auto-accept after signin
    if (id) {
      sessionStorage.setItem('pendingInvitation', id);
    }
    navigate('/auth/signin');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4">
      {/* Background decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
          {/* Header gradient */}
          <div className="h-2 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700" />

          <div className="p-8">
            {/* Icon */}
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 ring-1 ring-white/10">
              {state === 'loading' || state === 'accepting' ? (
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              ) : state === 'success' ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              ) : state === 'error' ? (
                <XCircle className="h-8 w-8 text-red-400" />
              ) : (
                <UserPlus className="h-8 w-8 text-blue-400" />
              )}
            </div>

            {/* Title and description based on state */}
            {state === 'loading' && (
              <>
                <h1 className="mb-2 text-center text-2xl font-bold text-white">
                  Loading Invitation...
                </h1>
                <p className="text-center text-neutral-400">
                  Please wait while we verify your invitation
                </p>
              </>
            )}

            {state === 'accepting' && (
              <>
                <h1 className="mb-2 text-center text-2xl font-bold text-white">
                  Accepting Invitation...
                </h1>
                <p className="text-center text-neutral-400">
                  Adding you to the organization
                </p>
              </>
            )}

            {state === 'success' && (
              <>
                <h1 className="mb-2 text-center text-2xl font-bold text-white">
                  Welcome Aboard! 🎉
                </h1>
                <p className="text-center text-neutral-400">
                  You've successfully joined the organization. Redirecting to your dashboard...
                </p>
                <div className="mt-6 flex justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-emerald-400 ring-1 ring-emerald-500/30"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Invitation accepted
                  </motion.div>
                </div>
              </>
            )}

            {state === 'error' && (
              <>
                <h1 className="mb-2 text-center text-2xl font-bold text-white">
                  Invitation Error
                </h1>
                <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                  <p className="flex items-center gap-2 text-sm text-red-400">
                    <XCircle className="h-4 w-4 shrink-0" />
                    {errorMessage}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => navigate('/auth/signin')}
                    variant="outline"
                    className="flex-1 border-white/10 bg-white/5 hover:bg-white/10"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => navigate('/auth/signup')}
                    className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    Sign Up
                  </Button>
                </div>
              </>
            )}

            {state === 'not-logged-in' && (
              <>
                <h1 className="mb-2 text-center text-2xl font-bold text-white">
                  You're Invited! 🎉
                </h1>
                <p className="mb-6 text-center text-neutral-400">
                  You've been invited to join an organization on Torre Tempo. Sign up or sign in to accept your invitation.
                </p>

                <div className="space-y-3">
                  <Button
                    onClick={handleSignUpWithInvitation}
                    className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <UserPlus className="h-4 w-4" />
                    Create Account & Join
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-zinc-800" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-zinc-900 px-2 text-neutral-500">
                        Already have an account?
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={handleSignInWithInvitation}
                    variant="outline"
                    className="w-full gap-2 border-white/10 bg-white/5 hover:bg-white/10"
                  >
                    <Mail className="h-4 w-4" />
                    Sign In & Join
                  </Button>
                </div>

                <p className="mt-6 text-center text-xs text-neutral-500">
                  Your invitation will be automatically accepted after you sign in or create an account.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Footer link */}
        <p className="mt-4 text-center text-sm text-neutral-500">
          <Link to="/" className="hover:text-neutral-300 transition-colors">
            ← Back to home
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
