import { Navigate } from 'react-router-dom';
import { getAuth, getBusinessById, checkAndUpdateSubscription } from '../services/adminService';
import { setCurrentBusiness } from '../services/dataService';

export default function BusinessRoute({ children }: { children: React.ReactElement }) {
  const auth = getAuth();

  // If not logged in
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If admin is viewing, let them through
  if (auth.userType === 'admin') {
    return children;
  }

  // If business user
  if (!auth.businessId) {
    return <Navigate to="/login" replace />;
  }

  // Synchronize current business scope for storage
  setCurrentBusiness(auth.businessId);

  // Check subscription validity
  checkAndUpdateSubscription(auth.businessId);
  const business = getBusinessById(auth.businessId);

  // If business was not found in local storage, return to login rather than locking
  if (!business) {
    return <Navigate to="/login" replace />;
  }

  // Check if business has been explicitly suspended (OFF) or subscription expired
  if (business.isActive === false || business.subscription?.status === 'inactive' || business.subscription?.status === 'expired') {
    return <Navigate to="/subscription-expired" replace />;
  }

  return children;
}
