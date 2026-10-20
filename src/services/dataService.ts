import { v4 as uuidv4 } from 'uuid';
import type { Customer, Delivery, Payment, Settings, CustomerMonthlyBill } from '../types';
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

  const todayDeliveries = deliveries.filter(d => d.date === today);
  const todayRevenue = todayDeliveries.reduce((sum, d) => sum + d.totalPrice, 0);
  const todayBottlesDelivered = todayDeliveries.reduce((sum, d) => sum + d.quantity, 0);
  const pendingPayments = deliveries.filter(d => d.paymentStatus !== 'paid').length;
  const totalOutstanding = getTotalOutstandingBalance();

  return {
    totalCustomers: customers.filter(c => c.status === 'active').length,
    todayDeliveries: todayDeliveries.length,
    todayRevenue,
    todayBottlesDelivered,
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

  return `💧 *${biz.toUpperCase()}* 💧
🚚 *Daily Water Delivery Slip*
━━━━━━━━━━━━━━━━━━━━
👤 *Customer:* *${customer.name}*
📅 *Tareekh:* ${delivery.date} (${timeFormatted})
📦 *Aj Deliver:* *${delivery.quantity} Bottle(s)* (${delivery.waterType || 'Regular'})
🔄 *Khali Can Wapis:* *${delivery.emptyBottlesReceived || 0} Can(s)*
💵 *Aj Ka Bill:* *${sym} ${delivery.totalPrice}* (${delivery.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Udhar'})
📊 *Month Total Bottles:* *${monthTotal} Bottles*
⚠️ *Kul Baqiya (Due):* *${sym} ${balance.outstandingBalance.toLocaleString()}*
━━━━━━━━━━━━━━━━━━━━
${phone ? `📞 Rabta: ${phone}\n` : ''}🙏 Shukriya!`;
}

