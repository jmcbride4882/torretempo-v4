import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing verification token');
      setIsVerifying(false);
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/verify-email`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify email');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/auth/signin');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify email');
    } finally {
      setIsVerifying(false);
    }
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
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">Torre Tempo</h1>
            <p className="text-sm text-neutral-500 mt-1">Workforce Management</p>
          </div>
        </div>

        {/* Card */}
        <div className="glass-card p-6 space-y-6">
          <div className="text-center">
            {isVerifying ? (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500/15 border border-primary-500/20">
                  <Mail className="h-6 w-6 text-primary-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Verifying Email</h2>
                <p className="text-sm text-neutral-400 mt-1">Please wait...</p>
                <div className="mt-6 flex justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/20 border-t-primary-500" />
                </div>
              </>
            ) : success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-2"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/20">
                  <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Email Verified!</h2>
                <p className="mt-2 text-sm text-neutral-400">
                  Your email has been verified. Redirecting to sign in...
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-2"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 border border-red-500/20">
                  <AlertCircle className="h-7 w-7 text-red-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Verification Failed</h2>
                <p className="mt-2 text-sm text-neutral-400">{error}</p>
                <Button
                  onClick={() => navigate('/auth/signin')}
                  className="mt-6 h-11 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium"
                >
                  Go to Sign In
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        {!isVerifying && (
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/auth/signin')}
              className="inline-flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
