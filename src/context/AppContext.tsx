import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Customer, Delivery, Payment, Settings, DashboardStats } from '../types';
import * as db from '../services/dataService';
import { getAuth } from '../services/adminService';
import { 
  upsertCustomerToSupabase, deleteCustomerFromSupabase,
  upsertDeliveryToSupabase, deleteDeliveryFromSupabase,
  upsertPaymentToSupabase, deletePaymentFromSupabase,
  pullCloudDataToLocal
} from '../services/supabaseService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import toast from 'react-hot-toast';

interface AppContextType {
  // Data
  customers: Customer[];
  deliveries: Delivery[];
  payments: Payment[];
  settings: Settings;
  stats: DashboardStats;
  isSyncing: boolean;

  // Sync & Refresh
  refreshAll: () => void;
  refreshCustomers: () => void;
  refreshDeliveries: () => void;
  refreshPayments: () => void;
  refreshStats: () => void;
  syncFromCloud: (showToast?: boolean) => Promise<{ success: boolean; message: string }>;

  // Customer actions
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => Customer | null;
  deleteCustomer: (id: string) => boolean;

  // Delivery actions
  addDelivery: (delivery: Omit<Delivery, 'id' | 'createdAt' | 'updatedAt'>) => Delivery;
  updateDelivery: (id: string, updates: Partial<Delivery>) => Delivery | null;
  deleteDelivery: (id: string) => boolean;

