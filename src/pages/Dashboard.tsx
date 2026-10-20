import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { StatCard, Card, Button, StatusBadge, EmptyState } from '../components/ui';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getDeliveryChartData, getRecentDeliveries, getRecentCustomers } from '../services/dataService';
import { Users, Truck, DollarSign, AlertCircle, TrendingUp, Plus, CreditCard, List, Droplets, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const { stats, settings, deliveries, customers, syncFromCloud, isSyncing } = useApp();

  const chartData = useMemo(() => getDeliveryChartData(7), [deliveries]);
  const recentDeliveries = useMemo(() => getRecentDeliveries(5), [deliveries]);
  const recentCustomers = useMemo(() => getRecentCustomers(5), [customers]);

  const fmt = (v: number) => `${settings.currencySymbol}${v.toLocaleString()}`;

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome back! Here's your business overview.</p>
        </div>
        <Button 
          variant="secondary" 
          onClick={() => syncFromCloud(true)} 
          disabled={isSyncing}
          icon={<RefreshCw className={`w-4 h-4 text-sky-600 ${isSyncing ? 'animate-spin' : ''}`} />}
        >
          {isSyncing ? 'Syncing...' : 'Sync Cloud Data'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard label="Total Customers" value={stats.totalCustomers} icon={<Users className="w-5 h-5" />} color="sky" />
        <StatCard label="Today's Deliveries" value={stats.todayDeliveries} icon={<Truck className="w-5 h-5" />} color="emerald" />
        <StatCard label="Today's Bottles" value={stats.todayBottlesDelivered || 0} icon={<Droplets className="w-5 h-5" />} color="sky" />
        <StatCard label="Today's Revenue" value={fmt(stats.todayRevenue)} icon={<TrendingUp className="w-5 h-5" />} color="amber" />
        <StatCard label="Pending Payments" value={stats.pendingPayments} icon={<AlertCircle className="w-5 h-5" />} color="red" />
        <StatCard label="Total Outstanding" value={fmt(stats.totalOutstanding)} icon={<DollarSign className="w-5 h-5" />} color="violet" />
      </div>

      {/* Quick Actions */}
      <Card className="p-5">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Quick Actions (VodaBook Khatta)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button onClick={() => navigate('/quick-delivery')} icon={<Truck className="w-4 h-4" />}>
            Today Route Khatta
          </Button>
          <Button onClick={() => navigate('/monthly-bills')} variant="secondary" icon={<Droplets className="w-4 h-4" />}>
            Monthly WhatsApp Bills
          </Button>
          <Button onClick={() => navigate('/customers')} variant="secondary" icon={<Plus className="w-4 h-4" />}>
            Add Customer
          </Button>
          <Button onClick={() => navigate('/payments')} variant="secondary" icon={<CreditCard className="w-4 h-4" />}>
            Add Payment
          </Button>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Deliveries (Last 7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorDel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => format(new Date(v), 'MMM d')} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip labelFormatter={(v) => format(new Date(v as string), 'MMM d, yyyy')} />
                <Area type="monotone" dataKey="deliveries" stroke="#0EA5E9" strokeWidth={2} fill="url(#colorDel)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Revenue (Last 7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => format(new Date(v), 'MMM d')} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${settings.currencySymbol}${v}`} />
                <Tooltip formatter={(value: any) => fmt(Number(value))} labelFormatter={(v) => format(new Date(v as string), 'MMM d, yyyy')} />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Recent Deliveries</h3>
          {recentDeliveries.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {recentDeliveries.map((d) => (
                <div key={d.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{d.customerName}</p>
                    <p className="text-xs text-gray-500">{format(new Date(d.date), 'MMM d, yyyy')} • {d.quantity} × {d.waterType}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">{fmt(d.totalPrice)}</span>
                    <StatusBadge status={d.paymentStatus} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Truck className="w-8 h-8" />} title="No deliveries yet" description="Record your first delivery to see it here." />
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Recent Customers</h3>
          {recentCustomers.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {recentCustomers.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg" onClick={() => navigate(`/customers/${c.id}`)}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-sky-50 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-sky-600">{c.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.phone}</p>
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Users className="w-8 h-8" />} title="No customers yet" description="Add your first customer to get started." />
          )}
        </Card>
      </div>
    </div>
  );
}
