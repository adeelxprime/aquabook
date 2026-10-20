import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader, Card, StatCard, Button, EmptyState } from '../components/ui';
import { getSalesReport, getCustomerWiseSales } from '../services/dataService';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileDown, FileSpreadsheet, BarChart3, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

export default function Reports() {
  const { settings } = useApp();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sortCol, setSortCol] = useState<string>('totalRevenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fmt = (v: number) => `${settings.currencySymbol}${v.toLocaleString()}`;

  const report = useMemo(() => getSalesReport(period, { start: startDate, end: endDate }), [period, startDate, endDate]);
  const customerSales = useMemo(() => {
    const data = getCustomerWiseSales();
    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortCol] ?? 0;
      const bVal = (b as any)[sortCol] ?? 0;
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [sortCol, sortDir]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const exportCSV = () => {
    const headers = ['Customer', 'Deliveries', 'Quantity', 'Revenue', 'Paid', 'Outstanding'];
    const rows = customerSales.map(c => [c.customerName, c.totalDeliveries, c.totalQuantity, c.totalRevenue, c.totalPaid, c.outstanding]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `aquabook-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('CSV exported!');
  };

  const exportPDF = () => {
    const PDFConstructor: any = typeof jsPDF === 'function' ? jsPDF : (jsPDF as any)?.jsPDF || (jsPDF as any)?.default;
    const doc = new PDFConstructor();
    doc.setFontSize(18);
    doc.text(settings.businessName + ' - Sales Report', 14, 22);
    doc.setFontSize(10);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 30);
    doc.text(`Total Deliveries: ${report.totalDeliveries} | Revenue: ${fmt(report.totalRevenue)} | Collected: ${fmt(report.totalCollected)} | Outstanding: ${fmt(report.outstanding)}`, 14, 37);

    autoTable(doc, {
      startY: 45,
      head: [['Customer', 'Deliveries', 'Qty', 'Revenue', 'Paid', 'Outstanding']],
      body: customerSales.map(c => [c.customerName, c.totalDeliveries, c.totalQuantity, fmt(c.totalRevenue), fmt(c.totalPaid), fmt(c.outstanding)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [14, 165, 233] },
    });

    const fileName = `aquabook-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
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
    toast.success('PDF exported!');
  };

  const sortArrow = (col: string) => sortCol === col ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '';

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <PageHeader
        title="Reports"
        subtitle="Business analytics and insights"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportCSV} icon={<FileSpreadsheet className="w-4 h-4" />} size="sm">CSV</Button>
            <Button variant="secondary" onClick={exportPDF} icon={<FileDown className="w-4 h-4" />} size="sm">PDF</Button>
          </div>
        }
      />

      {/* Period & Date Range */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {(['daily', 'weekly', 'monthly'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all capitalize ${period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{p}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-1 sm:justify-end">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Deliveries" value={report.totalDeliveries} icon={<BarChart3 className="w-5 h-5" />} color="sky" />
        <StatCard label="Total Revenue" value={fmt(report.totalRevenue)} icon={<TrendingUp className="w-5 h-5" />} color="emerald" />
        <StatCard label="Total Collected" value={fmt(report.totalCollected)} icon={<DollarSign className="w-5 h-5" />} color="amber" />
        <StatCard label="Outstanding" value={fmt(report.outstanding)} icon={<AlertCircle className="w-5 h-5" />} color="red" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Deliveries by {period === 'daily' ? 'Day' : period === 'weekly' ? 'Week' : 'Month'}</h3>
          {report.data.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} tickFormatter={(v) => { try { return period === 'monthly' ? v : format(new Date(v), 'MMM d'); } catch { return v; }}} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="deliveries" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={<BarChart3 className="w-8 h-8" />} title="No data" description="No deliveries in this period." />
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Revenue by {period === 'daily' ? 'Day' : period === 'weekly' ? 'Week' : 'Month'}</h3>
          {report.data.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={report.data}>
                  <defs>
                    <linearGradient id="colorRevReport" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} tickFormatter={(v) => { try { return period === 'monthly' ? v : format(new Date(v), 'MMM d'); } catch { return v; }}} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${settings.currencySymbol}${v}`} />
                  <Tooltip formatter={(value: any) => fmt(Number(value))} />
                  <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} fill="url(#colorRevReport)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={<TrendingUp className="w-8 h-8" />} title="No data" description="No revenue data in this period." />
          )}
        </Card>
      </div>

      {/* Customer-wise Sales */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Customer-wise Sales</h3>
        {customerSales.length === 0 ? (
          <EmptyState icon={<BarChart3 className="w-8 h-8" />} title="No data" description="No customer sales data yet." />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700" onClick={() => handleSort('totalDeliveries')}>Deliveries{sortArrow('totalDeliveries')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700" onClick={() => handleSort('totalQuantity')}>Quantity{sortArrow('totalQuantity')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700" onClick={() => handleSort('totalRevenue')}>Revenue{sortArrow('totalRevenue')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700" onClick={() => handleSort('totalPaid')}>Paid{sortArrow('totalPaid')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700" onClick={() => handleSort('outstanding')}>Outstanding{sortArrow('outstanding')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {customerSales.map(c => (
                    <tr key={c.customerId} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.customerName}</td>
                      <td className="px-4 py-3 text-sm">{c.totalDeliveries}</td>
                      <td className="px-4 py-3 text-sm">{c.totalQuantity}</td>
                      <td className="px-4 py-3 text-sm font-medium">{fmt(c.totalRevenue)}</td>
                      <td className="px-4 py-3 text-sm text-emerald-600">{fmt(c.totalPaid)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-medium ${c.outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(c.outstanding)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {customerSales.map(c => (
                <div key={c.customerId} className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900 text-sm">{c.customerName}</span>
                    <span className={`text-sm font-bold ${c.outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(c.outstanding)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-gray-400">Deliveries</span><p className="font-medium">{c.totalDeliveries}</p></div>
                    <div><span className="text-gray-400">Revenue</span><p className="font-medium">{fmt(c.totalRevenue)}</p></div>
                    <div><span className="text-gray-400">Paid</span><p className="font-medium text-emerald-600">{fmt(c.totalPaid)}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
