import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader, Card, Button, SearchInput, EmptyState } from '../components/ui';
import { 
  getAllCustomersMonthlyBills, openWhatsAppBill, openSmsBill, 
  generateMonthlyBillPdf, getCustomerMonthlyBill, formatWhatsAppBillMessage 
} from '../services/dataService';
import type { CustomerMonthlyBill } from '../types';
import { 
  Calendar, FileDown, MessageSquare, Phone, Send, 
  ChevronLeft, ChevronRight, Eye, Droplets, CheckCircle2, 
  AlertCircle, X, Copy, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MonthlyBills() {
  const { customers, deliveries, payments, settings } = useApp();

  // Current month default in YYYY-MM
  const currentMonthDefault = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthDefault);
  const [search, setSearch] = useState('');
  const [selectedBillForModal, setSelectedBillForModal] = useState<CustomerMonthlyBill | null>(null);

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

  // Filtered bills
  const filteredBills = useMemo(() => {
    if (!search.trim()) return bills;
    const q = search.toLowerCase();
    return bills.filter(b => 
      b.customerName.toLowerCase().includes(q) ||
      b.customerPhone.includes(q) ||
      b.customerAddress.toLowerCase().includes(q)
    );
  }, [bills, search]);

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
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">Select Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>
      </Card>

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
                      <tr key={bill.customerId} className="hover:bg-sky-50/30 transition-colors">
                        {/* Customer */}
                        <td className="px-5 py-4">
                          <div className="font-bold text-gray-900">{bill.customerName}</div>
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
            {filteredBills.map(bill => (
              <Card key={bill.customerId} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{bill.customerName}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-gray-400" />
                      {bill.customerPhone}
                    </p>
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
    </div>
  );
}
