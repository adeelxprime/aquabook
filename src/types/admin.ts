export interface AdminUser {
  id: string;
  username: string;
  password: string;
  role: 'super_admin';
}

export interface Business {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  username: string;
  password: string;
  subscription: SubscriptionInfo;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionInfo {
  plan: 'trial' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  status: 'active' | 'inactive' | 'expired';
  amount: number;
}

export interface SubscriptionPayment {
  id: string;
  businessId: string;
  businessName: string;
  amount: number;
  plan: 'trial' | 'monthly' | 'yearly';
  date: string;
  startDate: string;
  endDate: string;
  notes: string;
  createdAt: string;
}

export interface AdminDashboardStats {
  totalBusinesses: number;
  activeBusinesses: number;
  inactiveBusinesses: number;
  expiredBusinesses: number;
  totalRevenue: number;
  thisMonthRevenue: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  userType: 'admin' | 'business' | null;
  userId: string | null;
  businessId: string | null;
}