  // Payment actions
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) => Payment;
  updatePayment: (id: string, updates: Partial<Payment>) => Payment | null;
  deletePayment: (id: string) => boolean;

  // Settings
  updateSettings: (updates: Partial<Settings>) => Settings;

  // Helpers
  getCustomerBalance: (customerId: string) => ReturnType<typeof db.getCustomerBalance>;
  getCurrencySymbol: () => string;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // Initialize current business from auth if available
  const auth = getAuth();
  if (auth.businessId) {
    db.setCurrentBusiness(auth.businessId);
  }

  const [customers, setCustomers] = useState<Customer[]>(() => db.getCustomers());
  const [deliveries, setDeliveries] = useState<Delivery[]>(() => db.getDeliveries());
  const [payments, setPayments] = useState<Payment[]>(() => db.getPayments());
  const [settings, setSettings] = useState<Settings>(() => db.getSettings());
  const [stats, setStats] = useState<DashboardStats>(() => db.getDashboardStats());
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshCustomers = useCallback(() => setCustomers(db.getCustomers()), []);
  const refreshDeliveries = useCallback(() => setDeliveries(db.getDeliveries()), []);
  const refreshPayments = useCallback(() => setPayments(db.getPayments()), []);
  const refreshStats = useCallback(() => setStats(db.getDashboardStats()), []);

  const refreshAll = useCallback(() => {
    refreshCustomers();
    refreshDeliveries();
    refreshPayments();
    refreshStats();
    setSettings(db.getSettings());
  }, [refreshCustomers, refreshDeliveries, refreshPayments, refreshStats]);

  const syncFromCloud = useCallback(async (showToast = true) => {
    const currentAuth = getAuth();
    const bizId = currentAuth.businessId;
    if (!bizId) {
      if (showToast) toast.error('Pehle kisi business me login karein.');
      return { success: false, message: 'No business logged in' };
    }

    if (!isSupabaseConfigured()) {
      if (showToast) toast.error('Supabase connect nahi hai. Settings me ja kar connect karein.');
      return { success: false, message: 'Supabase not configured' };
    }

    setIsSyncing(true);
    db.setCurrentBusiness(bizId);

    try {
      const res = await pullCloudDataToLocal(bizId);
      refreshAll();
      if (showToast) {
        if (res.success) {
          toast.success(res.message);
        } else {
          toast.error(res.message);
        }
      }
      return res;
    } catch (err: any) {
      const msg = err.message || 'Cloud sync failed';
      if (showToast) toast.error(msg);
      return { success: false, message: msg };
    } finally {
      setIsSyncing(false);
    }
  }, [refreshAll]);

  // Sync on mount, auth change, and storage events
  useEffect(() => {
    const handleAuthOrStorage = () => {
      const currentAuth = getAuth();
      const bizId = currentAuth.businessId;
      if (bizId) {
        db.setCurrentBusiness(bizId);
        refreshAll();
        if (isSupabaseConfigured()) {
          syncFromCloud(false).catch(() => {});
        }
      } else {
        db.setCurrentBusiness(null);
        refreshAll();
      }
    };

    handleAuthOrStorage();

    window.addEventListener('aquabook_auth_change', handleAuthOrStorage);
    window.addEventListener('storage', handleAuthOrStorage);

    return () => {
      window.removeEventListener('aquabook_auth_change', handleAuthOrStorage);
      window.removeEventListener('storage', handleAuthOrStorage);
    };
  }, [refreshAll, syncFromCloud]);

  const addCustomer = useCallback((customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    const result = db.addCustomer(customer);
    const currentAuth = getAuth();
    if (currentAuth.businessId && isSupabaseConfigured()) {
      upsertCustomerToSupabase(currentAuth.businessId, result).catch(() => {});
    }
    refreshAll();
    return result;
  }, [refreshAll]);

  const updateCustomer = useCallback((id: string, updates: Partial<Customer>) => {
    const result = db.updateCustomer(id, updates);
    const currentAuth = getAuth();
    if (result && currentAuth.businessId && isSupabaseConfigured()) {
      upsertCustomerToSupabase(currentAuth.businessId, result).catch(() => {});
    }
    refreshAll();
    return result;
  }, [refreshAll]);

  const deleteCustomerAction = useCallback((id: string) => {
    const result = db.deleteCustomer(id);
    if (result && isSupabaseConfigured()) {
      deleteCustomerFromSupabase(id).catch(() => {});
    }
    refreshAll();
    return result;
  }, [refreshAll]);

  const addDelivery = useCallback((delivery: Omit<Delivery, 'id' | 'createdAt' | 'updatedAt'>) => {
    const result = db.addDelivery(delivery);
    const currentAuth = getAuth();
    if (currentAuth.businessId && isSupabaseConfigured()) {
      upsertDeliveryToSupabase(currentAuth.businessId, result).catch(() => {});
    }
    refreshAll();
    return result;
  }, [refreshAll]);

  const updateDelivery = useCallback((id: string, updates: Partial<Delivery>) => {
    const result = db.updateDelivery(id, updates);
    const currentAuth = getAuth();
    if (result && currentAuth.businessId && isSupabaseConfigured()) {
      upsertDeliveryToSupabase(currentAuth.businessId, result).catch(() => {});
    }
    refreshAll();
    return result;
  }, [refreshAll]);

  const deleteDeliveryAction = useCallback((id: string) => {
    const result = db.deleteDelivery(id);
    if (result && isSupabaseConfigured()) {
      deleteDeliveryFromSupabase(id).catch(() => {});
    }
    refreshAll();
    return result;
  }, [refreshAll]);

  const addPayment = useCallback((payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) => {
    const result = db.addPayment(payment);
    const currentAuth = getAuth();
    if (currentAuth.businessId && isSupabaseConfigured()) {
      upsertPaymentToSupabase(currentAuth.businessId, result).catch(() => {});
    }
    refreshAll();
    return result;
  }, [refreshAll]);

  const updatePayment = useCallback((id: string, updates: Partial<Payment>) => {
    const result = db.updatePayment(id, updates);
    const currentAuth = getAuth();
    if (result && currentAuth.businessId && isSupabaseConfigured()) {
      upsertPaymentToSupabase(currentAuth.businessId, result).catch(() => {});
    }
    refreshAll();
    return result;
  }, [refreshAll]);

  const deletePaymentAction = useCallback((id: string) => {
    const result = db.deletePayment(id);
    if (result && isSupabaseConfigured()) {
      deletePaymentFromSupabase(id).catch(() => {});
    }
    refreshAll();
    return result;
  }, [refreshAll]);

  const updateSettingsAction = useCallback((updates: Partial<Settings>) => {
    const result = db.updateSettings(updates);
    setSettings(result);
    return result;
  }, []);

  const getCustomerBalance = useCallback((customerId: string) => {
    return db.getCustomerBalance(customerId);
  }, []);

  const getCurrencySymbol = useCallback(() => settings.currencySymbol, [settings.currencySymbol]);

  return (
    <AppContext.Provider value={{
      customers, deliveries, payments, settings, stats, isSyncing,
      refreshAll, refreshCustomers, refreshDeliveries, refreshPayments, refreshStats,
      syncFromCloud,
      addCustomer, updateCustomer, deleteCustomer: deleteCustomerAction,
      addDelivery, updateDelivery, deleteDelivery: deleteDeliveryAction,
      addPayment, updatePayment, deletePayment: deletePaymentAction,
      updateSettings: updateSettingsAction,
      getCustomerBalance, getCurrencySymbol,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
