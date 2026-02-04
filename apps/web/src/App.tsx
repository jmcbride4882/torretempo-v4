import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AdminRoute } from '@/components/layout/AdminRoute';

// Auth pages
import SignIn from '@/pages/auth/SignIn';
import SignUp from '@/pages/auth/SignUp';

// Onboarding pages
import CreateTenant from '@/pages/onboarding/CreateTenant';

// Tenant pages
import AppShell from '@/components/layout/AppShell';

// Admin pages
import AdminLayout from '@/pages/admin/AdminLayout';

function App() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public auth routes */}
          <Route path="/auth/signin" element={<SignIn />} />
          <Route path="/auth/signup" element={<SignUp />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            {/* Onboarding */}
            <Route path="/onboarding/create" element={<CreateTenant />} />

            {/* Tenant routes */}
            <Route path="/t/:slug/*" element={<AppShell />} />
          </Route>

          {/* Admin routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/*" element={<AdminLayout />} />
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/auth/signin" replace />} />
          <Route path="*" element={<Navigate to="/auth/signin" replace />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}

export default App;
