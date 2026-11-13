import { v4 as uuidv4 } from 'uuid';
import type { Customer, Delivery, Payment, Settings, CustomerMonthlyBill, DeliveryBoy, TruckSupply, RouteDispatchRecord } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Current business context — set on login
let currentBusinessId: string | null = null;

export function setCurrentBusiness(businessId: string | null) {
  currentBusinessId = businessId;
}

export function getCurrentBusiness(): string | null {
  return currentBusinessId;
}

function getKey(base: string): string {
  if (currentBusinessId) return `aquabook_${base}_${currentBusinessId}`;
  return `aquabook_${base}`;
}

const DEFAULT_SETTINGS: Settings = {
  businessName: 'AquaBook Water',
  businessPhone: '',
  businessAddress: '',
  defaultWaterPrice: 100,
  currency: 'PKR',
  currencySymbol: 'Rs.',
  notificationsEnabled: true,
  theme: 'light',
};

// Generic storage helpers
function getFromStorage<T>(key: string, defaultValue: T[]): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ==================== CUSTOMERS ====================

export function getCustomers(): Customer[] {
  return getFromStorage<Customer>(getKey('customers'), []);
}

export function getCustomerById(id: string): Customer | undefined {
  return getCustomers().find(c => c.id === id);
}

export function addCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Customer {
  const customers = getCustomers();
  const newCustomer: Customer = {
    ...customer,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  customers.push(newCustomer);
  saveToStorage(getKey('customers'), customers);
  return newCustomer;
}

export function updateCustomer(id: string, updates: Partial<Customer>): Customer | null {
  const customers = getCustomers();
  const index = customers.findIndex(c => c.id === id);
  if (index === -1) return null;
  customers[index] = { ...customers[index], ...updates, updatedAt: new Date().toISOString() };
  saveToStorage(getKey('customers'), customers);
  return customers[index];
}

export function deleteCustomer(id: string): boolean {
  const customers = getCustomers();
  const filtered = customers.filter(c => c.id !== id);
  if (filtered.length === customers.length) return false;
  saveToStorage(getKey('customers'), filtered);
  // Also delete related deliveries and payments
  const deliveries = getDeliveries().filter(d => d.customerId !== id);
  saveToStorage(getKey('deliveries'), deliveries);
  const payments = getPayments().filter(p => p.customerId !== id);
  saveToStorage(getKey('payments'), payments);
  return true;
}

export function searchCustomers(query: string): Customer[] {
  const q = query.toLowerCase().trim();
  if (!q) return getCustomers();
  return getCustomers().filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.phone.toLowerCase().includes(q) ||
    c.address.toLowerCase().includes(q)
  );
}

// ==================== DELIVERIES ====================

export function getDeliveries(): Delivery[] {
  return getFromStorage<Delivery>(getKey('deliveries'), []);
}

export function getDeliveryById(id: string): Delivery | undefined {
  return getDeliveries().find(d => d.id === id);
}

export function getDeliveriesByCustomer(customerId: string): Delivery[] {
  return getDeliveries().filter(d => d.customerId === customerId);
}

