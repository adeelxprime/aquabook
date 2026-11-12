import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Customer, Delivery, Payment, Settings, DashboardStats, DeliveryBoy, TruckSupply, RouteDispatchRecord } from '../types';
import * as db from '../services/dataService';
import { getAuth } from '../services/adminService';
import { 
  upsertCustomerToSupabase, deleteCustomerFromSupabase,
  upsertDeliveryToSupabase, deleteDeliveryFromSupabase,
  upsertPaymentToSupabase, deletePaymentFromSupabase,
  upsertDeliveryBoyToSupabase, deleteDeliveryBoyFromSupabase,
  upsertRouteDispatchesPayloadToSupabase,
  pullCloudDataToLocal
} from '../services/supabaseService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import toast from 'react-hot-toast';

interface AppContextType {
  // Data
  customers: Customer[];
  deliveries: Delivery[];
  payments: Payment[];
  deliveryBoys: DeliveryBoy[];
  truckSupplies: TruckSupply[];
  routeDispatches: RouteDispatchRecord[];
  settings: Settings;
  stats: DashboardStats;
  isSyncing: boolean;

  // Sync & Refresh
  refreshAll: () => void;
  refreshCustomers: () => void;
  refreshDeliveries: () => void;
  refreshPayments: () => void;
  refreshDeliveryBoys: () => void;
  refreshTruckSupplies: () => void;
  refreshRouteDispatches: () => void;
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
  recordSkippedDelivery: (params: {
    customerId: string;
    customerName: string;
    date: string;
    time: string;
    skipReason: string;
    deliveryBoyId?: string;
    deliveryBoyName?: string;
    notes?: string;
  }) => Delivery;

  // Delivery Boy actions
  addDeliveryBoy: (boy: Omit<DeliveryBoy, 'id' | 'createdAt' | 'updatedAt'>) => DeliveryBoy;
  updateDeliveryBoy: (id: string, updates: Partial<DeliveryBoy>) => DeliveryBoy | null;
  deleteDeliveryBoy: (id: string) => boolean;

  // Route Dispatch actions
  dispatchRouteToRider: (params: {
    riderId: string;
    riderName: string;
    riderPhone: string;
    areaOrBlock: string;
    customerCount: number;
    bottleCount: number;
    message?: string;
  }) => RouteDispatchRecord;
  acknowledgeRouteDispatch: (id: string) => void;
  getActiveRouteForRider: (riderId: string) => RouteDispatchRecord | null;

  // Truck / Container actions
  addTruckSupply: (supply: Omit<TruckSupply, 'id' | 'createdAt' | 'updatedAt'>) => TruckSupply;
  updateTruckSupply: (id: string, updates: Partial<TruckSupply>) => TruckSupply | null;
  deleteTruckSupply: (id: string) => boolean;

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
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>(() => db.getDeliveryBoys());
  const [truckSupplies, setTruckSupplies] = useState<TruckSupply[]>(() => db.getTruckSupplies());
  const [routeDispatches, setRouteDispatches] = useState<RouteDispatchRecord[]>(() => db.getRouteDispatches());
  const [settings, setSettings] = useState<Settings>(() => db.getSettings());
  const [stats, setStats] = useState<DashboardStats>(() => db.getDashboardStats());
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshCustomers = useCallback(() => setCustomers(db.getCustomers()), []);
  const refreshDeliveries = useCallback(() => setDeliveries(db.getDeliveries()), []);
  const refreshPayments = useCallback(() => setPayments(db.getPayments()), []);
  const refreshDeliveryBoys = useCallback(() => setDeliveryBoys(db.getDeliveryBoys()), []);
  const refreshTruckSupplies = useCallback(() => setTruckSupplies(db.getTruckSupplies()), []);
  const refreshRouteDispatches = useCallback(() => setRouteDispatches(db.getRouteDispatches()), []);
  const refreshStats = useCallback(() => setStats(db.getDashboardStats()), []);

