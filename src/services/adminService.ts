import { v4 as uuidv4 } from 'uuid';
import type { AdminUser, Business, SubscriptionPayment, AdminDashboardStats, AuthState } from '../types/admin';
import { setCurrentBusiness } from './dataService';
import { fetchBusinessesFromSupabase, upsertBusinessToSupabase } from './supabaseService';

const KEYS = {
  ADMIN: 'aquabook_admin',
  BUSINESSES: 'aquabook_businesses',
  SUB_PAYMENTS: 'aquabook_sub_payments',
  AUTH: 'aquabook_auth',
  INITIALIZED: 'aquabook_initialized_v2',
};

// ==================== SEED INITIAL DATA ====================
function initializeData() {
  // Ensure Super Admin exists
  const existingAdmin = localStorage.getItem(KEYS.ADMIN);
  if (!existingAdmin) {
    const admin: AdminUser = {
      id: 'admin-master-id',
      username: 'admin',
      password: 'admin123',
      role: 'super_admin',
    };
    localStorage.setItem(KEYS.ADMIN, JSON.stringify(admin));
  }

  // Ensure businesses storage is initialized as empty array if not present
  if (!localStorage.getItem(KEYS.BUSINESSES)) {
    localStorage.setItem(KEYS.BUSINESSES, JSON.stringify([]));
  }

  // Auto-purge any legacy demo businesses (PureDrop & Crystal Clear)
  try {
    const stored = localStorage.getItem(KEYS.BUSINESSES);
    if (stored) {
      const list: Business[] = JSON.parse(stored);
      const cleaned = list.filter(b => 
        b.username?.toLowerCase() !== 'puredrop' && 
        b.username?.toLowerCase() !== 'crystal' &&
        b.id !== 'biz-puredrop-001' &&
        b.id !== 'biz-crystal-002' &&
        !b.businessName?.toLowerCase().includes('puredrop') &&
        !b.businessName?.toLowerCase().includes('crystal clear')
      );
      if (cleaned.length !== list.length) {
        localStorage.setItem(KEYS.BUSINESSES, JSON.stringify(cleaned));
      }
    }

    // Clean legacy storage keys
    ['biz-puredrop-001', 'biz-crystal-002', 'biz-1', 'biz-2'].forEach(id => {
      localStorage.removeItem(`aquabook_customers_${id}`);
      localStorage.removeItem(`aquabook_deliveries_${id}`);
      localStorage.removeItem(`aquabook_payments_${id}`);
      localStorage.removeItem(`aquabook_settings_${id}`);
    });
  } catch {
    // Ignore storage parse issues
  }

  localStorage.setItem(KEYS.INITIALIZED, 'true');
}

initializeData();


// ==================== AUTH ====================
export function getAuth(): AuthState {
  try {
    const data = localStorage.getItem(KEYS.AUTH);
    return data ? JSON.parse(data) : { isAuthenticated: false, userType: null, userId: null, businessId: null };
  } catch {
    return { isAuthenticated: false, userType: null, userId: null, businessId: null };
  }
}

export function setAuth(auth: AuthState): void {
  localStorage.setItem(KEYS.AUTH, JSON.stringify(auth));
  if (auth.businessId) {
    setCurrentBusiness(auth.businessId);
  } else {
    setCurrentBusiness(null);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aquabook_auth_change', { detail: auth }));
  }
}

export function clearAuth(): void {
  localStorage.removeItem(KEYS.AUTH);
  setCurrentBusiness(null);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aquabook_auth_change', { detail: null }));
  }
}

export function loginAdmin(username: string, password: string): boolean {
  const admin = getAdmin();
  if (!admin) return false;
  if (admin.username === username.trim() && admin.password === password) {
    setAuth({ isAuthenticated: true, userType: 'admin', userId: admin.id, businessId: null });
    return true;
  }
  return false;
}

export async function loginBusiness(username: string, password: string): Promise<{ success: boolean; message: string; business?: Business }> {
  const cleanUsername = username.trim().toLowerCase();
  const cleanPassword = password.trim();

  let businesses = getBusinesses();
  let biz = businesses.find(b => b.username.toLowerCase() === cleanUsername && b.password === cleanPassword);
  
  // If not found in local storage, attempt to sync from Supabase
  if (!biz) {
    try {
      businesses = await syncBusinessesFromSupabase();
      biz = businesses.find(b => b.username.toLowerCase() === cleanUsername && b.password === cleanPassword);
    } catch {
      // Ignore network sync error
    }
  }

  if (!biz) return { success: false, message: 'Invalid username or password' };
  
  // Update subscription expiry state
  checkAndUpdateSubscription(biz.id);
  const updated = getBusinessById(biz.id) || biz;

  if (updated.isActive === false || updated.subscription.status === 'inactive') {
    return { 
      success: false, 
      message: 'Aapka account admin ne suspend (OFF) kar diya hai. Admin se rabta karein.', 
      business: updated 
    };
  }

  if (updated.subscription.status === 'expired') {
    return { 
      success: false, 
      message: 'Aapki subscription expire ho chuki hai. Admin se renewal karwayen.', 
      business: updated 
    };
  }

  setAuth({ isAuthenticated: true, userType: 'business', userId: updated.id, businessId: updated.id });
  return { success: true, message: 'Login successful', business: updated };
}