export function formatDeliverySlipSms(
  delivery: Delivery,
  customer: Customer,
  balance: ReturnType<typeof getCustomerBalance>,
  settings: Settings,
  monthBottles?: number
): string {
  const sym = settings.currencySymbol || 'Rs.';
  const biz = settings.businessName || 'AquaBook Water';
  const monthTotal = monthBottles !== undefined ? monthBottles : getMonthBottlesForCustomer(customer.id, delivery.date.slice(0, 7));
  const timeFormatted = formatTime12(delivery.time);

  return `[${biz}] Salam ${customer.name}, Aj ${delivery.date} ko ${timeFormatted} par ${delivery.quantity} bottle deliver hui. Khali can wapis: ${delivery.emptyBottlesReceived || 0}. Is maheene total: ${monthTotal} bottles. Aj ka bill: ${sym} ${delivery.totalPrice}. Kul Baqaya: ${sym} ${balance.outstandingBalance}. Shukriya!`;
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

export function getAllCustomersMonthlyBills(monthStr: string): CustomerMonthlyBill[] {
  const customers = getCustomers();
  return customers
    .map(c => getCustomerMonthlyBill(c.id, monthStr))
    .filter((b): b is CustomerMonthlyBill => b !== null)
    .sort((a, b) => b.totalBottles - a.totalBottles);
}

export function formatWhatsAppBillMessage(bill: CustomerMonthlyBill, settings: Settings): string {
  const sym = settings.currencySymbol || 'Rs.';
  const biz = settings.businessName || 'AquaBook Water Supply';
  const phone = settings.businessPhone || '';

  return `💧 *${biz.toUpperCase()}* 💧
🧾 *Mahana Bill - ${bill.monthName}*
━━━━━━━━━━━━━━━━━━━━
👤 *Customer:* *${bill.customerName}*
📦 *Total Bottles:* *${bill.totalBottles} Bottles*
💵 *Is Mahine Ka Bill:* *${sym} ${bill.monthCharges.toLocaleString()}*
${bill.previousBalance > 0 ? `⏳ *Purana Baqiya:* *${sym} ${bill.previousBalance.toLocaleString()}*\n` : ''}${bill.totalPaidInMonth > 0 ? `💳 *Wasool (Paid):* *${sym} ${bill.totalPaidInMonth.toLocaleString()}*\n` : ''}🔴 *KUL WAJIB-UL-ADA (DUE):* *${sym} ${bill.netOutstanding.toLocaleString()} /-*
━━━━━━━━━━━━━━━━━━━━
${phone ? `📞 Rabta: ${phone}\n` : ''}🙏 Shukriya!`;
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
  for (let day = 1; day <= totalDays; day++) {
    const dayDeliveries = deliveriesByDay[day] || [];
    const dayQty = dayDeliveries.reduce((sum, d) => sum + d.quantity, 0);
    if (dayQty > 0) {
      dailyLines += `📅 ${String(day).padStart(2, '0')} ${bill.monthName.slice(0, 3)}: *${dayQty} Jar(s)*\n`;
    }
  }

  return `💧 *${biz.toUpperCase()}* 💧
🧾 *Rozana 1 se ${totalDays} Date Ka Hisab*
📅 *Mahina:* ${bill.monthName}
👤 *Customer:* *${bill.customerName}*
━━━━━━━━━━━━━━━━━━━━
📦 *ROZANA BOTTLE DETAILS:*
${dailyLines || 'Is mahine koi delivery nahi hui.\n'}━━━━━━━━━━━━━━━━━━━━
📊 *Total Bottles:* *${bill.totalBottles} Bottles*
💵 *Month Bill:* *${sym} ${bill.monthCharges.toLocaleString()}*
🔴 *Kul Wajib-ul-ada (Due):* *${sym} ${bill.netOutstanding.toLocaleString()} /-*
━━━━━━━━━━━━━━━━━━━━
${phone ? `📞 Rabta: ${phone}\n` : ''}🙏 Shukriya!`;
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

  // Calculate days in the month (e.g. 1 to 31)
  const [yearStr, mStr] = monthValue.split('-');
  const year = parseInt(yearStr, 10) || new Date().getFullYear();
  const month = parseInt(mStr, 10) || (new Date().getMonth() + 1);
  const totalDays = new Date(year, month, 0).getDate(); // 28, 29, 30, or 31

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Build the 1 to 31 Day table rows
  const tableData: (string | number)[][] = [];
  let sumReturned = 0;

  for (let day = 1; day <= totalDays; day++) {
    const dateObj = new Date(year, month - 1, day);
    const dayName = daysOfWeek[dateObj.getDay()];
    const dateFormatted = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
    
    const dayDeliveries = deliveriesByDay[day] || [];
    const dayQty = dayDeliveries.reduce((sum, d) => sum + (d.quantity || 0), 0);
    const dayEmpty = dayDeliveries.reduce((sum, d) => sum + (d.emptyBottlesReceived || 0), 0);
    sumReturned += dayEmpty;
    const dayTotal = dayDeliveries.reduce((sum, d) => sum + (d.totalPrice || 0), 0);
    const dayPaid = paymentsByDay[day] || 0;

    const bottlesStr = dayQty > 0 ? `${dayQty} Jar(s)` : '-';
    const emptyStr = dayEmpty > 0 ? `${dayEmpty} Can(s)` : '-';
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
    head: [['Tareekh (Day)', 'Full Date', 'Bottles Delivered', 'Khali Can Wapis', 'Daily Bill', 'Wasooli (Paid)']],
    body: tableData,
    foot: [[
      'TOTAL (1-31)',
      `${totalDays} Days`,
      `${bill.totalBottles || 0} Bottles`,
      `${sumReturned} Cans`,
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
    doc.roundedRect(120, finalY, 76, 18, 2, 2, 'F');

    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Total Month Bottles:', 124, finalY + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${bill.totalBottles || 0}`, 190, finalY + 5.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(190, 18, 60);
    doc.text('Kul Wajib-ul-ada (Net Due):', 124, finalY + 13);
    doc.setFontSize(10);
    doc.text(`${sym} ${(bill.netOutstanding || 0).toLocaleString()}`, 190, finalY + 13, { align: 'right' });

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'italic');
    doc.text('Rozana 1 se 31 tareekh ka mukammal hisab statement. Shukriya!', 14, 287);
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