  const refreshAll = useCallback(() => {
    refreshCustomers();
    refreshDeliveries();
    refreshPayments();
    refreshDeliveryBoys();
    refreshTruckSupplies();
    refreshRouteDispatches();
    refreshStats();
    setSettings(db.getSettings());
  }, [refreshCustomers, refreshDeliveries, refreshPayments, refreshDeliveryBoys, refreshTruckSupplies, refreshRouteDispatches, refreshStats]);

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
      if (currentAuth.businessId) {
        db.setCurrentBusiness(currentAuth.businessId);
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

  const recordSkippedDeliveryAction = useCallback((params: {
    customerId: string;
    customerName: string;
    date: string;
    time: string;
    skipReason: string;
    deliveryBoyId?: string;
    deliveryBoyName?: string;
    notes?: string;
  }) => {
    const result = db.recordSkippedDelivery(params);
    const currentAuth = getAuth();
    if (currentAuth.businessId && isSupabaseConfigured()) {
      upsertDeliveryToSupabase(currentAuth.businessId, result).catch(() => {});
    }
    refreshAll();
    return result;
  }, [refreshAll]);

  const addDeliveryBoyAction = useCallback((boy: Omit<DeliveryBoy, 'id' | 'createdAt' | 'updatedAt'>) => {
    const result = db.addDeliveryBoy(boy);
    const currentAuth = getAuth();
    if (currentAuth.businessId && isSupabaseConfigured()) {
      upsertDeliveryBoyToSupabase(currentAuth.businessId, result).catch(() => {});
    }
    refreshAll();
    return result;
  }, [refreshAll]);

  const updateDeliveryBoyAction = useCallback((id: string, updates: Partial<DeliveryBoy>) => {
    const result = db.updateDeliveryBoy(id, updates);
    const currentAuth = getAuth();
    if (result && currentAuth.businessId && isSupabaseConfigured()) {
      upsertDeliveryBoyToSupabase(currentAuth.businessId, result).catch(() => {});
    }
    refreshAll();
    return result;
  }, [refreshAll]);

  const deleteDeliveryBoyAction = useCallback((id: string) => {
    const result = db.deleteDeliveryBoy(id);
    const currentAuth = getAuth();
    if (result && currentAuth.businessId && isSupabaseConfigured()) {
      deleteDeliveryBoyFromSupabase(currentAuth.businessId, id).catch(() => {});
    }
    refreshAll();
    return result;
  }, [refreshAll]);

  const dispatchRouteToRiderAction = useCallback((params: {
    riderId: string;
    riderName: string;
    riderPhone: string;
    areaOrBlock: string;
    customerCount: number;
    bottleCount: number;
    message?: string;
  }) => {
    const result = db.saveRouteDispatch(params);
    const currentAuth = getAuth();
    if (currentAuth.businessId && isSupabaseConfigured()) {
      upsertRouteDispatchesPayloadToSupabase(currentAuth.businessId, db.getRouteDispatches()).catch(() => {});
    }
    setRouteDispatches(db.getRouteDispatches());
    return result;
  }, []);

  const acknowledgeRouteDispatchAction = useCallback((id: string) => {
    db.acknowledgeRouteDispatch(id);
    const currentAuth = getAuth();
    if (currentAuth.businessId && isSupabaseConfigured()) {
      upsertRouteDispatchesPayloadToSupabase(currentAuth.businessId, db.getRouteDispatches()).catch(() => {});
    }
    setRouteDispatches(db.getRouteDispatches());
  }, []);

  const getActiveRouteForRiderAction = useCallback((riderId: string) => {
    return routeDispatches.find(d => d.riderId === riderId && d.status === 'active') || null;
  }, [routeDispatches]);

  const addTruckSupplyAction = useCallback((supply: Omit<TruckSupply, 'id' | 'createdAt' | 'updatedAt'>) => {
    const result = db.addTruckSupply(supply);
    refreshAll();
    return result;
  }, [refreshAll]);

  const updateTruckSupplyAction = useCallback((id: string, updates: Partial<TruckSupply>) => {
    const result = db.updateTruckSupply(id, updates);
    refreshAll();
    return result;
  }, [refreshAll]);

  const deleteTruckSupplyAction = useCallback((id: string) => {
    const result = db.deleteTruckSupply(id);
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
      customers, deliveries, payments, deliveryBoys, truckSupplies, routeDispatches, settings, stats, isSyncing,
      refreshAll, refreshCustomers, refreshDeliveries, refreshPayments, refreshDeliveryBoys, refreshTruckSupplies, refreshRouteDispatches, refreshStats,
      syncFromCloud,
      addCustomer, updateCustomer, deleteCustomer: deleteCustomerAction,
      addDelivery, updateDelivery, deleteDelivery: deleteDeliveryAction,
      recordSkippedDelivery: recordSkippedDeliveryAction,
      addDeliveryBoy: addDeliveryBoyAction, updateDeliveryBoy: updateDeliveryBoyAction, deleteDeliveryBoy: deleteDeliveryBoyAction,
      dispatchRouteToRider: dispatchRouteToRiderAction,
      acknowledgeRouteDispatch: acknowledgeRouteDispatchAction,
      getActiveRouteForRider: getActiveRouteForRiderAction,
      addTruckSupply: addTruckSupplyAction, updateTruckSupply: updateTruckSupplyAction, deleteTruckSupply: deleteTruckSupplyAction,
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
