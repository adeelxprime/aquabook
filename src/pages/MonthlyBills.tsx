import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader, Card, Button, SearchInput, EmptyState, Modal } from '../components/ui';
import { 
  getAllCustomersMonthlyBills, openWhatsAppBill, openSmsBill, 
  generateMonthlyBillPdf, getCustomerMonthlyBill, formatWhatsAppBillMessage 
} from '../services/dataService';
import type { CustomerMonthlyBill } from '../types';
import { 
  Calendar, FileDown, MessageSquare, Phone, Send, 
  ChevronLeft, ChevronRight, Eye, Droplets, CheckCircle2, 
  AlertCircle, X, Copy, ExternalLink, CheckSquare, Square, 
  Zap, Loader2, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MonthlyBills() {
  const { customers, deliveries, payments, settings } = useApp();

  // Current month default in YYYY-MM
  const currentMonthDefault = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthDefault);
  const [search, setSearch] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState<'all' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun' | 'unscheduled'>('all');
  const [selectedBillForModal, setSelectedBillForModal] = useState<CustomerMonthlyBill | null>(null);

  // Batch Multi-Customer Selection & Dispatch (Point 7)
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isDownloadingPdfs, setIsDownloadingPdfs] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');

  // Fast customer lookup
  const customerMap = useMemo(() => {
    const map = new Map<string, typeof customers[0]>();
    customers.forEach(c => map.set(c.id, c));
    return map;
  }, [customers]);

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

  // Human friendly month title
  const monthTitle = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  // Compute bills for all customers in this month
  const bills = useMemo(() => {
    return getAllCustomersMonthlyBills(selectedMonth);
  }, [selectedMonth, customers, deliveries, payments]);

  // Filtered bills by Search AND Day-wise Customer Schedule
  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchSearch = b.customerName.toLowerCase().includes(q) ||
          b.customerPhone.includes(q) ||
          b.customerAddress.toLowerCase().includes(q);
        if (!matchSearch) return false;
      }

      // Day Schedule Filter
      const cust = customerMap.get(b.customerId);
      const days = b.deliveryDays || cust?.deliveryDays;

      if (selectedDayFilter === 'all') return true;
      if (selectedDayFilter === 'unscheduled') return !days || days.length === 0;
      return Boolean(days && days.includes(selectedDayFilter));
    });
  }, [bills, search, selectedDayFilter, customerMap]);

  // Totals for this month
  const totals = useMemo(() => {
    return bills.reduce(
      (acc, b) => {
        acc.totalBottles += b.totalBottles;
        acc.totalCharges += b.monthCharges;
        acc.totalPaid += b.totalPaidInMonth;
        acc.totalOutstanding += b.netOutstanding;
        return acc;
      },
      { totalBottles: 0, totalCharges: 0, totalPaid: 0, totalOutstanding: 0 }
    );
  }, [bills]);

  const sym = settings.currencySymbol || 'Rs.';

  // Batch Multi-Select Computed List
  const selectedBills = useMemo(() => {
    return bills.filter(b => selectedCustomerIds.includes(b.customerId));
  }, [bills, selectedCustomerIds]);

  const toggleSelectCustomer = (id: string) => {
    setSelectedCustomerIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllCustomers = () => {
    if (selectedCustomerIds.length === filteredBills.length && filteredBills.length > 0) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(filteredBills.map(b => b.customerId));
    }
  };

  const handleStartQueue = () => {
    if (selectedBills.length === 0) {
      toast.error('Baraye meharbani pehle customers select karein.');
      return;
    }
    setQueueIndex(0);
    setIsQueueModalOpen(true);
  };

  const handleDownloadAllPdfs = async () => {
    if (selectedBills.length === 0) return;
    setIsDownloadingPdfs(true);
    try {
      for (let i = 0; i < selectedBills.length; i++) {
        const b = selectedBills[i];
        setPdfProgress(`${i + 1} / ${selectedBills.length}: ${b.customerName}`);
        generateMonthlyBillPdf(b, settings);
        await new Promise(r => setTimeout(r, 350));
      }
      toast.success(`Mubarak! Tamam ${selectedBills.length} customers ke PDF bills download ho gaye!`);
    } catch (err) {
      console.error(err);
      toast.error('PDFs download karne me masla aaya.');
    } finally {
      setIsDownloadingPdfs(false);
      setPdfProgress('');
    }
  };

  // Actions
  const handleSendWhatsApp = (bill: CustomerMonthlyBill) => {
    if (!bill.customerPhone) {
      toast.error('Customer phone number not available');
      return;
    }
    openWhatsAppBill(bill, settings);
    toast.success(`Opening WhatsApp for ${bill.customerName}`);
  };

  const handleSendSms = (bill: CustomerMonthlyBill) => {
    if (!bill.customerPhone) {
      toast.error('Customer phone number not available');
      return;
    }
    openSmsBill(bill, settings);
    toast.success(`Opening SMS for ${bill.customerName}`);
  };

  const handleDownloadPdf = (bill: CustomerMonthlyBill) => {
    try {
      generateMonthlyBillPdf(bill, settings);
      toast.success(`Downloaded bill for ${bill.customerName}`);
    } catch (err) {
      console.error(err);
      toast.error('Could not generate PDF');
    }
  };

  const handleCopyMessage = (bill: CustomerMonthlyBill) => {
    const msg = formatWhatsAppBillMessage(bill, settings);
    navigator.clipboard.writeText(msg);
    toast.success('Formatted WhatsApp bill copied to clipboard!');
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <PageHeader
        title="Monthly Bills & WhatsApp Statements"
        subtitle="Har customer ka mahana hisab, total bottles aur 1-click WhatsApp/PDF bill send karein"
        action={
          <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-gray-200/80 shadow-sm">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-600"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1 font-bold text-sm text-gray-800">
              <Calendar className="w-4 h-4 text-sky-500" />
              <span>{monthTitle}</span>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-600"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-gradient-to-br from-sky-50/70 to-white border-sky-100">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-700">Total Bottles Delivered</span>
            <Droplets className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-black text-sky-950">{totals.totalBottles.toLocaleString()} <span className="text-xs font-medium text-gray-500">bottles</span></p>
          <p className="text-[11px] text-gray-400 mt-0.5">Across all customers in {monthTitle}</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-50/70 to-white border-blue-100">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">This Month Invoiced</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-950">{sym}{totals.totalCharges.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Total fresh deliveries billed</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-emerald-50/70 to-white border-emerald-100">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Month Collected</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{sym}{totals.totalPaid.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Payments received in {monthTitle}</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-rose-50/70 to-white border-rose-100">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">Net Outstanding (Baqiya)</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600">{sym}{totals.totalOutstanding.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Pending dues from customers</p>
        </Card>
      </div>

      {/* Search & Month Picker Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search customer by name, mobile number, or address..."
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedDayFilter}
              onChange={(e) => {
                setSelectedDayFilter(e.target.value as any);
                setSelectedCustomerIds([]);
              }}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="all">📅 Sab Din ({bills.length})</option>
              <option value="Mon">Mon (Monday)</option>
              <option value="Tue">Tue (Tuesday)</option>
              <option value="Wed">Wed (Wednesday)</option>
              <option value="Thu">Thu (Thursday)</option>
              <option value="Fri">Fri (Friday)</option>
              <option value="Sat">Sat (Saturday)</option>
              <option value="Sun">Sun (Sunday)</option>
              <option value="unscheduled">⚠️ Schedule Baqi</option>
            </select>

            {filteredBills.length > 0 && (
              <button
                type="button"
                onClick={selectAllCustomers}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedCustomerIds.length === filteredBills.length
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>
                  {selectedCustomerIds.length === filteredBills.length
                    ? 'Deselect All'
                    : `Select All (${filteredBills.length})`}
                </span>
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">Select Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Day-Wise Schedule 1-Click Filter Chips Bar */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5 whitespace-nowrap px-1 mr-1">
            <Calendar className="w-4 h-4 text-sky-600" />
            <span>Din Ka Schedule:</span>
          </span>

          <button
            type="button"
            onClick={() => {
              setSelectedDayFilter('all');
              setSelectedCustomerIds([]);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedDayFilter === 'all'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <span>Sab Din</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              selectedDayFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {bills.length}
            </span>
          </button>

          {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map(day => {
            const dayCount = bills.filter(b => {
              const cust = customerMap.get(b.customerId);
              const days = b.deliveryDays || cust?.deliveryDays;
              return days?.includes(day);
            }).length;
            const isCurrent = selectedDayFilter === day;
            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  setSelectedDayFilter(day);
                  setSelectedCustomerIds([]);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isCurrent
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-sky-50/70 hover:bg-sky-100 text-sky-900 border border-sky-100'
                }`}
              >
                <span>{day}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isCurrent ? 'bg-white/20 text-white' : 'bg-sky-200/70 text-sky-900'
                }`}>
                  {dayCount}
                </span>
              </button>
            );
          })}

          {bills.some(b => {
            const cust = customerMap.get(b.customerId);
            const days = b.deliveryDays || cust?.deliveryDays;
            return !days || days.length === 0;
          }) && (
            <button
              type="button"
              onClick={() => {
                setSelectedDayFilter('unscheduled');
                setSelectedCustomerIds([]);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedDayFilter === 'unscheduled'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span>Schedule Baqi</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                selectedDayFilter === 'unscheduled' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
              }`}>
                {bills.filter(b => {
                  const cust = customerMap.get(b.customerId);
                  const days = b.deliveryDays || cust?.deliveryDays;
                  return !days || days.length === 0;
                }).length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 1-Click Multi-Customer Batch Dispatch Bar (Point 7) */}
      {selectedCustomerIds.length > 0 && (
        <div className="sticky top-4 z-30 bg-gradient-to-r from-emerald-600 via-teal-700 to-sky-700 text-white p-3.5 sm:p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 border border-emerald-400/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <CheckSquare className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <span className="text-xs text-emerald-100 font-bold uppercase tracking-wider block">
                Batch WhatsApp & PDF Bill Dispatcher
              </span>
              <p className="text-sm sm:text-base font-black text-white">
                {selectedCustomerIds.length} Customers Selected
                <span className="text-xs font-normal text-emerald-100 ml-2">
                  (Total Due: {sym}{selectedBills.reduce((s, b) => s + b.netOutstanding, 0).toLocaleString()})
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* 1-Click WhatsApp Queue Runner */}
            <button
              type="button"
              onClick={handleStartQueue}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-900 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>🚀 1-Click WhatsApp Dispatch ({selectedCustomerIds.length})</span>
            </button>

            {/* Batch PDF Downloader */}
            <button
              type="button"
              disabled={isDownloadingPdfs}
              onClick={handleDownloadAllPdfs}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {isDownloadingPdfs ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{pdfProgress || 'Downloading...'}</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>📥 Download All {selectedCustomerIds.length} PDFs</span>
                </>
              )}
            </button>

            {/* Deselect button */}
            <button
              type="button"
              onClick={() => setSelectedCustomerIds([])}
              className="px-3 py-2 text-emerald-100 hover:text-white text-xs font-semibold underline"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Customer Billing Records Table */}
      {filteredBills.length === 0 ? (
        <EmptyState
          icon={<Droplets className="w-10 h-10 text-sky-400" />}
          title={`No customer records for ${monthTitle}`}
          description={search ? "Try searching with a different name or number." : "Deliveries recorded in this month will automatically generate monthly statements here."}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-3.5 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={filteredBills.length > 0 && selectedCustomerIds.length === filteredBills.length}
                          onChange={selectAllCustomers}
                          className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                          title="Select / Deselect All Customers"
                        />
                      </th>
                      <th className="px-5 py-3.5">Customer & Contact</th>
                      <th className="px-4 py-3.5 text-center">Month Bottles</th>
                      <th className="px-4 py-3.5">Month Bill</th>
                      <th className="px-4 py-3.5">Old Due</th>
                      <th className="px-4 py-3.5">Paid in Month</th>
                      <th className="px-4 py-3.5">Net Payable</th>
                      <th className="px-5 py-3.5 text-right">Send Bill / Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {filteredBills.map(bill => (
                      <tr key={bill.customerId} className={`transition-colors ${selectedCustomerIds.includes(bill.customerId) ? 'bg-sky-50/60' : 'hover:bg-sky-50/30'}`}>
                        {/* Row Checkbox */}
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedCustomerIds.includes(bill.customerId)}
                            onChange={() => toggleSelectCustomer(bill.customerId)}
                            className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                          />
                        </td>

                        {/* Customer */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{bill.customerName}</span>
                            {(() => {
                              const cust = customerMap.get(bill.customerId);
                              const days = bill.deliveryDays || cust?.deliveryDays;
                              if (days && days.length > 0 && days.length < 7) {
                                return (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    📅 {days.join(', ')}
                                  </span>
                                );
                              } else if (days && days.length === 7) {
                                return (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    📅 Daily
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{bill.customerPhone}</span>
                          </div>
                          <div className="text-[11px] text-gray-400 truncate max-w-xs">{bill.customerAddress}</div>
                        </td>

                        {/* Bottles count */}
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-sky-100 text-sky-800 rounded-full font-black text-sm">
                            <Droplets className="w-3.5 h-3.5 text-sky-500" />
                            {bill.totalBottles} bottles
                          </span>
                          <div className="text-[10px] text-gray-400 mt-0.5">{bill.deliveries.length} delivery days</div>
                        </td>

                        {/* Month charges */}
                        <td className="px-4 py-4">
                          <div className="font-semibold text-gray-900">{sym}{bill.monthCharges.toLocaleString()}</div>
                          <div className="text-[11px] text-gray-400">@{sym}{bill.pricePerUnit}/bottle</div>
                        </td>

                        {/* Old Balance */}
                        <td className="px-4 py-4 text-gray-600 text-xs">
                          {bill.previousBalance > 0 ? (
                            <span className="text-amber-600 font-medium">+{sym}{bill.previousBalance.toLocaleString()}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Paid in month */}
                        <td className="px-4 py-4 text-emerald-600 font-semibold">
                          {sym}{bill.totalPaidInMonth.toLocaleString()}
                        </td>

                        {/* Net Due */}
                        <td className="px-4 py-4">
                          <span className={`font-black text-base ${bill.netOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {sym}{bill.netOutstanding.toLocaleString()}
                          </span>
                        </td>

                        {/* 1-Click Action Buttons */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* WhatsApp Button */}
                            <button
                              onClick={() => handleSendWhatsApp(bill)}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-sm shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                              title="Send Monthly Bill on WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>

                            {/* PDF Button */}
                            <button
                              onClick={() => handleDownloadPdf(bill)}
                              className="p-1.5 text-gray-600 hover:text-sky-600 hover:bg-sky-50 rounded-xl border border-gray-200 transition-colors"
                              title="Download PDF Bill"
                            >
                              <FileDown className="w-4 h-4" />
                            </button>

                            {/* SMS Button */}
                            <button
                              onClick={() => handleSendSms(bill)}
                              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-gray-200 transition-colors"
                              title="Send SMS"
                            >
                              <Send className="w-4 h-4" />
                            </button>

                            {/* View Breakdown */}
                            <button
                              onClick={() => setSelectedBillForModal(bill)}
                              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                              title="View Deliveries Breakdown"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile Cards View */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            <div className="flex items-center justify-between px-1 py-1">
              <button
                type="button"
                onClick={selectAllCustomers}
                className="text-xs font-bold text-sky-700 underline flex items-center gap-1"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{selectedCustomerIds.length === filteredBills.length ? 'Deselect All' : `Select All (${filteredBills.length} Customers)`}</span>
              </button>
              <span className="text-xs font-semibold text-gray-500">
                {selectedCustomerIds.length} selected
              </span>
            </div>

            {filteredBills.map(bill => (
              <Card key={bill.customerId} className={`p-4 space-y-3 transition-colors ${selectedCustomerIds.includes(bill.customerId) ? 'border-sky-400 bg-sky-50/30' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={selectedCustomerIds.includes(bill.customerId)}
                      onChange={() => toggleSelectCustomer(bill.customerId)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer mt-1"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-base">{bill.customerName}</h3>
                        {(() => {
                          const cust = customerMap.get(bill.customerId);
                          const days = bill.deliveryDays || cust?.deliveryDays;
                          if (days && days.length > 0 && days.length < 7) {
                            return (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                📅 {days.join(', ')}
                              </span>
                            );
                          } else if (days && days.length === 7) {
                            return (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                📅 Daily
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {bill.customerPhone}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-100 text-sky-800 rounded-full font-bold text-xs">
                    <Droplets className="w-3 h-3 text-sky-500" />
                    {bill.totalBottles} bottles
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-xl text-xs">
                  <div>
                    <span className="text-gray-400 block">Month Bill:</span>
                    <span className="font-bold text-gray-900">{sym}{bill.monthCharges.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Paid:</span>
                    <span className="font-bold text-emerald-600">{sym}{bill.totalPaidInMonth.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Net Due:</span>
                    <span className={`font-black ${bill.netOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {sym}{bill.netOutstanding.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleSendWhatsApp(bill)}
                    className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp Bill</span>
                  </button>

                  <button
                    onClick={() => handleDownloadPdf(bill)}
                    className="p-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl"
                    title="Download PDF"
                  >
                    <FileDown className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setSelectedBillForModal(bill)}
                    className="p-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl"
                    title="View Breakdown"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ==================== BILL DETAILS / BREAKDOWN MODAL ==================== */}
      {selectedBillForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-sky-50/50">
              <div>
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-sky-500" />
                  {selectedBillForModal.customerName} - {selectedBillForModal.monthName}
                </h3>
                <p className="text-xs text-gray-500">{selectedBillForModal.customerPhone} • {selectedBillForModal.customerAddress}</p>
              </div>
              <button
                onClick={() => setSelectedBillForModal(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Summary banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-2xl text-xs">
                <div>
                  <span className="text-gray-400 block font-medium">Total Bottles:</span>
                  <span className="text-xl font-black text-sky-600">{selectedBillForModal.totalBottles}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Month Bill:</span>
                  <span className="text-base font-bold text-gray-900">{sym}{selectedBillForModal.monthCharges.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Paid in Month:</span>
                  <span className="text-base font-bold text-emerald-600">{sym}{selectedBillForModal.totalPaidInMonth.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Kul Baqiya (Due):</span>
                  <span className="text-xl font-black text-rose-600">{sym}{selectedBillForModal.netOutstanding.toLocaleString()}</span>
                </div>
              </div>

              {/* Delivery logs table */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Daily Delivery Log ({selectedBillForModal.deliveries.length} entries)
                </h4>
                {selectedBillForModal.deliveries.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">No deliveries recorded in this month.</p>
                ) : (
                  <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-semibold">
                        <tr>
                          <th className="px-3.5 py-2.5">Date</th>
                          <th className="px-3 py-2.5">Water Type</th>
                          <th className="px-3 py-2.5 text-center">Bottles</th>
                          <th className="px-3 py-2.5">Rate</th>
                          <th className="px-3 py-2.5">Total</th>
                          <th className="px-3.5 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {selectedBillForModal.deliveries.map(d => (
                          <tr key={d.id} className="hover:bg-gray-50/50">
                            <td className="px-3.5 py-2.5 font-medium">{d.date}</td>
                            <td className="px-3 py-2.5 text-gray-600">{d.waterType}</td>
                            <td className="px-3 py-2.5 text-center font-bold text-sky-600">{d.quantity}</td>
                            <td className="px-3 py-2.5 text-gray-500">{sym}{d.pricePerUnit}</td>
                            <td className="px-3 py-2.5 font-semibold">{sym}{d.totalPrice}</td>
                            <td className="px-3.5 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                d.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                                d.paymentStatus === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {d.paymentStatus.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-wrap gap-2 justify-between items-center">
              <button
                onClick={() => handleCopyMessage(selectedBillForModal)}
                className="px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-xl flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Message Text</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadPdf(selectedBillForModal)}
                  className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={() => handleSendWhatsApp(selectedBillForModal)}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send on WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1-Click WhatsApp Batch Queue Modal */}
      <Modal
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
        title={`🚀 1-Click WhatsApp Bill Dispatch (${queueIndex + 1} of ${selectedBills.length})`}
        size="md"
      >
        {selectedBills[queueIndex] ? (
          <div className="space-y-4">
            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 font-semibold mb-1">
                <span>Progress: {queueIndex + 1} of {selectedBills.length} Customers</span>
                <span>{Math.round(((queueIndex + 1) / selectedBills.length) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((queueIndex + 1) / selectedBills.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Current Customer Card */}
            <div className="p-4 bg-sky-50/70 border border-sky-100 rounded-2xl space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-base font-bold text-gray-900">
                    {selectedBills[queueIndex].customerName}
                  </h4>
                  <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span>{selectedBills[queueIndex].customerPhone || 'Phone number nahi mila'}</span>
                  </p>
                </div>
                <span className="text-xs font-black px-2.5 py-1 bg-sky-100 text-sky-800 rounded-full">
                  {selectedBills[queueIndex].totalBottles} Bottles
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-sky-200/60 text-xs">
                <div>
                  <span className="text-gray-500 block">Is Mahine Ka Bill:</span>
                  <span className="font-bold text-gray-900">{sym}{selectedBills[queueIndex].monthCharges.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Kul Baqiya (Net Due):</span>
                  <span className="font-black text-rose-600">{sym}{selectedBills[queueIndex].netOutstanding.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Formatted Message Preview */}
            <div>
              <span className="text-xs font-bold text-gray-500 uppercase block mb-1">
                WhatsApp Message Preview:
              </span>
              <pre className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
                {formatWhatsAppBillMessage(selectedBills[queueIndex], settings)}
              </pre>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  const bill = selectedBills[queueIndex];
                  openWhatsAppBill(bill, settings);
                  if (queueIndex + 1 < selectedBills.length) {
                    setQueueIndex(q => q + 1);
                    toast.success(`${bill.customerName} ko send ho gaya! Agla customer load ho gaya.`);
                  } else {
                    toast.success('Mubarak! Tamam selected customers ko WhatsApp bills bhej diye gaye!');
                    setIsQueueModalOpen(false);
                  }
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-black text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>
                  {queueIndex + 1 === selectedBills.length
                    ? 'WhatsApp Bhejo Aur Finish (Last) 🏁'
                    : `WhatsApp Bhejo Aur Agla Customer ➡️ (${queueIndex + 2}/${selectedBills.length})`}
                </span>
              </button>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleCopyMessage(selectedBills[queueIndex]);
                  }}
                  className="px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </button>

                <div className="flex items-center gap-2">
                  {queueIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => setQueueIndex(q => q - 1)}
                      className="px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                    >
                      ⬅️ Pichla
                    </button>
                  )}
                  {queueIndex + 1 < selectedBills.length && (
                    <button
                      type="button"
                      onClick={() => setQueueIndex(q => q + 1)}
                      className="px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-50 rounded-xl"
                    >
                      Skip to Next ➡️
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsQueueModalOpen(false)}
                    className="px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
                  >
                    Band Karein
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">Queue complete!</div>
        )}
      </Modal>
    </div>
  );
}
