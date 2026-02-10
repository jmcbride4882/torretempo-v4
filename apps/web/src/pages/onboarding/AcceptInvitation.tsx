import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowRight, UserPlus, Clock, Mail } from 'lucide-react';

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
    if (authLoading) return;

    if (!user) {
      setState('not-logged-in');
      return;
    }

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
      await setActiveOrganization(result.organizationId);
      setState('success');

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      setState('error');
      const message = error instanceof Error ? error.message : 'Failed to accept invitation';

      if (message.toLowerCase().includes('expired')) {
        setErrorMessage('This invitation has expired. Please request a new one from your organization admin.');
      } else if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('not found')) {
        setErrorMessage('Invalid invitation link. Please check the link or request a new invitation.');
      } else if (message.toLowerCase().includes('already')) {
        setErrorMessage('You are already a member of this organization.');
      } else {
        setErrorMessage(message);
      }
    }
  };

  const handleSignUpWithInvitation = () => {
    if (id) sessionStorage.setItem('pendingInvitation', id);
    navigate('/auth/signup');
  };

  const handleSignInWithInvitation = () => {
    if (id) sessionStorage.setItem('pendingInvitation', id);
    navigate('/auth/signin');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-0 px-4">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-primary-600/[0.07] blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-xl shadow-primary-500/25">
            <Clock className="h-7 w-7 text-white" />
          </div>
        </div>

        {/* Card */}
        <div className="glass-card p-6 space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/15 border border-primary-500/20">
              {(state === 'loading' || state === 'accepting') ? (
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-500/20 border-t-primary-500" />
              ) : state === 'success' ? (
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              ) : state === 'error' ? (
                <XCircle className="h-7 w-7 text-red-400" />
              ) : (
                <UserPlus className="h-7 w-7 text-primary-400" />
              )}
            </div>
          </div>

          {/* Loading */}
          {state === 'loading' && (
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white">Loading Invitation...</h2>
              <p className="text-sm text-neutral-400 mt-1">Verifying your invitation</p>
            </div>
          )}

          {/* Accepting */}
          {state === 'accepting' && (
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white">Accepting Invitation...</h2>
              <p className="text-sm text-neutral-400 mt-1">Adding you to the organization</p>
            </div>
          )}

          {/* Success */}
          {state === 'success' && (
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white">Welcome Aboard!</h2>
              <p className="text-sm text-neutral-400 mt-1">
                You've joined the organization. Redirecting...
              </p>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="mt-4 inline-flex"
              >
                <span className="badge-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Invitation accepted
                </span>
              </motion.div>
            </div>
          )}

          {/* Error */}
          {state === 'error' && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-white">Invitation Error</h2>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <XCircle className="h-4 w-4 shrink-0" />
                {errorMessage}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => navigate('/auth/signin')}
                  variant="outline"
                  className="h-11 rounded-xl border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08]"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => navigate('/auth/signup')}
                  className="h-11 rounded-xl bg-primary-500 hover:bg-primary-600"
                >
                  Sign Up
                </Button>
              </div>
            </div>
          )}

          {/* Not logged in */}
          {state === 'not-logged-in' && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-white">You're Invited!</h2>
                <p className="text-sm text-neutral-400 mt-1">
                  Sign up or sign in to accept your invitation to Torre Tempo.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleSignUpWithInvitation}
                  className="w-full h-12 gap-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium min-h-touch"
                >
                  <UserPlus className="h-4 w-4" />
                  Create Account & Join
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/[0.06]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-surface-0 px-3 text-neutral-600">Already have an account?</span>
                  </div>
                </div>

                <Button
                  onClick={handleSignInWithInvitation}
                  variant="outline"
                  className="w-full h-11 gap-2 rounded-xl border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08]"
                >
                  <Mail className="h-4 w-4" />
                  Sign In & Join
                </Button>
              </div>

              <p className="text-center text-xs text-neutral-500">
                Your invitation will be automatically accepted after you sign in.
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          <Link to="/" className="hover:text-neutral-300 transition-colors">
            Back to home
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
