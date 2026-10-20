import { useState, useMemo } from 'react';
import type { Customer, Delivery, Payment, Settings } from '../types';
import { 
  ChevronLeft, ChevronRight, Droplets, CreditCard, 
  MessageSquare, FileDown, Plus, Check, Clock 
} from 'lucide-react';
import { 
  getCustomerMonthlyBill, openWhatsAppBill, generateMonthlyBillPdf 
} from '../services/dataService';
import toast from 'react-hot-toast';

interface Props {
  customer: Customer;
  deliveries: Delivery[];
  payments: Payment[];
  settings: Settings;
  onAddDeliveryForDate?: (dateStr: string) => void;
}

export default function CustomerCalendarGrid({ customer, deliveries, payments, settings, onAddDeliveryForDate }: Props) {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  // Month navigation
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    setSelectedMonth(prev.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    setSelectedMonth(next.toISOString().slice(0, 7));
  };

  // Month metadata
  const [year, monthNum] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const monthDate = new Date(year, monthNum - 1, 1);
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Compute monthly bill
  const bill = useMemo(() => {
    return getCustomerMonthlyBill(customer.id, selectedMonth);
  }, [customer.id, selectedMonth, deliveries, payments]);

  // Index deliveries by day number (1..31)
  const deliveriesByDay = useMemo(() => {
    const map: Record<number, Delivery[]> = {};
    deliveries.forEach(d => {
      if (d.date.startsWith(selectedMonth)) {
        const day = parseInt(d.date.split('-')[2], 10);
        if (!map[day]) map[day] = [];
        map[day].push(d);
      }
    });
    return map;
  }, [deliveries, selectedMonth]);

  // Index payments by day number
  const paymentsByDay = useMemo(() => {
    const map: Record<number, Payment[]> = {};
    payments.forEach(p => {
      if (p.date.startsWith(selectedMonth)) {
        const day = parseInt(p.date.split('-')[2], 10);
        if (!map[day]) map[day] = [];
        map[day].push(p);
      }
    });
    return map;
  }, [payments, selectedMonth]);

  const sym = settings.currencySymbol || 'Rs.';

  const handleSendWhatsApp = () => {
    if (!bill) return;
    openWhatsAppBill(bill, settings);
    toast.success('Opening WhatsApp statement');
  };

  const handleDownloadPdf = () => {
    if (!bill) return;
    generateMonthlyBillPdf(bill, settings);
    toast.success('Downloaded PDF statement');
  };

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Top Header: Month Switcher */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-sky-50/80 via-white to-blue-50/60 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Droplets className="w-5 h-5 text-sky-500" />
              Monthly Bottle Register (VodaBook Calendar)
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Day-by-day bottles delivery grid & monthly hisab</p>
        </div>

        {/* Month Selector Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-white p-1 rounded-2xl border border-gray-200 shadow-xs">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-600 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-extrabold text-gray-800 px-2 min-w-[120px] text-center">
            {monthName}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-600 transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month Metrics Card */}
      {bill && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-gray-50/70 border-b border-gray-100 text-xs">
          <div className="p-2.5 bg-white rounded-xl border border-gray-200/60">
            <span className="text-gray-400 block font-semibold text-[10px] uppercase">Month Bottles</span>
            <span className="text-xl font-black text-sky-600">{bill.totalBottles} <span className="text-xs font-normal text-gray-400">jars</span></span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-gray-200/60">
            <span className="text-gray-400 block font-semibold text-[10px] uppercase">This Month Bill</span>
            <span className="text-base font-bold text-gray-900">{sym}{bill.monthCharges.toLocaleString()}</span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-gray-200/60">
            <span className="text-gray-400 block font-semibold text-[10px] uppercase">Old Due (Baqiya)</span>
            <span className="text-base font-bold text-gray-700">{sym}{bill.previousBalance.toLocaleString()}</span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-gray-200/60">
            <span className="text-gray-400 block font-semibold text-[10px] uppercase">Paid in Month</span>
            <span className="text-base font-bold text-emerald-600">{sym}{bill.totalPaidInMonth.toLocaleString()}</span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-2.5 bg-rose-50 rounded-xl border border-rose-100">
            <span className="text-rose-700 block font-bold text-[10px] uppercase">Net Due (Kul Baqiya)</span>
            <span className="text-xl font-black text-rose-600">{sym}{bill.netOutstanding.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* 31-Day Visual Grid */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-7 gap-2 sm:gap-2.5 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-[11px] font-bold uppercase text-gray-400 pb-1">
              {d}
            </div>
          ))}

          {daysArray.map(day => {
            const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
            const dayOfWeek = new Date(year, monthNum - 1, day).getDay();
            const dayDeliveries = deliveriesByDay[day] || [];
            const dayPayments = paymentsByDay[day] || [];
            const totalDayBottles = dayDeliveries.reduce((sum, d) => sum + d.quantity, 0);
            const totalDayPaid = dayPayments.reduce((sum, p) => sum + p.amount, 0);

            const hasDelivery = totalDayBottles > 0;
            const hasPayment = totalDayPaid > 0;

            return (
              <div
                key={day}
                className={`min-h-[64px] sm:min-h-[72px] p-1.5 rounded-2xl border transition-all flex flex-col justify-between ${
                  hasDelivery 
                    ? 'bg-sky-50/80 border-sky-200 text-sky-950 font-medium shadow-xs' 
                    : 'bg-gray-50/40 border-gray-100 text-gray-500 hover:border-gray-200'
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold ${hasDelivery ? 'text-sky-900' : 'text-gray-400'}`}>
                    {day}
                  </span>
                  {hasPayment && (
                    <span className="text-[9px] bg-emerald-500 text-white font-bold px-1 rounded-full" title={`Paid ${sym}${totalDayPaid}`}>
                      ✓
                    </span>
                  )}
                </div>

                {/* Bottle count indicator */}
                <div className="my-1 flex items-center justify-center">
                  {hasDelivery ? (
                    <div className="flex items-center gap-1 bg-sky-500 text-white px-2 py-0.5 rounded-lg text-xs font-black shadow-xs">
                      <Droplets className="w-3 h-3 shrink-0" />
                      <span>{totalDayBottles}</span>
                    </div>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </div>

                {/* Day note or payment indicator */}
                <div className="text-[9px] truncate text-gray-400">
                  {hasDelivery ? (
                    <span className="text-sky-700 font-semibold">{sym}{dayDeliveries[0]?.pricePerUnit * totalDayBottles}</span>
                  ) : (
                    <span>&nbsp;</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Dispatch Controls (WhatsApp & PDF) */}
      <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-full bg-sky-500 inline-block" />
          <span>Delivered bottles highlighted</span>
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block ml-2" />
          <span>Payment received</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleDownloadPdf}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <FileDown className="w-4 h-4 text-sky-500" />
            <span>Download PDF Bill</span>
          </button>

          <button
            onClick={handleSendWhatsApp}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Send Month Bill on WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
