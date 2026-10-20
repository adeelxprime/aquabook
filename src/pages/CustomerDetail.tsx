import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card, StatusBadge, Button, EmptyState } from '../components/ui';
import { 
  getDeliveriesByCustomer, getPaymentsByCustomer, getCustomerBalance, 
  getCustomerMonthlyBill, openWhatsAppBill, openSmsBill, generateMonthlyBillPdf,
  openWhatsAppDeliverySlip, openSmsDeliverySlip, getMonthBottlesForCustomer
} from '../services/dataService';
import type { Delivery } from '../types';
import { 
  ArrowLeft, Phone, MapPin, Droplets, Calendar, CreditCard, 
  Truck, MessageSquare, FileDown, Send, CheckCircle2, ChevronLeft, ChevronRight,
  Plus, Minus, Clock, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import CustomerCalendarGrid from '../components/CustomerCalendarGrid';
import toast from 'react-hot-toast';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customers, settings, addDelivery } = useApp();
  const [tab, setTab] = useState<'deliveries' | 'payments' | 'bills'>('deliveries');

  // Month selector for billing
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [billMonth, setBillMonth] = useState<string>(currentMonth);

  const customer = customers.find(c => c.id === id);
  const deliveries = useMemo(() => id ? getDeliveriesByCustomer(id).sort((a, b) => b.date.localeCompare(a.date)) : [], [id, customers]);
  const payments = useMemo(() => id ? getPaymentsByCustomer(id).sort((a, b) => b.date.localeCompare(a.date)) : [], [id, customers]);
  const balance = useMemo(() => id ? getCustomerBalance(id) : { totalCharges: 0, totalPayments: 0, totalDeliveryPayments: 0, outstandingBalance: 0, emptyBottlesHeld: 0 }, [id, deliveries, payments]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayDelivery = useMemo(() => {
    return deliveries.find(d => d.date === todayStr);
  }, [deliveries, todayStr]);

  const [todayQty, setTodayQty] = useState(customer?.quantity || 1);
  const [todayEmpty, setTodayEmpty] = useState(customer?.quantity || 1);
  const [todayPaymentStatus, setTodayPaymentStatus] = useState<'paid' | 'unpaid'>('unpaid');

  const monthTotalBottles = useMemo(() => {
    if (!customer) return 0;
    return getMonthBottlesForCustomer(customer.id, currentMonth);
  }, [customer, currentMonth, deliveries]);

  // Monthly Bill for this customer
  const monthlyBill = useMemo(() => {
    if (!id) return null;
    return getCustomerMonthlyBill(id, billMonth);
  }, [id, billMonth, deliveries, payments]);

  const fmt = (v: number) => `${settings.currencySymbol}${v.toLocaleString()}`;

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Customer not found</h2>
        <p className="text-gray-500 mb-4">This customer may have been deleted.</p>
        <Button onClick={() => navigate('/customers')}>Back to Customers</Button>
      </div>
    );
  }

  const methodLabel: Record<string, string> = { cash: 'Cash', bank_transfer: 'Bank Transfer', other: 'Other' };

  // Daily Delivery Action
  const handleDeliverToday = (extraQty?: number) => {
    const qty = extraQty !== undefined ? extraQty : todayQty;
    const unitPrice = customer.pricePerUnit || settings.defaultWaterPrice || 30;
    const totalPrice = qty * unitPrice;
    const nowTime = format(new Date(), 'HH:mm');

    const newDelivery = addDelivery({
      customerId: customer.id,
      customerName: customer.name,
      date: todayStr,
      time: nowTime,
      quantity: qty,
      emptyBottlesReceived: todayEmpty,
      waterType: customer.waterType || 'Regular Jar',
      pricePerUnit: unitPrice,
      totalPrice,
      paymentStatus: todayPaymentStatus,
      paidAmount: todayPaymentStatus === 'paid' ? totalPrice : 0,
      notes: `Rozana Bottle Delivery Entry`,
    });

    toast.success(`Aj ki delivery (${qty} bottle) save ho gayi!`);

    const bal = getCustomerBalance(customer.id);
    // Open WhatsApp slip automatically
    openWhatsAppDeliverySlip(newDelivery, customer, bal, settings, monthTotalBottles + qty);
  };

  const handleSendDeliverySlipWhatsApp = (d: Delivery) => {
    const bal = getCustomerBalance(customer.id);
    openWhatsAppDeliverySlip(d, customer, bal, settings, monthTotalBottles);
    toast.success(`WhatsApp slip khul rahi hai...`);
  };

  const handleSendDeliverySlipSms = (d: Delivery) => {
    const bal = getCustomerBalance(customer.id);
    openSmsDeliverySlip(d, customer, bal, settings, monthTotalBottles);
    toast.success(`SMS khul raha hai...`);
  };

  // Bill Actions
  const handleSendWhatsApp = () => {
    if (!monthlyBill) return;
    openWhatsAppBill(monthlyBill, settings);
    toast.success(`Opening WhatsApp for ${customer.name}`);
  };

  const handleSendSms = () => {
    if (!monthlyBill) return;
    openSmsBill(monthlyBill, settings);
    toast.success(`Opening SMS for ${customer.name}`);
  };

  const handleDownloadPdf = () => {
    if (!monthlyBill) return;
    generateMonthlyBillPdf(monthlyBill, settings);
    toast.success('Downloaded PDF statement');
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/customers')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
              <StatusBadge status={customer.status} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Customer since {format(new Date(customer.createdAt), 'MMM d, yyyy')}</p>
          </div>
        </div>

        {/* Quick Send WhatsApp Bill Button in Header */}
        {monthlyBill && (
          <button
            onClick={handleSendWhatsApp}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all self-start sm:self-auto"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Send Month Bill on WhatsApp</span>
          </button>
        )}
      </div>

      {/* Info + Balance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Customer Information</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm"><Phone className="w-4 h-4 text-gray-400" /><span className="text-gray-700 font-medium">{customer.phone}</span></div>
            <div className="flex items-center gap-3 text-sm"><MapPin className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{customer.address}</span></div>
            <div className="flex items-center gap-3 text-sm"><Droplets className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{customer.quantity} × {customer.waterType} @ {fmt(customer.pricePerUnit)}</span></div>
            <div className="flex items-center gap-3 text-sm"><Calendar className="w-4 h-4 text-gray-400" /><span className="text-gray-700">Added {format(new Date(customer.createdAt), 'PPP')}</span></div>
            {customer.notes && <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 mt-2">{customer.notes}</p>}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Total Account Balance</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-xs text-gray-600 font-medium">Lifetime Deliveries Total</span>
              <span className="text-sm font-bold text-gray-900">{fmt(balance.totalCharges)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
              <span className="text-xs text-emerald-700 font-medium">Lifetime Payments Received</span>
              <span className="text-sm font-bold text-emerald-700">{fmt(balance.totalPayments)}</span>
            </div>
            <div className={`flex items-center justify-between p-4 rounded-xl ${balance.outstandingBalance > 0 ? 'bg-rose-50 border border-rose-100' : 'bg-emerald-50 border border-emerald-100'}`}>
              <span className={`text-xs font-bold uppercase tracking-wider ${balance.outstandingBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                Current Outstanding Baqiya
              </span>
              <span className={`text-2xl font-black ${balance.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {fmt(balance.outstandingBalance)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* ==================== ROZANA BOTTLE DELIVERY WIDGET ==================== */}
      <Card className="p-5 border-sky-100 bg-gradient-to-br from-sky-50/40 via-white to-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold shadow-sm">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                Rozana Bottle Khatta (Today's Delivery)
                <span className="text-[11px] font-semibold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                  {format(new Date(), 'EEEE, dd MMM yyyy')}
                </span>
              </h2>
              <p className="text-xs text-gray-500">Aj ki bottle record karein aur foran customer ke number par WhatsApp / SMS slip bhejein</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">Is Mahine Ab Tak:</span>
            <span className="font-black text-sky-700 bg-white px-2.5 py-1 rounded-xl border border-sky-100 shadow-2xs">
              {monthTotalBottles} Bottles
            </span>
          </div>
        </div>

        {todayDelivery ? (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-950">
                    ✅ Aj ki delivery save ho chuki hai ({todayDelivery.quantity} Bottle{todayDelivery.quantity > 1 ? 's' : ''})
                  </p>
                  <p className="text-xs text-emerald-700">
                    Delivered at <strong className="font-bold">{todayDelivery.time}</strong> • Amount: <strong>{fmt(todayDelivery.totalPrice)}</strong> ({todayDelivery.paymentStatus.toUpperCase()})
                    {todayDelivery.emptyBottlesReceived ? ` • Khali cans return: ${todayDelivery.emptyBottlesReceived}` : ''}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                Delivered Today
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-200/50">
              <button
                onClick={() => handleSendDeliverySlipWhatsApp(todayDelivery)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Slip Bhejein</span>
              </button>
              <button
                onClick={() => handleSendDeliverySlipSms(todayDelivery)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Mobile SMS Bhejein</span>
              </button>
              <button
                onClick={() => handleDeliverToday(1)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-all ml-auto"
                title="Add 1 more bottle to today"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ 1 Bottle Aur Add Karein</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Bottle stepper */}
            <div className="md:col-span-4 p-3 bg-white rounded-xl border border-sky-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-sky-800 uppercase block">Bhari hui Bottles</span>
                <span className="text-xs text-gray-400">{customer.waterType || 'Regular Jar'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTodayQty(Math.max(1, todayQty - 1))}
                  className="w-7 h-7 bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-lg font-bold flex items-center justify-center"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-base font-black text-sky-950 w-6 text-center">{todayQty}</span>
                <button
                  type="button"
                  onClick={() => setTodayQty(todayQty + 1)}
                  className="w-7 h-7 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-bold flex items-center justify-center"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Empty cans stepper */}
            <div className="md:col-span-3 p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-gray-700 uppercase block">Khali Can Wapis</span>
                <span className="text-xs text-gray-400">Empty Return</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTodayEmpty(Math.max(0, todayEmpty - 1))}
                  className="w-7 h-7 bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-lg font-bold flex items-center justify-center"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-base font-black text-gray-900 w-6 text-center">{todayEmpty}</span>
                <button
                  type="button"
                  onClick={() => setTodayEmpty(todayEmpty + 1)}
                  className="w-7 h-7 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-bold flex items-center justify-center"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Payment status */}
            <div className="md:col-span-2 flex md:flex-col gap-1.5 justify-center">
              <button
                type="button"
                onClick={() => setTodayPaymentStatus('unpaid')}
                className={`flex-1 py-1 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                  todayPaymentStatus === 'unpaid'
                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                Udhar (Credit)
              </button>
              <button
                type="button"
                onClick={() => setTodayPaymentStatus('paid')}
                className={`flex-1 py-1 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                  todayPaymentStatus === 'paid'
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                Cash Paid
              </button>
            </div>

            {/* Action CTA Button */}
            <div className="md:col-span-3">
              <button
                onClick={() => handleDeliverToday()}
                className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 transition-all"
              >
                <Truck className="w-4 h-4" />
                <span>Deliver {todayQty} & Bhejein Slip</span>
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Tabs Switcher */}
      <div className="flex gap-1.5 p-1 bg-gray-100 rounded-2xl w-fit">
        <button
          onClick={() => setTab('deliveries')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            tab === 'deliveries' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Delivery History ({deliveries.length})
        </button>
        <button
          onClick={() => setTab('payments')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            tab === 'payments' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Payment History ({payments.length})
        </button>
        <button
          onClick={() => setTab('bills')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            tab === 'bills' ? 'bg-emerald-500 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Monthly WhatsApp Bill</span>
        </button>
      </div>

      {/* ==================== MONTHLY CALENDAR & BILL TAB (VODABOOK) ==================== */}
      {tab === 'bills' && (
        <CustomerCalendarGrid 
          customer={customer} 
          deliveries={deliveries} 
          payments={payments} 
          settings={settings} 
        />
      )}

      {/* Deliveries Tab */}
      {tab === 'deliveries' && (
        deliveries.length === 0 ? (
          <EmptyState icon={<Truck className="w-8 h-8" />} title="No deliveries" description="No deliveries recorded for this customer yet." />
        ) : (
          <>
            <div className="hidden md:block">
              <Card className="overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date & Time</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Water</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Empty Ret.</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Send Slip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {deliveries.map(d => (
                      <tr key={d.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3.5 text-sm font-medium">
                          {format(new Date(d.date), 'MMM d, yyyy')}
                          {d.time && <span className="block text-xs text-gray-400 font-normal">{d.time}</span>}
                        </td>
                        <td className="px-5 py-3.5 text-sm">{d.waterType}</td>
                        <td className="px-5 py-3.5 text-sm font-bold">{d.quantity}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{d.emptyBottlesReceived || 0}</td>
                        <td className="px-5 py-3.5 text-sm font-bold text-gray-900">{fmt(d.totalPrice)}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={d.paymentStatus} /></td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSendDeliverySlipWhatsApp(d)}
                              title="Send WhatsApp Delivery Slip"
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>
                            <button
                              onClick={() => handleSendDeliverySlipSms(d)}
                              title="Send SMS Delivery Slip"
                              className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>SMS</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {deliveries.map(d => (
                <Card key={d.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-gray-900">{format(new Date(d.date), 'MMM d, yyyy')}</span>
                      {d.time && <span className="text-xs text-gray-400 ml-1.5">({d.time})</span>}
                    </div>
                    <StatusBadge status={d.paymentStatus} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{d.quantity} × {d.waterType}</span>
                    <span className="font-bold text-gray-900">{fmt(d.totalPrice)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                    <span className="text-gray-500">Khali Return: {d.emptyBottlesReceived || 0}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSendDeliverySlipWhatsApp(d)}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-200 flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        WhatsApp
                      </button>
                      <button
                        onClick={() => handleSendDeliverySlipSms(d)}
                        className="px-2.5 py-1 bg-sky-50 text-sky-700 font-bold rounded-lg border border-sky-200 flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        SMS
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )
      )}

      {/* Payments Tab */}
      {tab === 'payments' && (
        payments.length === 0 ? (
          <EmptyState icon={<CreditCard className="w-8 h-8" />} title="No payments" description="No payments recorded for this customer yet." />
        ) : (
          <>
            <div className="hidden md:block">
              <Card className="overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3.5 text-sm">{format(new Date(p.date), 'MMM d, yyyy')}</td>
                        <td className="px-5 py-3.5 text-sm font-semibold text-emerald-600">{fmt(p.amount)}</td>
                        <td className="px-5 py-3.5 text-sm">{methodLabel[p.method] || p.method}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">{p.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {payments.map(p => (
                <Card key={p.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{format(new Date(p.date), 'MMM d, yyyy')}</span>
                    <span className="font-semibold text-emerald-600">{fmt(p.amount)}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{methodLabel[p.method] || p.method}{p.notes ? ` • ${p.notes}` : ''}</p>
                </Card>
              ))}
            </div>
          </>
        )
      )}
    </div>
  );
}
