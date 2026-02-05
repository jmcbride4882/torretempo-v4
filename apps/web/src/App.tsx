import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AdminRoute } from '@/components/layout/AdminRoute';
import { OnboardingRedirect } from '@/components/layout/OnboardingRedirect';

// Public pages
import Landing from '@/pages/Landing';

// Auth pages
import SignIn from '@/pages/auth/SignIn';
import SignUp from '@/pages/auth/SignUp';

// Onboarding pages
import CreateTenant from '@/pages/onboarding/CreateTenant';
import SelectOrganization from '@/pages/onboarding/SelectOrganization';

// Tenant pages
import AppShell from '@/components/layout/AppShell';

// Admin pages
import AdminLayout from '@/pages/admin/AdminLayout';

function App() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public landing page */}
          <Route path="/" element={<Landing />} />

          {/* Public auth routes */}
          <Route path="/auth/signin" element={<SignIn />} />
          <Route path="/auth/signup" element={<SignUp />} />

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

          {/* Fallback redirects */}
          <Route path="*" element={<Navigate to="/auth/signin" replace />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}

export default App;
