import { getSupabase, isSupabaseConfigured } from './supabaseClient';
import type { Customer, Delivery, Payment } from '../types';
import type { Business } from '../types/admin';

// ==========================================
// BUSINESSES (Multi-Tenant Management)
// ==========================================
export async function fetchBusinessesFromSupabase(): Promise<Business[] | null> {
  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) return null;

  try {
    let res = await client
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false });

    if (res.error) {
      // Retry without order in case created_at is not indexed/present
      res = await client.from('businesses').select('*');
    }

    if (res.error || !res.data) {
      console.warn('Supabase fetch businesses error:', res.error?.message);
      return null;
    }

    return (res.data || []).map((row: any) => ({
      id: String(row.id),
      businessName: row.business_name || row.businessName || 'Water Plant',
      ownerName: row.owner_name || row.ownerName || 'Owner',
      email: row.email || '',
      phone: row.phone || row.mobile || '',
      address: row.address || '',
      username: (row.username || '').toLowerCase().trim(),
      password: row.password_hash || row.password || '',
      isActive: row.is_active !== undefined ? Boolean(row.is_active) : (row.isActive !== undefined ? Boolean(row.isActive) : true),
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
      subscription: {
        plan: (row.plan || 'monthly') as 'monthly' | 'yearly' | 'trial',
        amount: Number(row.subscription_price || 1500),
        startDate: row.subscription_start || new Date().toISOString().split('T')[0],
        endDate: row.subscription_end || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        status: (row.is_active !== false) ? 'active' : 'inactive',
      },
    }));
  } catch (err) {
    console.warn('Supabase fetch businesses exception:', err);
    return null;
  }
}

