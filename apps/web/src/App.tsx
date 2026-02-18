import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AdminRoute } from '@/components/layout/AdminRoute';
import { OnboardingRedirect } from '@/components/layout/OnboardingRedirect';

// Public pages
import Landing from '@/pages/Landing';

// Design playground prototypes (temporary — remove after design direction chosen)
const DesignA = lazy(() => import('@/pages/Playground/DesignA'));
const DesignB = lazy(() => import('@/pages/Playground/DesignB'));
const DesignC = lazy(() => import('@/pages/Playground/DesignC'));

// Auth pages
import SignIn from '@/pages/auth/SignIn';
import SignUp from '@/pages/auth/SignUp';
import ResetPassword from '@/pages/auth/ResetPassword';
import VerifyEmail from '@/pages/auth/VerifyEmail';

// Onboarding pages
import CreateTenant from '@/pages/onboarding/CreateTenant';
import SelectOrganization from '@/pages/onboarding/SelectOrganization';
import AcceptInvitation from '@/pages/onboarding/AcceptInvitation';

// Tenant pages
import AppShell from '@/components/layout/AppShell';

// Admin pages
import AdminLayout from '@/pages/admin/AdminLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<Landing />} />

        {/* Public auth routes */}
        <Route path="/auth/signin" element={<SignIn />} />
        <Route path="/auth/signup" element={<SignUp />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/auth/verify-email" element={<VerifyEmail />} />

        {/* Public invitation acceptance */}
        <Route path="/accept-invitation/:id" element={<AcceptInvitation />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          {/* Onboarding */}
          <Route path="/onboarding/select" element={<SelectOrganization />} />
          <Route path="/onboarding/create" element={<CreateTenant />} />

          {/* Tenant routes */}
          <Route path="/t/:slug/*" element={<AppShell />} />
        </Route>

        {/* Admin routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin/*" element={<AdminLayout />} />
        </Route>

        {/* Smart redirect based on organization status */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<OnboardingRedirect />} />
        </Route>

        {/* Design playground prototypes (temporary) */}
        <Route path="/playground/a" element={<Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-indigo-500" /></div>}><DesignA /></Suspense>} />
        <Route path="/playground/b" element={<Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-teal-500" /></div>}><DesignB /></Suspense>} />
        <Route path="/playground/c" element={<Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-violet-500" /></div>}><DesignC /></Suspense>} />

        {/* Fallback redirects */}
        <Route path="*" element={<Navigate to="/auth/signin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
