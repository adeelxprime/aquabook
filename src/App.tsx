import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import BusinessRoute from './components/BusinessRoute';
import AdminRoute from './components/AdminRoute';

// Core Pages (Direct imports for 100% Offline PWA Reliability)
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Deliveries from './pages/Deliveries';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import SettingsPage from './pages/SettingsPage';
import MonthlyBills from './pages/MonthlyBills';
import QuickDelivery from './pages/QuickDelivery';

// Auth & Admin Pages
import Login from './pages/Login';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import SubscriptionExpired from './pages/SubscriptionExpired';

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
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/subscription-expired" element={<SubscriptionExpired />} />

          {/* Super Admin Protected Route */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
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
            <Route index element={<Dashboard />} />
            <Route path="quick-delivery" element={<QuickDelivery />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="deliveries" element={<Deliveries />} />
            <Route path="payments" element={<Payments />} />
            <Route path="monthly-bills" element={<MonthlyBills />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