export function loginAsBusiness(businessId: string): boolean {
  let biz = getBusinessById(businessId);
  if (!biz) return false;

  // Ensure admin entering client view is always active
  if (!biz.isActive || biz.subscription.status !== 'active') {
    updateBusiness(biz.id, {
      isActive: true,
      subscription: {
        ...biz.subscription,
        status: 'active',
      }
    });
    biz = getBusinessById(businessId) || biz;
  }

  setAuth({ isAuthenticated: true, userType: 'business', userId: biz.id, businessId: biz.id });
  return true;
}

export function logout(): void {
  clearAuth();
}

// ==================== ADMIN ====================
export function getAdmin(): AdminUser | null {
  try {
    const data = localStorage.getItem(KEYS.ADMIN);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// ==================== BUSINESSES ====================
export function getBusinesses(): Business[] {
  try {
    const data = localStorage.getItem(KEYS.BUSINESSES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getBusinessById(id: string): Business | undefined {
  return getBusinesses().find(b => b.id === id);
}

export async function syncBusinessesFromSupabase(): Promise<Business[]> {
  try {
    const cloud = await fetchBusinessesFromSupabase();
    if (cloud && cloud.length > 0) {
      const local = getBusinesses();
      const map = new Map<string, Business>();
      local.forEach(b => map.set(b.id, b));
      cloud.forEach(b => {
        const existing = map.get(b.id);
        map.set(b.id, {
          ...(existing || {}),
          ...b,
          email: b.email || existing?.email || '',
          address: b.address || existing?.address || '',
        });
      });
      const merged = Array.from(map.values());
      localStorage.setItem(KEYS.BUSINESSES, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Could not sync businesses from Supabase:', err);
  }
  return getBusinesses();
}

export function addBusiness(bizData: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>): Business {
  const businesses = getBusinesses();
  const cleanUsername = bizData.username.trim().toLowerCase();
  const existingIdx = businesses.findIndex(b => b.username.toLowerCase() === cleanUsername);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const nextMonth = new Date(today);
  nextMonth.setDate(today.getDate() + 30);
  const nextMonthStr = nextMonth.toISOString().split('T')[0];

  let endDate = bizData.subscription?.endDate;
  if (!endDate || endDate < todayStr) {
    endDate = nextMonthStr;
  }

  const newBiz: Business = {
    ...bizData,
    id: existingIdx >= 0 ? businesses[existingIdx].id : uuidv4(),
    username: cleanUsername,
    isActive: true,
    subscription: {
      plan: bizData.subscription?.plan || 'monthly',
      startDate: bizData.subscription?.startDate || todayStr,
      endDate: endDate,
      status: 'active',
      amount: Number(bizData.subscription?.amount) || 0,
    },
    createdAt: existingIdx >= 0 ? businesses[existingIdx].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    businesses[existingIdx] = newBiz;
  } else {
    businesses.push(newBiz);
  }
  localStorage.setItem(KEYS.BUSINESSES, JSON.stringify(businesses));

  // Initialize storage for this business
  if (!localStorage.getItem(`aquabook_settings_${newBiz.id}`)) {
    localStorage.setItem(`aquabook_settings_${newBiz.id}`, JSON.stringify({
      businessName: newBiz.businessName,
      businessPhone: newBiz.phone,
      businessAddress: newBiz.address,
      defaultWaterPrice: 100,
      currency: 'PKR',
      currencySymbol: 'Rs.',
      notificationsEnabled: true,
      theme: 'light',
    }));
  }

  // If initial subscription amount > 0, record payment
  if (newBiz.subscription.amount > 0 && newBiz.subscription.status === 'active') {
    addSubPayment({
      businessId: newBiz.id,
      businessName: newBiz.businessName,
      amount: newBiz.subscription.amount,
      plan: newBiz.subscription.plan,
      date: newBiz.subscription.startDate,
      startDate: newBiz.subscription.startDate,
      endDate: newBiz.subscription.endDate,
      notes: `Initial ${newBiz.subscription.plan} subscription`,
    });
  }

  // Cloud Sync to Supabase
  upsertBusinessToSupabase(newBiz).catch(() => {});

  return newBiz;
}

export function updateBusiness(id: string, updates: Partial<Business>): Business | null {
  const businesses = getBusinesses();
  const index = businesses.findIndex(b => b.id === id);
  if (index === -1) return null;
  businesses[index] = { ...businesses[index], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem(KEYS.BUSINESSES, JSON.stringify(businesses));

  // Cloud Sync to Supabase
  upsertBusinessToSupabase(businesses[index]).catch(() => {});

  return businesses[index];
}

export function deleteBusiness(id: string): boolean {
  const businesses = getBusinesses();
  const filtered = businesses.filter(b => b.id !== id);
  if (filtered.length === businesses.length) return false;
  localStorage.setItem(KEYS.BUSINESSES, JSON.stringify(filtered));
  ['customers', 'deliveries', 'payments', 'settings'].forEach(key => {
    localStorage.removeItem(`aquabook_${key}_${id}`);
  });
  return true;
}

// TOGGLE ALLOW / BLOCK (ON / OFF)
export function toggleBusinessActive(id: string): Business | null {
  const biz = getBusinessById(id);
  if (!biz) return null;
  const newActive = !biz.isActive;
  const todayStr = new Date().toISOString().split('T')[0];
  const isDateValid = biz.subscription.endDate ? biz.subscription.endDate >= todayStr : true;

  return updateBusiness(id, { 
    isActive: newActive,
    subscription: {
      ...biz.subscription,
      status: newActive ? (isDateValid ? 'active' : 'expired') : 'inactive',
    }
  });
}

// ==================== SUBSCRIPTION LIFECYCLE ====================
export function checkAndUpdateSubscription(businessId: string): void {
  const biz = getBusinessById(businessId);
  if (!biz) return;

  const todayStr = new Date().toISOString().split('T')[0];
  if (biz.subscription.status === 'active' && biz.subscription.endDate && biz.subscription.endDate < todayStr) {
    updateBusiness(businessId, {
      subscription: { ...biz.subscription, status: 'expired' },
      isActive: false, // Automatically deactivate access when expired
    });
  }
}

export function renewSubscription(
  businessId: string, 
  plan: 'monthly' | 'yearly' | 'trial', 
  days: number, 
  amount: number, 
  notes?: string
): Business | null {
  const biz = getBusinessById(businessId);
  if (!biz) return null;

  const today = new Date();
  const startDate = today.toISOString().split('T')[0];
  
  const end = new Date(today);
  end.setDate(end.getDate() + days);
  const endDate = end.toISOString().split('T')[0];

  const sub = {
    plan,
    startDate,
    endDate,
    status: 'active' as const,
    amount,
  };

  if (amount > 0) {
    addSubPayment({
      businessId,
      businessName: biz.businessName,
      amount,
      plan,
      date: startDate,
      startDate,
      endDate,
      notes: notes || `${plan.toUpperCase()} plan renewed for ${days} days`,
    });
  }

  return updateBusiness(businessId, { subscription: sub, isActive: true });
}

export function setCustomSubscription(
  businessId: string,
  plan: 'trial' | 'monthly' | 'yearly',
  startDate: string,
  endDate: string,
  status: 'active' | 'inactive' | 'expired',
  amount: number
): Business | null {
  const biz = getBusinessById(businessId);
  if (!biz) return null;

  const isActive = status === 'active';

  return updateBusiness(businessId, {
    isActive,
    subscription: {
      plan,
      startDate,
      endDate,
      status,
      amount,
    }
  });
}

// ==================== SUBSCRIPTION PAYMENTS ====================
export function getSubPayments(): SubscriptionPayment[] {
  try {
    const data = localStorage.getItem(KEYS.SUB_PAYMENTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addSubPayment(payment: Omit<SubscriptionPayment, 'id' | 'createdAt'>): SubscriptionPayment {
  const payments = getSubPayments();
  const newPayment: SubscriptionPayment = {
    ...payment,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  payments.push(newPayment);
  localStorage.setItem(KEYS.SUB_PAYMENTS, JSON.stringify(payments));
  return newPayment;
}

// ==================== ADMIN STATS ====================
export function getAdminDashboardStats(): AdminDashboardStats {
  const businesses = getBusinesses();
  const payments = getSubPayments();

  businesses.forEach(b => checkAndUpdateSubscription(b.id));
  const updated = getBusinesses();

  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthPayments = payments.filter(p => p.date.startsWith(thisMonth));

  return {
    totalBusinesses: updated.length,
    activeBusinesses: updated.filter(b => b.isActive && b.subscription.status === 'active').length,
    inactiveBusinesses: updated.filter(b => !b.isActive).length,
    expiredBusinesses: updated.filter(b => b.subscription.status === 'expired').length,
    totalRevenue: payments.reduce((s, p) => s + p.amount, 0),
    thisMonthRevenue: thisMonthPayments.reduce((s, p) => s + p.amount, 0),
  };
}