export async function upsertBusinessToSupabase(b: Business): Promise<boolean> {
  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) return false;

  try {
    const row = {
      id: b.id,
      business_name: b.businessName,
      owner_name: b.ownerName,
      phone: b.phone,
      username: b.username,
      password_hash: b.password,
      is_active: b.isActive,
      plan: b.subscription.plan,
      subscription_price: b.subscription.amount,
      subscription_start: b.subscription.startDate,
      subscription_end: b.subscription.endDate,
      max_customers: 500,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('businesses').upsert(row);
    if (error) {
      console.warn('Supabase upsert business error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase upsert business exception:', err);
    return false;
  }
}

// ==========================================
// CUSTOMERS
// ==========================================
export async function fetchCustomersFromSupabase(businessId: string): Promise<Customer[] | null> {
  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) return null;

  try {
    let res = await client
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (res.error) {
      // Retry without order
      res = await client.from('customers').select('*').eq('business_id', businessId);
    }

    let rows = res.data;

    // Smart Multi-tenant Adoption Fallback:
    // If no records found for this businessId, check if unassigned or legacy records exist in Supabase
    if (!rows || rows.length === 0) {
      const allRes = await client.from('customers').select('*').limit(300);
      if (allRes.data && allRes.data.length > 0) {
        const unassigned = allRes.data.filter((r: any) => 
          !r.business_id || 
          r.business_id === 'biz-1' || 
          r.business_id === 'biz-puredrop-001' || 
          r.business_id === 'biz-crystal-002' ||
          String(r.business_id).trim() === ''
        );

        if (unassigned.length > 0) {
          console.log(`Auto-adopting ${unassigned.length} unassigned cloud customers for business ${businessId}`);
          rows = unassigned;
          const ids = unassigned.map((r: any) => r.id);
          client.from('customers').update({ business_id: businessId }).in('id', ids).then(() => {});
        } else {
          // Check if there is only 1 business in Supabase
          const bizRes = await client.from('businesses').select('id');
          if (bizRes.data && bizRes.data.length === 1) {
            console.log(`Single business system: associating ${allRes.data.length} cloud customers with ${businessId}`);
            rows = allRes.data;
            const allIds = rows.map((r: any) => r.id);
            client.from('customers').update({ business_id: businessId }).in('id', allIds).then(() => {});
          }
        }
      }
    }

    if (!rows) return null;

    return rows.map((row: any) => ({
      id: String(row.id),
      name: row.name || row.customer_name || 'Customer',
      phone: row.phone || row.phone_number || row.mobile || '',
      address: row.address || '',
      area: row.area || '',
      waterType: row.water_type || row.waterType || 'Regular Jar',
      quantity: Number(row.quantity || 1),
      pricePerUnit: Number(row.price_per_unit || row.pricePerUnit || row.price || 100),
      status: (row.status || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active',
      notes: row.notes || '',
      createdAt: row.created_at || row.createdAt || new Date().toISOString(),
      updatedAt: row.updated_at || row.updatedAt || row.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('Supabase fetch customers exception:', err);
    return null;
  }
}

export async function upsertCustomerToSupabase(businessId: string, c: Customer): Promise<boolean> {
  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) return false;

  try {
    const row = {
      id: c.id,
      business_id: businessId,
      name: c.name,
      phone: c.phone,
      address: c.address,
      area: c.area,
      water_type: c.waterType,
      quantity: c.quantity,
      price_per_unit: c.pricePerUnit,
      status: c.status,
      notes: c.notes,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('customers').upsert(row);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteCustomerFromSupabase(customerId: string): Promise<boolean> {
  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) return false;

  try {
    const { error } = await client.from('customers').delete().eq('id', customerId);
    return !error;
  } catch {
    return false;
  }
}

// ==========================================
// DELIVERIES
// ==========================================
export async function fetchDeliveriesFromSupabase(businessId: string): Promise<Delivery[] | null> {
  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) return null;

  try {
    let res = await client
      .from('deliveries')
      .select('*')
      .eq('business_id', businessId)
      .order('date', { ascending: false });

    if (res.error) {
      res = await client.from('deliveries').select('*').eq('business_id', businessId);
    }

    let rows = res.data;

    if (!rows || rows.length === 0) {
      const allRes = await client.from('deliveries').select('*').limit(500);
      if (allRes.data && allRes.data.length > 0) {
        const unassigned = allRes.data.filter((r: any) => 
          !r.business_id || 
          r.business_id === 'biz-1' || 
          r.business_id === 'biz-puredrop-001' || 
          r.business_id === 'biz-crystal-002' ||
          String(r.business_id).trim() === ''
        );

        if (unassigned.length > 0) {
          console.log(`Auto-adopting ${unassigned.length} unassigned cloud deliveries for business ${businessId}`);
          rows = unassigned;
          const ids = unassigned.map((r: any) => r.id);
          client.from('deliveries').update({ business_id: businessId }).in('id', ids).then(() => {});
        } else {
          const bizRes = await client.from('businesses').select('id');
          if (bizRes.data && bizRes.data.length === 1) {
            console.log(`Single business system: associating ${allRes.data.length} cloud deliveries with ${businessId}`);
            rows = allRes.data;
            const allIds = rows.map((r: any) => r.id);
            client.from('deliveries').update({ business_id: businessId }).in('id', allIds).then(() => {});
          }
        }
      }
    }

    if (!rows) return null;

    return rows.map((row: any) => ({
      id: String(row.id),
      customerId: String(row.customer_id || row.customerId || ''),
      customerName: row.customer_name || row.customerName || 'Customer',
      date: row.date || new Date().toISOString().split('T')[0],
      time: row.time || '12:00',
      quantity: Number(row.quantity || 1),
      emptyBottlesReceived: Number(row.empty_bottles_received || row.emptyBottlesReceived || 0),
      waterType: row.water_type || row.waterType || 'Regular Jar',
      pricePerUnit: Number(row.price_per_unit || row.pricePerUnit || 100),
      totalPrice: Number(row.total_price || row.totalPrice || 100),
      paymentStatus: (row.payment_status || row.paymentStatus || 'unpaid') as any,
      paidAmount: Number(row.paid_amount || row.paidAmount || 0),
      notes: row.notes || '',
      createdAt: row.created_at || row.createdAt || new Date().toISOString(),
      updatedAt: row.updated_at || row.updatedAt || row.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('Supabase fetch deliveries exception:', err);
    return null;
  }
}

export async function upsertDeliveryToSupabase(businessId: string, d: Delivery): Promise<boolean> {
  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) return false;

  try {
    const row = {
      id: d.id,
      business_id: businessId,
      customer_id: d.customerId,
      customer_name: d.customerName,
      date: d.date,
      time: d.time,
      quantity: d.quantity,
      empty_bottles_received: d.emptyBottlesReceived || 0,
      water_type: d.waterType,
      price_per_unit: d.pricePerUnit,
      total_price: d.totalPrice,
      payment_status: d.paymentStatus,
      paid_amount: d.paidAmount,
      notes: d.notes,
    };

    const { error } = await client.from('deliveries').upsert(row);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteDeliveryFromSupabase(deliveryId: string): Promise<boolean> {
  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) return false;

  try {
    const { error } = await client.from('deliveries').delete().eq('id', deliveryId);
    return !error;
  } catch {
    return false;
  }
}

// ==========================================
// PAYMENTS
// ==========================================
export async function fetchPaymentsFromSupabase(businessId: string): Promise<Payment[] | null> {
  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) return null;

  try {
    let res = await client
      .from('payments')
      .select('*')
      .eq('business_id', businessId)
      .order('date', { ascending: false });

    if (res.error) {
      res = await client.from('payments').select('*').eq('business_id', businessId);
    }

    let rows = res.data;

    if (!rows || rows.length === 0) {
      const allRes = await client.from('payments').select('*').limit(500);
      if (allRes.data && allRes.data.length > 0) {
        const unassigned = allRes.data.filter((r: any) => 
          !r.business_id || 
          r.business_id === 'biz-1' || 
          r.business_id === 'biz-puredrop-001' || 
          r.business_id === 'biz-crystal-002' ||
          String(r.business_id).trim() === ''
        );

        if (unassigned.length > 0) {
          console.log(`Auto-adopting ${unassigned.length} unassigned cloud payments for business ${businessId}`);
          rows = unassigned;
          const ids = unassigned.map((r: any) => r.id);
          client.from('payments').update({ business_id: businessId }).in('id', ids).then(() => {});
        } else {
          const bizRes = await client.from('businesses').select('id');
          if (bizRes.data && bizRes.data.length === 1) {
            console.log(`Single business system: associating ${allRes.data.length} cloud payments with ${businessId}`);
            rows = allRes.data;
            const allIds = rows.map((r: any) => r.id);
            client.from('payments').update({ business_id: businessId }).in('id', allIds).then(() => {});
          }
        }
      }
    }

    if (!rows) return null;

    return rows.map((row: any) => ({
      id: String(row.id),
      customerId: String(row.customer_id || row.customerId || ''),
      customerName: row.customer_name || row.customerName || 'Customer',
      amount: Number(row.amount || 0),
      date: row.date || new Date().toISOString().split('T')[0],
      method: (row.method || 'cash') as any,
      notes: row.notes || '',
      createdAt: row.created_at || row.createdAt || new Date().toISOString(),
      updatedAt: row.updated_at || row.updatedAt || row.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('Supabase fetch payments exception:', err);
    return null;
  }
}

export async function upsertPaymentToSupabase(businessId: string, p: Payment): Promise<boolean> {
  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) return false;

  try {
    const row = {
      id: p.id,
      business_id: businessId,
      customer_id: p.customerId,
      customer_name: p.customerName,
      amount: p.amount,
      date: p.date,
      method: p.method,
      notes: p.notes,
    };

    const { error } = await client.from('payments').upsert(row);
    return !error;
  } catch {
    return false;
  }
}

export async function deletePaymentFromSupabase(paymentId: string): Promise<boolean> {
  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) return false;

  try {
    const { error } = await client.from('payments').delete().eq('id', paymentId);
    return !error;
  } catch {
    return false;
  }
}

// ==========================================
// 1-CLICK CLOUD PULL (DOWNLOAD FROM SUPABASE TO LOCAL)
// ==========================================
export async function pullCloudDataToLocal(businessId: string): Promise<{
  success: boolean;
  message: string;
  counts: { customers: number; deliveries: number; payments: number };
}> {
  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Supabase credentials are not configured.',
      counts: { customers: 0, deliveries: 0, payments: 0 },
    };
  }

  try {
    const [cloudCust, cloudDel, cloudPay] = await Promise.all([
      fetchCustomersFromSupabase(businessId),
      fetchDeliveriesFromSupabase(businessId),
      fetchPaymentsFromSupabase(businessId),
    ]);

    const scope = `_${businessId}`;
    let custCount = 0;
    let delCount = 0;
    let payCount = 0;

    if (cloudCust && cloudCust.length > 0) {
      const localCustStr = localStorage.getItem(`aquabook_customers${scope}`);
      const localCust: Customer[] = localCustStr ? JSON.parse(localCustStr) : [];
      const custMap = new Map<string, Customer>();
      localCust.forEach(c => custMap.set(c.id, c));
      cloudCust.forEach(c => custMap.set(c.id, c));
      const merged = Array.from(custMap.values());
      localStorage.setItem(`aquabook_customers${scope}`, JSON.stringify(merged));
      custCount = merged.length;
    } else {
      const localCustStr = localStorage.getItem(`aquabook_customers${scope}`);
      custCount = localCustStr ? JSON.parse(localCustStr).length : 0;
    }

    if (cloudDel && cloudDel.length > 0) {
      const localDelStr = localStorage.getItem(`aquabook_deliveries${scope}`);
      const localDel: Delivery[] = localDelStr ? JSON.parse(localDelStr) : [];
      const delMap = new Map<string, Delivery>();
      localDel.forEach(d => delMap.set(d.id, d));
      cloudDel.forEach(d => delMap.set(d.id, d));
      const merged = Array.from(delMap.values());
      localStorage.setItem(`aquabook_deliveries${scope}`, JSON.stringify(merged));
      delCount = merged.length;
    } else {
      const localDelStr = localStorage.getItem(`aquabook_deliveries${scope}`);
      delCount = localDelStr ? JSON.parse(localDelStr).length : 0;
    }

    if (cloudPay && cloudPay.length > 0) {
      const localPayStr = localStorage.getItem(`aquabook_payments${scope}`);
      const localPay: Payment[] = localPayStr ? JSON.parse(localPayStr) : [];
      const payMap = new Map<string, Payment>();
      localPay.forEach(p => payMap.set(p.id, p));
      cloudPay.forEach(p => payMap.set(p.id, p));
      const merged = Array.from(payMap.values());
      localStorage.setItem(`aquabook_payments${scope}`, JSON.stringify(merged));
      payCount = merged.length;
    } else {
      const localPayStr = localStorage.getItem(`aquabook_payments${scope}`);
      payCount = localPayStr ? JSON.parse(localPayStr).length : 0;
    }

    return {
      success: true,
      message: `Sync kamyab! Cloud se ${cloudCust?.length || 0} Customers, ${cloudDel?.length || 0} Deliveries, aur ${cloudPay?.length || 0} Payments load ho gaye.`,
      counts: { customers: custCount, deliveries: delCount, payments: payCount },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Download failed: ${err.message || 'Error fetching from Supabase'}`,
      counts: { customers: 0, deliveries: 0, payments: 0 },
    };
  }
}

// ==========================================
// 1-CLICK CLOUD SYNC & MIGRATION TOOL (UPLOAD)
// ==========================================
export async function syncLocalDataToSupabase(businessId: string): Promise<{
  success: boolean;
  message: string;
  counts?: { customers: number; deliveries: number; payments: number };
}> {
  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) {
    return { success: false, message: 'Supabase credentials are not configured yet.' };
  }

  try {
    const scope = `_${businessId}`;
    const customersStr = localStorage.getItem(`aquabook_customers${scope}`) || '[]';
    const deliveriesStr = localStorage.getItem(`aquabook_deliveries${scope}`) || '[]';
    const paymentsStr = localStorage.getItem(`aquabook_payments${scope}`) || '[]';

    const localCustomers: Customer[] = JSON.parse(customersStr);
    const localDeliveries: Delivery[] = JSON.parse(deliveriesStr);
    const localPayments: Payment[] = JSON.parse(paymentsStr);

    // 1. Sync Customers
    for (const c of localCustomers) {
      await upsertCustomerToSupabase(businessId, c);
    }

    // 2. Sync Deliveries
    for (const d of localDeliveries) {
      await upsertDeliveryToSupabase(businessId, d);
    }

    // 3. Sync Payments
    for (const p of localPayments) {
      await upsertPaymentToSupabase(businessId, p);
    }

    return {
      success: true,
      message: `Sync kamyab! ${localCustomers.length} Customers, ${localDeliveries.length} Deliveries, aur ${localPayments.length} Payments Supabase cloud par save ho gaye.`,
      counts: {
        customers: localCustomers.length,
        deliveries: localDeliveries.length,
        payments: localPayments.length,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Sync failed: ${err.message || 'Error uploading data'}`,
    };
  }
}
