import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import { LoadingSpinner } from './components/ui';
import BusinessRoute from './components/BusinessRoute';
import AdminRoute from './components/AdminRoute';

// Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const Deliveries = lazy(() => import('./pages/Deliveries'));
const Payments = lazy(() => import('./pages/Payments'));
const Reports = lazy(() => import('./pages/Reports'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const MonthlyBills = lazy(() => import('./pages/MonthlyBills'));
const QuickDelivery = lazy(() => import('./pages/QuickDelivery'));

// Auth & Admin Pages
const Login = lazy(() => import('./pages/Login'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const SubscriptionExpired = lazy(() => import('./pages/SubscriptionExpired'));

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              borderRadius: '14px',
              background: '#0f172a',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '500',
              border: '1px solid #1e293b',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            },
          }}
        />
        <Routes>
          {/* Public Auth Routes */}
          <Route
            path="/login"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <Login />
              </Suspense>
            }
          />
          <Route
            path="/admin/login"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <AdminLogin />
              </Suspense>
            }
          />
          <Route
            path="/subscription-expired"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <SubscriptionExpired />
              </Suspense>
            }
          />

          {/* Super Admin Protected Route */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminDashboard />
                </Suspense>
              </AdminRoute>
            }
          />

          {/* Client Business App Protected Routes */}
          <Route
            path="/"
            element={
              <BusinessRoute>
                <Layout />
              </BusinessRoute>
            }
          >
            <Route index element={<Suspense fallback={<LoadingSpinner />}><Dashboard /></Suspense>} />
            <Route path="quick-delivery" element={<Suspense fallback={<LoadingSpinner />}><QuickDelivery /></Suspense>} />
            <Route path="customers" element={<Suspense fallback={<LoadingSpinner />}><Customers /></Suspense>} />
            <Route path="customers/:id" element={<Suspense fallback={<LoadingSpinner />}><CustomerDetail /></Suspense>} />
            <Route path="deliveries" element={<Suspense fallback={<LoadingSpinner />}><Deliveries /></Suspense>} />
            <Route path="payments" element={<Suspense fallback={<LoadingSpinner />}><Payments /></Suspense>} />
            <Route path="monthly-bills" element={<Suspense fallback={<LoadingSpinner />}><MonthlyBills /></Suspense>} />
            <Route path="reports" element={<Suspense fallback={<LoadingSpinner />}><Reports /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<LoadingSpinner />}><SettingsPage /></Suspense>} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