export function addDelivery(delivery: Omit<Delivery, 'id' | 'createdAt' | 'updatedAt'>): Delivery {
  const deliveries = getDeliveries();
  const newDelivery: Delivery = {
    ...delivery,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  deliveries.push(newDelivery);
  saveToStorage(getKey('deliveries'), deliveries);
  return newDelivery;
}

export function updateDelivery(id: string, updates: Partial<Delivery>): Delivery | null {
  const deliveries = getDeliveries();
  const index = deliveries.findIndex(d => d.id === id);
  if (index === -1) return null;
  deliveries[index] = { ...deliveries[index], ...updates, updatedAt: new Date().toISOString() };
  saveToStorage(getKey('deliveries'), deliveries);
  return deliveries[index];
}

export function deleteDelivery(id: string): boolean {
  const deliveries = getDeliveries();
  const filtered = deliveries.filter(d => d.id !== id);
  if (filtered.length === deliveries.length) return false;
  saveToStorage(getKey('deliveries'), filtered);
  return true;
}

export function recordSkippedDelivery(params: {
  customerId: string;
  customerName: string;
  date: string;
  time: string;
  skipReason: string;
  deliveryBoyId?: string;
  deliveryBoyName?: string;
  notes?: string;
}): Delivery {
  const existing = getDeliveries().find(d => d.customerId === params.customerId && d.date === params.date);
  if (existing) {
    const updated = updateDelivery(existing.id, {
      status: 'skipped',
      quantity: 0,
      extraBottles: 0,
      regularQuantity: 0,
      emptyBottlesReceived: 0,
      totalPrice: 0,
      paidAmount: 0,
      paymentStatus: 'unpaid',
      skipReason: params.skipReason,
      deliveryBoyId: params.deliveryBoyId,
      deliveryBoyName: params.deliveryBoyName,
      notes: params.notes || `Delivery Skipped: ${params.skipReason}`,
    });
    return updated!;
  }

  return addDelivery({
    customerId: params.customerId,
    customerName: params.customerName,
    date: params.date,
    time: params.time,
    quantity: 0,
    regularQuantity: 0,
    extraBottles: 0,
    emptyBottlesReceived: 0,
    waterType: 'Regular Jar',
    pricePerUnit: 0,
    totalPrice: 0,
    paymentStatus: 'unpaid',
    paidAmount: 0,
    status: 'skipped',
    skipReason: params.skipReason,
    deliveryBoyId: params.deliveryBoyId,
    deliveryBoyName: params.deliveryBoyName,
    notes: params.notes || `Delivery Skipped: ${params.skipReason}`,
  });
}

// ==================== PAYMENTS ====================

export function getPayments(): Payment[] {
  return getFromStorage<Payment>(getKey('payments'), []);
}

export function getPaymentById(id: string): Payment | undefined {
  return getPayments().find(p => p.id === id);
}

export function getPaymentsByCustomer(customerId: string): Payment[] {
  return getPayments().filter(p => p.customerId === customerId);
}

export function addPayment(payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Payment {
  const payments = getPayments();
  const newPayment: Payment = {
    ...payment,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  payments.push(newPayment);
  saveToStorage(getKey('payments'), payments);
  return newPayment;
}

export function updatePayment(id: string, updates: Partial<Payment>): Payment | null {
  const payments = getPayments();
  const index = payments.findIndex(p => p.id === id);
  if (index === -1) return null;
  payments[index] = { ...payments[index], ...updates, updatedAt: new Date().toISOString() };
  saveToStorage(getKey('payments'), payments);
  return payments[index];
}

export function deletePayment(id: string): boolean {
  const payments = getPayments();
  const filtered = payments.filter(p => p.id !== id);
  if (filtered.length === payments.length) return false;
  saveToStorage(getKey('payments'), filtered);
  return true;
}

// ==================== DELIVERY BOYS (RIDERS / STAFF) ====================

export function getDeliveryBoys(): DeliveryBoy[] {
  return getFromStorage<DeliveryBoy>(getKey('delivery_boys'), []);
}

export function getDeliveryBoyById(id: string): DeliveryBoy | undefined {
  return getDeliveryBoys().find(b => b.id === id);
}

export function addDeliveryBoy(boy: Omit<DeliveryBoy, 'id' | 'createdAt' | 'updatedAt'>): DeliveryBoy {
  const list = getDeliveryBoys();
  const newBoy: DeliveryBoy = {
    ...boy,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  list.push(newBoy);
  saveToStorage(getKey('delivery_boys'), list);
  return newBoy;
}

export function updateDeliveryBoy(id: string, updates: Partial<DeliveryBoy>): DeliveryBoy | null {
  const list = getDeliveryBoys();
  const index = list.findIndex(b => b.id === id);
  if (index === -1) return null;
  list[index] = { ...list[index], ...updates, updatedAt: new Date().toISOString() };
  saveToStorage(getKey('delivery_boys'), list);
  return list[index];
}

export function deleteDeliveryBoy(id: string): boolean {
  const list = getDeliveryBoys();
  const filtered = list.filter(b => b.id !== id);
  if (filtered.length === list.length) return false;
  saveToStorage(getKey('delivery_boys'), filtered);
  return true;
}

// ==================== TRUCK & CONTAINER SUPPLY (BULK WATER) ====================

export function getTruckSupplies(): TruckSupply[] {
  return getFromStorage<TruckSupply>(getKey('truck_supplies'), []);
}

export function getTruckSupplyById(id: string): TruckSupply | undefined {
  return getTruckSupplies().find(t => t.id === id);
}

export function addTruckSupply(supply: Omit<TruckSupply, 'id' | 'createdAt' | 'updatedAt'>): TruckSupply {
  const list = getTruckSupplies();
  const newSupply: TruckSupply = {
    ...supply,
    id: uuidv4(),
    tripNumber: supply.tripNumber || `TRIP-${String(list.length + 1).padStart(4, '0')}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  list.push(newSupply);
  saveToStorage(getKey('truck_supplies'), list);
  return newSupply;
}

export function updateTruckSupply(id: string, updates: Partial<TruckSupply>): TruckSupply | null {
  const list = getTruckSupplies();
  const index = list.findIndex(t => t.id === id);
  if (index === -1) return null;
  list[index] = { ...list[index], ...updates, updatedAt: new Date().toISOString() };
  saveToStorage(getKey('truck_supplies'), list);
  return list[index];
}

export function deleteTruckSupply(id: string): boolean {
  const list = getTruckSupplies();
  const filtered = list.filter(t => t.id !== id);
  if (filtered.length === list.length) return false;
  saveToStorage(getKey('truck_supplies'), filtered);
  return true;
}

// ==================== BALANCE CALCULATIONS ====================

export function getCustomerBalance(customerId: string) {
  const deliveries = getDeliveriesByCustomer(customerId);
  const payments = getPaymentsByCustomer(customerId);

  const totalCharges = deliveries.reduce((sum, d) => sum + d.totalPrice, 0);
  const totalDeliveryPayments = deliveries.reduce((sum, d) => sum + d.paidAmount, 0);
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0) + totalDeliveryPayments;
  const outstandingBalance = totalCharges - totalPayments;

  const totalFilled = deliveries.reduce((sum, d) => sum + d.quantity, 0);
  const totalReturned = deliveries.reduce((sum, d) => sum + (d.emptyBottlesReceived || 0), 0);
  const emptyBottlesHeld = Math.max(0, totalFilled - totalReturned);

  return {
    totalCharges,
    totalPayments,
    totalDeliveryPayments,
    outstandingBalance: Math.max(0, outstandingBalance),
    emptyBottlesHeld,
  };
}

export function getTotalOutstandingBalance(): number {
  const customers = getCustomers();
  return customers.reduce((sum, c) => {
    const balance = getCustomerBalance(c.id);
    return sum + balance.outstandingBalance;
  }, 0);
}

// ==================== DASHBOARD STATS ====================

export function getDashboardStats() {
  const customers = getCustomers();
  const deliveries = getDeliveries();
  const today = new Date().toISOString().split('T')[0];

  const todayAllDeliveries = deliveries.filter(d => d.date === today);
  const todayCompleted = todayAllDeliveries.filter(d => d.status !== 'skipped');
  const todaySkipped = todayAllDeliveries.filter(d => d.status === 'skipped');
  const todayRevenue = todayCompleted.reduce((sum, d) => sum + d.totalPrice, 0);
  const todayBottlesDelivered = todayCompleted.reduce((sum, d) => sum + d.quantity, 0);
  const todayExtraBottles = todayCompleted.reduce((sum, d) => sum + (d.extraBottles || 0), 0);

  const activeCustomers = customers.filter(c => c.status === 'active');
  const addressedIds = new Set(todayAllDeliveries.map(d => d.customerId));
  const todayPendingDeliveries = activeCustomers.filter(c => !addressedIds.has(c.id)).length;

  const todayTruckTrips = getTruckSupplies().filter(t => t.date === today).length;
  const pendingPayments = deliveries.filter(d => d.status !== 'skipped' && d.paymentStatus !== 'paid').length;
  const totalOutstanding = getTotalOutstandingBalance();

  return {
    totalCustomers: activeCustomers.length,
    todayDeliveries: todayCompleted.length,
    todayRevenue,
    todayBottlesDelivered,
    todaySkippedDeliveries: todaySkipped.length,
    todayPendingDeliveries,
    todayExtraBottles,
    todayTruckTrips,
    pendingPayments,
    totalOutstanding,
  };
}

export function getRecentDeliveries(limit = 5): Delivery[] {
  return getDeliveries()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function getRecentCustomers(limit = 5): Customer[] {
  return getCustomers()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

// ==================== CHART DATA ====================

export function getDeliveryChartData(days = 7) {
  const deliveries = getDeliveries();
  const data: { date: string; deliveries: number; revenue: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayDeliveries = deliveries.filter(d => d.date === dateStr);
    data.push({
      date: dateStr,
      deliveries: dayDeliveries.length,
      revenue: dayDeliveries.reduce((sum, d) => sum + d.totalPrice, 0),
    });
  }

  return data;
}

// ==================== SETTINGS ====================

export function getSettings(): Settings {
  try {
    const data = localStorage.getItem(getKey('settings'));
    if (!data) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(data);
    if (parsed.currency === 'INR' || parsed.currencySymbol === '₹' || !parsed.currency) {
      parsed.currency = 'PKR';
      parsed.currencySymbol = 'Rs.';
    }
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function updateSettings(updates: Partial<Settings>): Settings {
  const current = getSettings();
  const updated = { ...current, ...updates };
  localStorage.setItem(getKey('settings'), JSON.stringify(updated));
  return updated;
}

// ==================== REPORT DATA ====================

export function getSalesReport(period: 'daily' | 'weekly' | 'monthly', dateRange?: { start: string; end: string }) {
  const deliveries = getDeliveries();
  const payments = getPayments();

  let filteredDeliveries = deliveries;
  let filteredPayments = payments;

  if (dateRange) {
    filteredDeliveries = deliveries.filter(d => d.date >= dateRange.start && d.date <= dateRange.end);
    filteredPayments = payments.filter(p => p.date >= dateRange.start && p.date <= dateRange.end);
  }

  const totalDeliveries = filteredDeliveries.length;
  const totalRevenue = filteredDeliveries.reduce((sum, d) => sum + d.totalPrice, 0);
  const totalCollected = filteredDeliveries.reduce((sum, d) => sum + d.paidAmount, 0) +
    filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const outstanding = totalRevenue - totalCollected;

  const grouped: Record<string, { deliveries: number; revenue: number; collected: number }> = {};

  filteredDeliveries.forEach(d => {
    let key: string;
    const date = new Date(d.date);
    if (period === 'daily') {
      key = d.date;
    } else if (period === 'weekly') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!grouped[key]) {
      grouped[key] = { deliveries: 0, revenue: 0, collected: 0 };
    }
    grouped[key].deliveries += 1;
    grouped[key].revenue += d.totalPrice;
    grouped[key].collected += d.paidAmount;
  });

  return {
    totalDeliveries,
    totalRevenue,
    totalCollected,
    outstanding: Math.max(0, outstanding),
    data: Object.entries(grouped)
      .map(([key, val]) => ({ period: key, ...val }))
      .sort((a, b) => a.period.localeCompare(b.period)),
  };
}

export function getCustomerWiseSales() {
  const customers = getCustomers();
  return customers.map(c => {
    const deliveries = getDeliveriesByCustomer(c.id);
    const balance = getCustomerBalance(c.id);
    return {
      customerId: c.id,
      customerName: c.name,
      totalDeliveries: deliveries.length,
      totalQuantity: deliveries.reduce((sum, d) => sum + d.quantity, 0),
      totalRevenue: balance.totalCharges,
      totalPaid: balance.totalPayments,
      outstanding: balance.outstandingBalance,
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

// ==================== MONTHLY BILLING & STATEMENTS (WHATSAPP & PDF) ====================

export function getCustomerMonthlyBill(customerId: string, monthStr: string): CustomerMonthlyBill | null {
  const customer = getCustomerById(customerId);
  if (!customer) return null;

  const [yearStr, mStr] = monthStr.split('-');
  const monthDate = new Date(parseInt(yearStr), parseInt(mStr) - 1, 1);
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const allDeliveries = getDeliveriesByCustomer(customerId);
  const allPayments = getPaymentsByCustomer(customerId);

  // Deliveries in selected month
  const monthDeliveries = allDeliveries
    .filter(d => d.date.startsWith(monthStr))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalBottles = monthDeliveries.reduce((sum, d) => sum + d.quantity, 0);
  const monthCharges = monthDeliveries.reduce((sum, d) => sum + d.totalPrice, 0);
  const monthPaidDeliveries = monthDeliveries.reduce((sum, d) => sum + d.paidAmount, 0);

  // Payments in selected month
  const monthPayments = allPayments.filter(p => p.date.startsWith(monthStr));
  const directPayments = monthPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPaidInMonth = monthPaidDeliveries + directPayments;

  // Previous balance before this month
  const startOfMonth = `${monthStr}-01`;
  const pastDeliveries = allDeliveries.filter(d => d.date < startOfMonth);
  const pastCharges = pastDeliveries.reduce((sum, d) => sum + d.totalPrice, 0);
  const pastPaidDeliveries = pastDeliveries.reduce((sum, d) => sum + d.paidAmount, 0);

  const pastPayments = allPayments.filter(p => p.date < startOfMonth);
  const pastDirectPaid = pastPayments.reduce((sum, p) => sum + p.amount, 0);
  const pastTotalPaid = pastPaidDeliveries + pastDirectPaid;

  const previousBalance = Math.max(0, pastCharges - pastTotalPaid);

  // Net total due
  const netOutstanding = Math.max(0, previousBalance + monthCharges - totalPaidInMonth);

  const totalEmptyBottlesReturned = monthDeliveries.reduce((sum, d) => sum + (d.emptyBottlesReceived || 0), 0);

  return {
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerAddress: customer.address,
    area: customer.area,
    deliveryDays: customer.deliveryDays,
    month: monthStr,
    monthStr: monthStr,
    monthName,
    deliveries: monthDeliveries,
    totalBottles,
    totalEmptyBottlesReturned,
    pricePerUnit: customer.pricePerUnit || 30,
    monthCharges,
    monthPaidDeliveries,
    directPayments,
    totalPaidInMonth,
    previousBalance,
    netOutstanding,
  };
}

function formatTime12(timeStr: string): string {
  try {
    const [hh, mm] = timeStr.split(':').map(Number);
    if (isNaN(hh)) return timeStr;
    const period = hh >= 12 ? 'PM' : 'AM';
    const h12 = hh % 12 || 12;
    const mStr = String(mm || 0).padStart(2, '0');
    return `${h12}:${mStr} ${period}`;
  } catch {
    return timeStr;
  }
}

export function getMonthBottlesForCustomer(customerId: string, monthStr?: string): number {
  const m = monthStr || new Date().toISOString().slice(0, 7);
  const del = getDeliveriesByCustomer(customerId).filter(d => d.date.startsWith(m));
  return del.reduce((sum, d) => sum + d.quantity, 0);
}

export function normalizeWhatsAppPhone(phone: string): string {
  let clean = phone.replace(/[^0-9]/g, '');
  // Pakistani 11-digit mobile (03001234567 -> 923001234567)
  if (clean.startsWith('0') && clean.length === 11) {
    return '92' + clean.slice(1);
  }
  // Pakistani 10-digit mobile without leading 0 (3001234567 -> 923001234567)
  if (clean.length === 10 && clean.startsWith('3')) {
    return '92' + clean;
  }
  // Already in international 92 format
  if (clean.startsWith('92') && clean.length === 12) {
    return clean;
  }
  if (clean.length === 10) {
    return '92' + clean;
  }
  return clean;
}

export function formatDeliverySlipWhatsApp(
  delivery: Delivery,
  customer: Customer,
  balance: ReturnType<typeof getCustomerBalance>,
  settings: Settings,
  monthBottles?: number
): string {
  const sym = settings.currencySymbol || 'Rs.';
  const biz = settings.businessName || 'AquaBook Water';
  const phone = settings.businessPhone || '';
  const monthTotal = monthBottles !== undefined ? monthBottles : getMonthBottlesForCustomer(customer.id, delivery.date.slice(0, 7));
  const timeFormatted = formatTime12(delivery.time);

  if (delivery.status === 'skipped') {
    const reason = delivery.skipReason || 'Ghar band tha ya phone nahi uthaya';
    return `Salam ${customer.name}!
Aj aapki water delivery nahi ho saki (Wajah: ${reason}).
Agar pani chahiye to rabta karein${phone ? `: ${phone}` : ''}.
Shukriya! - ${biz}`;
  }

  const extraTxt = delivery.extraBottles && delivery.extraBottles > 0
    ? ` (+${delivery.extraBottles} Extra)`
    : '';

  const emptyTxt = delivery.emptyBottlesReceived && delivery.emptyBottlesReceived > 0
    ? `Khali can: ${delivery.emptyBottlesReceived} wapis`
    : `Khali can: pending`;

  const payStatus = delivery.paymentStatus === 'paid' ? 'Paid' : 'Udhar';

  return `Salam ${customer.name}!
Aj ${delivery.quantity} water bottle${extraTxt} deliver ho gayi.
Bill: ${sym} ${delivery.totalPrice} (${payStatus}) | ${emptyTxt} | Baqaya: ${sym} ${balance.outstandingBalance}.
Shukriya! - ${biz}${phone ? ` (${phone})` : ''}`;
}

export function formatDeliverySlipSms(
  delivery: Delivery,
  customer: Customer,
  balance: ReturnType<typeof getCustomerBalance>,
  settings: Settings,
  monthBottles?: number
): string {
  const sym = settings.currencySymbol || 'Rs.';
  const biz = settings.businessName || 'AquaBook';
  const phone = settings.businessPhone || '';
  const extraTxt = delivery.extraBottles && delivery.extraBottles > 0 ? ` (+${delivery.extraBottles} Extra)` : '';
  const payStatus = delivery.paymentStatus === 'paid' ? 'Paid' : 'Udhar';

  if (delivery.status === 'skipped') {
    return `[${biz}] Salam ${customer.name}, aj delivery nahi ho saki (${delivery.skipReason || 'Ghar band tha'}). Rabta: ${phone}`;
  }

  return `[${biz}] Salam ${customer.name}! Aj ${delivery.quantity} bottle${extraTxt} deliver hui. Bill: ${sym} ${delivery.totalPrice} (${payStatus}). Baqaya: ${sym} ${balance.outstandingBalance}. Shukriya!`;
}

export function openWhatsAppDeliverySlip(
  delivery: Delivery,
  customer: Customer,
  balance: ReturnType<typeof getCustomerBalance>,
  settings: Settings,
  monthBottles?: number
) {
  const text = formatDeliverySlipWhatsApp(delivery, customer, balance, settings, monthBottles);
  const cleanPhone = normalizeWhatsAppPhone(customer.phone);
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

export function openSmsDeliverySlip(
  delivery: Delivery,
  customer: Customer,
  balance: ReturnType<typeof getCustomerBalance>,
  settings: Settings,
  monthBottles?: number
) {
  const text = formatDeliverySlipSms(delivery, customer, balance, settings, monthBottles);
  let cleanPhone = customer.phone.replace(/[^0-9]/g, '');
  const url = `sms:${cleanPhone}?body=${encodeURIComponent(text)}`;
  window.open(url, '_self');
}

export function formatTruckSupplyWhatsApp(
  trip: TruckSupply,
  settings: Settings
): string {
  const sym = settings.currencySymbol || 'Rs.';
  const biz = settings.businessName || 'AquaBook Water';
  const phone = settings.businessPhone || '';
  const timeFormatted = formatTime12(trip.time);

  if (trip.status === 'skipped') {
    return `*${biz.toUpperCase()} - BULK SUPPLY*
*Trip Cancelled / Not Supplied (Pani Nahi Gya)*
----------------------------------------
*Client / Site:* *${trip.clientName}*
*Vehicle:* ${trip.vehicleNumber} (${trip.vehicleType.toUpperCase()})
*Driver / Staff:* ${trip.driverName}
*Tareekh:* ${trip.date} (${timeFormatted})
*Wajah:* ${trip.skipReason || 'Site closed or trip cancelled'}
----------------------------------------
${phone ? `Rabta: ${phone}\n` : ''}Shukriya!`;
  }

  const extra = trip.extraQuantity && trip.extraQuantity > 0 ? ` (+${trip.extraQuantity} Extra)` : '';
  const typeLabel = trip.supplyType === 'tanker_water' ? 'Water Tanker (Liters)' : 'Bulk Water Containers';

  return `*${biz.toUpperCase()} - BULK SUPPLY DISPATCH*
*Trip Challan / Delivery Slip*
----------------------------------------
*Client / Site:* *${trip.clientName}*
*Vehicle No:* *${trip.vehicleNumber}*
*Driver / Staff:* *${trip.driverName}*
*Tareekh:* ${trip.date} (${timeFormatted})
*Address:* ${trip.destinationAddress || 'N/A'}
----------------------------------------
*Supply Type:* ${typeLabel}
*Supplied Qty:* *${trip.quantitySupplied}${extra}*
*Total Amount:* *${sym} ${trip.totalAmount.toLocaleString()}*
*Payment Status:* *${trip.paymentStatus.toUpperCase()}* (${sym} ${trip.paidAmount} Paid)
${trip.notes ? `*Notes:* ${trip.notes}\n` : ''}----------------------------------------
${phone ? `Rabta: ${phone}\n` : ''}Shukriya!`;
}

export function openWhatsAppTruckSlip(trip: TruckSupply, settings: Settings) {
  const text = formatTruckSupplyWhatsApp(trip, settings);
  const cleanPhone = trip.clientPhone ? normalizeWhatsAppPhone(trip.clientPhone) : '';
  const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

export function getAllCustomersMonthlyBills(monthStr: string): CustomerMonthlyBill[] {
  const customers = getCustomers();
  return customers
    .map(c => getCustomerMonthlyBill(c.id, monthStr))
    .filter((b): b is CustomerMonthlyBill => b !== null)
    .sort((a, b) => b.totalBottles - a.totalBottles);
}

export function formatWhatsAppBillMessage(bill: CustomerMonthlyBill, settings: Settings): string {
  const sym = settings.currencySymbol || 'Rs.';
  const biz = settings.businessName || 'AquaBook Water';
  const phone = settings.businessPhone || '';

  return `Salam ${bill.customerName}!
Aapka ${bill.monthName} ka water bill:
Kul Bottles: ${bill.totalBottles} | Is Mahine Ka Bill: ${sym} ${bill.monthCharges.toLocaleString()}${bill.previousBalance > 0 ? ` | Purana Baqaya: ${sym} ${bill.previousBalance.toLocaleString()}` : ''}.
Kul Wajib-ul-ada (Due): ${sym} ${bill.netOutstanding.toLocaleString()} /-.
Shukriya! - ${biz}${phone ? ` (${phone})` : ''}`;
}

export function formatFullCalendarWhatsAppMessage(bill: CustomerMonthlyBill, settings: Settings): string {
  const sym = settings.currencySymbol || 'Rs.';
  const biz = settings.businessName || 'AquaBook Water Supply';
  const phone = settings.businessPhone || '';

  const monthValue = bill.month || bill.monthStr || new Date().toISOString().slice(0, 7);
  const [yearStr, monthStr] = monthValue.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const totalDays = new Date(year, month, 0).getDate();

  const deliveriesByDay: Record<number, Delivery[]> = {};
  bill.deliveries.forEach(d => {
    const day = parseInt(d.date.split('-')[2], 10);
    if (!deliveriesByDay[day]) deliveriesByDay[day] = [];
    deliveriesByDay[day].push(d);
  });

  let dailyLines = '';
  let totalExtra = 0;
  let totalEmptyReturned = 0;

  for (let day = 1; day <= totalDays; day++) {
    const dayDeliveries = deliveriesByDay[day] || [];
    const delivered = dayDeliveries.filter(d => d.status !== 'skipped');
    const skipped = dayDeliveries.filter(d => d.status === 'skipped');
    const dayQty = delivered.reduce((sum, d) => sum + d.quantity, 0);
    const dayExtra = delivered.reduce((sum, d) => sum + (d.extraBottles || 0), 0);
    const dayEmpty = delivered.reduce((sum, d) => sum + (d.emptyBottlesReceived || 0), 0);
    totalExtra += dayExtra;
    totalEmptyReturned += dayEmpty;

    if (dayQty > 0) {
      const extraText = dayExtra > 0 ? ` (Extra: +${dayExtra})` : '';
      const emptyText = dayEmpty > 0 ? ` [Khali: ${dayEmpty}]` : ` [Khali: 0]`;
      dailyLines += `${String(day).padStart(2, '0')} ${bill.monthName.slice(0, 3)}: *${dayQty} Jar(s)*${extraText}${emptyText}\n`;
    } else if (skipped.length > 0) {
      const reason = skipped[0].skipReason || 'Pani Nahi Gya';
      dailyLines += `${String(day).padStart(2, '0')} ${bill.monthName.slice(0, 3)}: *Pani Nahi Gya* (${reason})\n`;
    }
  }

  return `*${biz.toUpperCase()}*
*Rozana 1 se ${totalDays} Date Ka Hisab Statement*
*Mahina:* ${bill.monthName}
*Customer:* *${bill.customerName}*
----------------------------------------
*ROZANA BOTTLE DETAILS (1-to-31):*
${dailyLines || 'Is mahine koi delivery record nahi hua.\n'}----------------------------------------
*Total Bottles:* *${bill.totalBottles} Bottles* ${totalExtra > 0 ? `(Extra: +${totalExtra})` : ''}
*Khali Cans Wapis:* *${totalEmptyReturned} Cans*
*Month Bill:* *${sym} ${bill.monthCharges.toLocaleString()}*
*Kul Wajib-ul-ada (Due):* *${sym} ${bill.netOutstanding.toLocaleString()} /-*
----------------------------------------
${phone ? `Rabta: ${phone}\n` : ''}Shukriya!`;
}

export function formatSmsBillMessage(bill: CustomerMonthlyBill, settings: Settings): string {
  const sym = settings.currencySymbol || 'Rs.';
  const biz = settings.businessName || 'AquaBook Water';

  return `[${biz}] Salam ${bill.customerName}, ${bill.monthName} Bill: Total Bottles: ${bill.totalBottles}, Month Bill: ${sym} ${bill.monthCharges}, Purana Baqiya: ${sym} ${bill.previousBalance}, Paid: ${sym} ${bill.totalPaidInMonth}, Kul Wajib-ul-ada: ${sym} ${bill.netOutstanding}. Shukriya!`;
}

export function openWhatsAppBill(bill: CustomerMonthlyBill, settings: Settings) {
  const text = formatWhatsAppBillMessage(bill, settings);
  const cleanPhone = normalizeWhatsAppPhone(bill.customerPhone);
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

export function openWhatsAppDetailedBill(bill: CustomerMonthlyBill, settings: Settings) {
  const text = formatFullCalendarWhatsAppMessage(bill, settings);
  const cleanPhone = normalizeWhatsAppPhone(bill.customerPhone);
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

export function openSmsBill(bill: CustomerMonthlyBill, settings: Settings) {
  const text = formatSmsBillMessage(bill, settings);
  let cleanPhone = bill.customerPhone.replace(/[^0-9]/g, '');
  const url = `sms:${cleanPhone}?body=${encodeURIComponent(text)}`;
  window.open(url, '_self');
}

export function generateMonthlyBillPdf(bill: CustomerMonthlyBill, settings: Settings) {
  // Support both named and default jsPDF export across different bundlers
  const PDFConstructor: any = typeof jsPDF === 'function' ? jsPDF : (jsPDF as any)?.jsPDF || (jsPDF as any)?.default;
  const doc = new PDFConstructor();
  const sym = settings.currencySymbol || 'Rs.';

  const monthValue = bill.month || bill.monthStr || new Date().toISOString().slice(0, 7);

  // Calculate days in the month (e.g. 1 to 31)
  const [yearStr, mStr] = monthValue.split('-');
  const year = parseInt(yearStr, 10) || new Date().getFullYear();
  const month = parseInt(mStr, 10) || (new Date().getMonth() + 1);
  const totalDays = new Date(year, month, 0).getDate(); // 28, 29, 30, or 31

  // Header Banner
  doc.setFillColor(14, 165, 233); // Sky blue #0ea5e9
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.businessName || 'AquaBook Water Supply', 14, 16);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('MONTHLY WATER STATEMENT & 1-TO-31 DAILY DELIVERY REGISTER', 14, 23);
  if (settings.businessPhone) {
    doc.text(`Helpline: ${settings.businessPhone}`, 196, 23, { align: 'right' });
  }

  // Customer & Month Details Box
  doc.setTextColor(30, 41, 59);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 33, 182, 26, 3, 3, 'F');

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Customer: ${bill.customerName || 'Customer'}`, 20, 42);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Mobile: ${bill.customerPhone || 'N/A'}`, 20, 48);
  doc.text(`Address: ${bill.customerAddress || '—'}`, 20, 54);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`Billing Month: ${bill.monthName || monthValue}`, 188, 42, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Invoice Date: ${new Date().toISOString().split('T')[0]}`, 188, 48, { align: 'right' });

  // Summary Metrics Banner (5 key numbers)
  const startYSummary = 63;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, startYSummary, 182, 20, 3, 3, 'F');

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Total Bottles', 18, startYSummary + 6);
  doc.text('This Month Bill', 56, startYSummary + 6);
  doc.text('Previous Due', 96, startYSummary + 6);
  doc.text('Total Paid', 134, startYSummary + 6);
  doc.text('NET PAYABLE', 165, startYSummary + 6);

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(14, 165, 233);
  doc.text(`${bill.totalBottles || 0} Jars`, 18, startYSummary + 15);

  doc.setTextColor(15, 23, 42);
  doc.text(`${sym} ${(bill.monthCharges || 0).toLocaleString()}`, 56, startYSummary + 15);
  doc.text(`${sym} ${(bill.previousBalance || 0).toLocaleString()}`, 96, startYSummary + 15);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(`${sym} ${(bill.totalPaidInMonth || 0).toLocaleString()}`, 134, startYSummary + 15);

  doc.setTextColor(225, 29, 72); // Rose/Red
  doc.setFontSize(11);
  doc.text(`${sym} ${(bill.netOutstanding || 0).toLocaleString()}`, 165, startYSummary + 15);

  // Group deliveries by day of the month
  const deliveriesByDay: Record<number, Delivery[]> = {};
  (bill.deliveries || []).forEach(d => {
    if (!d || !d.date) return;
    const parts = d.date.split('-');
    const day = parseInt(parts[2], 10);
    if (!deliveriesByDay[day]) deliveriesByDay[day] = [];
    deliveriesByDay[day].push(d);
  });

  // Group customer payments by day of the month
  const paymentsByDay: Record<number, number> = {};
  const allPayments = getPaymentsByCustomer(bill.customerId).filter(p => p.date && p.date.startsWith(monthValue));
  allPayments.forEach(p => {
    const parts = p.date.split('-');
    const day = parseInt(parts[2], 10);
    paymentsByDay[day] = (paymentsByDay[day] || 0) + (p.amount || 0);
  });

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Build the 1 to 31 Day table rows
  const tableData: (string | number)[][] = [];
  let sumReturned = 0;
  let sumExtraBottles = 0;
  let sumRegularBottles = 0;

  for (let day = 1; day <= totalDays; day++) {
    const dateObj = new Date(year, month - 1, day);
    const dayName = daysOfWeek[dateObj.getDay()];
    const dateFormatted = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
    
    const dayDeliveries = deliveriesByDay[day] || [];
    const delivered = dayDeliveries.filter(d => d.status !== 'skipped');
    const skipped = dayDeliveries.filter(d => d.status === 'skipped');

    const dayQty = delivered.reduce((sum, d) => sum + (d.quantity || 0), 0);
    const dayExtra = delivered.reduce((sum, d) => sum + (d.extraBottles || 0), 0);
    const dayRegular = delivered.reduce((sum, d) => sum + (d.regularQuantity || (d.quantity - (d.extraBottles || 0))), 0);
    const dayEmpty = delivered.reduce((sum, d) => sum + (d.emptyBottlesReceived || 0), 0);
    const dayTotal = delivered.reduce((sum, d) => sum + (d.totalPrice || 0), 0);
    const dayPaid = paymentsByDay[day] || 0;

    sumReturned += dayEmpty;
    sumExtraBottles += dayExtra;
    sumRegularBottles += dayRegular;

    let bottlesStr = '-';
    let emptyStr = '-';

    if (dayQty > 0) {
      if (dayExtra > 0) {
        bottlesStr = `${dayQty} Jar (${dayRegular} Reg + ${dayExtra} Extra)`;
      } else {
        bottlesStr = `${dayQty} Jar(s)`;
      }

      if (dayEmpty > 0) {
        emptyStr = `${dayEmpty} Can Wapis [OK]`;
      } else {
        emptyStr = 'Nahi Mila [Pending]';
      }
    } else if (skipped.length > 0) {
      bottlesStr = `Pani Nahi Gya (${skipped[0].skipReason || 'Skipped'})`;
      emptyStr = '-';
    }

    const billStr = dayTotal > 0 ? `${sym} ${dayTotal.toLocaleString()}` : '-';
    const paidStr = dayPaid > 0 ? `${sym} ${dayPaid.toLocaleString()}` : '-';

    tableData.push([
      `Day ${day} (${dayName})`,
      dateFormatted,
      bottlesStr,
      emptyStr,
      billStr,
      paidStr,
    ]);
  }

  autoTable(doc, {
    startY: 87,
    head: [['Tareekh (Day)', 'Full Date', 'Bottles Delivered (Regular + Extra)', 'Khali Can Status', 'Daily Bill', 'Wasooli (Paid)']],
    body: tableData,
    foot: [[
      'TOTAL (1-31)',
      `${totalDays} Days`,
      `${bill.totalBottles || 0} (${sumRegularBottles} Reg + ${sumExtraBottles} Extra)`,
      `${sumReturned} Cans Wapis`,
      `${sym} ${(bill.monthCharges || 0).toLocaleString()}`,
      `${sym} ${(bill.totalPaidInMonth || 0).toLocaleString()}`,
    ]],
    styles: { fontSize: 7, cellPadding: 1.8, halign: 'center' },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center', fontStyle: 'bold' },
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right', textColor: [16, 185, 129], fontStyle: 'bold' },
    },
    headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255], fontStyle: 'bold' },
    footStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  const finalY = ((doc as any).lastAutoTable?.finalY || 160) + 6;
  if (finalY < 270) {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(110, finalY, 86, 22, 2, 2, 'F');

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Total Month Bottles:', 114, finalY + 5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${bill.totalBottles || 0} (${sumExtraBottles} Extra)`, 192, finalY + 5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text('Khali Cans Wapis Mile:', 114, finalY + 10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`${sumReturned} Cans`, 192, finalY + 10.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(190, 18, 60);
    doc.text('Kul Wajib-ul-ada (Net Due):', 114, finalY + 17);
    doc.setFontSize(9.5);
    doc.text(`${sym} ${(bill.netOutstanding || 0).toLocaleString()}`, 192, finalY + 17, { align: 'right' });

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'italic');
    doc.text('Rozana 1 se 31 tareekh ka mukammal hisab statement (Extra bottles & khali can details samet). Shukriya!', 14, 287);
  }

  const cleanName = (bill.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Bill_${cleanName}_${monthValue}.pdf`;

  // Cross-browser mobile and desktop save
  try {
    doc.save(fileName);
  } catch {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// ==================== ROUTE DISPATCH & NOTIFICATIONS ====================

export function getRouteDispatches(): RouteDispatchRecord[] {
  const scopedKey = getKey('route_dispatches');
  const scoped = getFromStorage<RouteDispatchRecord>(scopedKey, []);
  const legacy = getFromStorage<RouteDispatchRecord>('aquabook_route_dispatches', []);

  const extra: RouteDispatchRecord[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('aquabook_route_dispatches_') && k !== scopedKey) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) extra.push(...parsed);
        }
      }
    }
  } catch {}

  const map = new Map<string, RouteDispatchRecord>();
  extra.forEach(d => map.set(d.id, d));
  legacy.forEach(d => map.set(d.id, d));
  scoped.forEach(d => map.set(d.id, d));

  return Array.from(map.values()).sort((a, b) => new Date(b.dispatchedAt).getTime() - new Date(a.dispatchedAt).getTime());
}

export function saveRouteDispatch(
  dispatch: Omit<RouteDispatchRecord, 'id' | 'dispatchedAt' | 'status'> & {
    id?: string;
    status?: RouteDispatchRecord['status'];
  }
): RouteDispatchRecord {
  const list = getRouteDispatches();
  const newRecord: RouteDispatchRecord = {
    id: dispatch.id || uuidv4(),
    businessId: currentBusinessId || undefined,
    riderId: dispatch.riderId,
    riderName: dispatch.riderName,
    riderPhone: dispatch.riderPhone,
    areaOrBlock: dispatch.areaOrBlock,
    targetType: dispatch.targetType,
    targetValue: dispatch.targetValue,
    customerIds: dispatch.customerIds,
    customerCount: dispatch.customerCount,
    bottleCount: dispatch.bottleCount,
    message: dispatch.message || '',
    dispatchedAt: new Date().toISOString(),
    status: dispatch.status || 'active',
    dispatchMode: dispatch.dispatchMode,
    dispatchDay: dispatch.dispatchDay,
  };

  // Replace any existing active/in_progress dispatch for this rider so only current route is active
  const filtered = list.filter(d => !(d.riderId === dispatch.riderId && (d.status === 'active' || d.status === 'in_progress' || d.status === 'acknowledged')));
  filtered.unshift(newRecord);

  // Dual-write to scoped key and global keys
  saveToStorage(getKey('route_dispatches'), filtered);
  try {
    localStorage.setItem('aquabook_route_dispatches', JSON.stringify(filtered));
    if (currentBusinessId) {
      localStorage.setItem(`aquabook_route_dispatches_${currentBusinessId}`, JSON.stringify(filtered));
    }
    window.dispatchEvent(new CustomEvent('aquabook_route_dispatched', { detail: newRecord }));
    window.dispatchEvent(new Event('storage'));
  } catch {}

  return newRecord;
}

export function acknowledgeRouteDispatch(dispatchId: string): void {
  const list = getRouteDispatches();
  const updated = list.map(d =>
    d.id === dispatchId ? { ...d, status: 'in_progress' as const } : d
  );
  saveToStorage(getKey('route_dispatches'), updated);
  try {
    localStorage.setItem('aquabook_route_dispatches', JSON.stringify(updated));
    if (currentBusinessId) {
      localStorage.setItem(`aquabook_route_dispatches_${currentBusinessId}`, JSON.stringify(updated));
    }
    window.dispatchEvent(new CustomEvent('aquabook_route_updated', { detail: { id: dispatchId, status: 'in_progress' } }));
    window.dispatchEvent(new Event('storage'));
  } catch {}
}

export function completeRouteDispatch(dispatchId: string): void {
  const list = getRouteDispatches();
  const updated = list.map(d =>
    d.id === dispatchId ? { ...d, status: 'completed' as const } : d
  );
  saveToStorage(getKey('route_dispatches'), updated);
  try {
    localStorage.setItem('aquabook_route_dispatches', JSON.stringify(updated));
    if (currentBusinessId) {
      localStorage.setItem(`aquabook_route_dispatches_${currentBusinessId}`, JSON.stringify(updated));
    }
    window.dispatchEvent(new CustomEvent('aquabook_route_updated', { detail: { id: dispatchId, status: 'completed' } }));
    window.dispatchEvent(new Event('storage'));
  } catch {}
}

export function getActiveRouteDispatchForRider(riderId: string): RouteDispatchRecord | null {
  if (!riderId) return null;
  const list = getRouteDispatches();
  const todayStr = new Date().toISOString().slice(0, 10);

  const nonCompleted = list.filter(d => 
    d.riderId === riderId && 
    (d.status === 'active' || d.status === 'in_progress' || d.status === 'acknowledged')
  );

  if (nonCompleted.length === 0) return null;

  const todayMatch = nonCompleted.find(d => d.dispatchedAt && d.dispatchedAt.slice(0, 10) === todayStr);
  if (todayMatch) return todayMatch;

  return nonCompleted[0];
}

