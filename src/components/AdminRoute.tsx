import { Navigate } from 'react-router-dom';
import { getAuth } from '../services/adminService';

export default function AdminRoute({ children }: { children: React.ReactElement }) {
  const auth = getAuth();

  if (!auth.isAuthenticated || auth.userType !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
