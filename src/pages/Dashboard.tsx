import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { StatCard, Card, Button, StatusBadge, EmptyState } from '../components/ui';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getDeliveryChartData, getRecentDeliveries, getRecentCustomers } from '../services/dataService';
import { 
  Users, Truck, DollarSign, AlertCircle, TrendingUp, Plus, 
  CreditCard, List, Droplets, RefreshCw, Check, X, Clock, 
  Bike, Sparkles, ExternalLink 
} from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const { stats, settings, deliveries, customers, deliveryBoys, truckSupplies, syncFromCloud, isSyncing } = useApp();

  const chartData = useMemo(() => getDeliveryChartData(7), [deliveries]);
  const recentDeliveries = useMemo(() => getRecentDeliveries(6), [deliveries]);
  const recentCustomers = useMemo(() => getRecentCustomers(5), [customers]);

  const fmt = (v: number) => `${settings.currencySymbol}${v.toLocaleString()}`;

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome back! Live water delivery & fleet monitor.</p>
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

      {/* Live Route Delivery Status Bar (Owner Live Monitor) */}
      <Card className="p-4 bg-gradient-to-r from-sky-950 via-slate-900 to-blue-950 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                Owner Live Route Monitor
              </h3>
            </div>
            <p className="text-xs text-sky-200/80">
              Real-time delivery progress across all delivery boys and bulk truck trips
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/quick-delivery')}
              className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <span>Live Delivery Register</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate('/delivery-boys')}
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Riders ({deliveryBoys.length})</span>
            </button>
          </div>
        </div>

        {/* 4 Live Monitor Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
              <Check className="w-3 h-3 stroke-[3]" /> Delivered (Tick Mark)
            </span>
            <p className="text-xl font-black text-white mt-0.5">
              {stats.todayDeliveries} <span className="text-xs font-normal text-emerald-200">stops</span>
            </p>
            <span className="text-[11px] text-emerald-300 font-semibold block mt-0.5">
              {stats.todayBottlesDelivered} Bottles Delivered
            </span>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] font-bold text-rose-400 uppercase flex items-center gap-1">
              <X className="w-3 h-3 stroke-[3]" /> Pani Nahi Gya (Cross)
            </span>
            <p className="text-xl font-black text-white mt-0.5">
              {stats.todaySkippedDeliveries || 0} <span className="text-xs font-normal text-rose-200">stops</span>
            </p>
            <span className="text-[11px] text-rose-300 font-semibold block mt-0.5">
              Skipped / Missed today
            </span>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Extra Bottles (🍾)
            </span>
            <p className="text-xl font-black text-white mt-0.5">
              +{stats.todayExtraBottles || 0} <span className="text-xs font-normal text-amber-200">bottles</span>
            </p>
            <span className="text-[11px] text-amber-300 font-semibold block mt-0.5">
              On-demand extra orders
            </span>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] font-bold text-sky-400 uppercase flex items-center gap-1">
              <Truck className="w-3 h-3" /> Truck / Tanker Trips
            </span>
            <p className="text-xl font-black text-white mt-0.5">
              {stats.todayTruckTrips || 0} <span className="text-xs font-normal text-sky-200">dispatches</span>
            </p>
            <span className="text-[11px] text-sky-300 font-semibold block mt-0.5">
              Bulk tanker & container
            </span>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-5">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Quick Operations</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Button onClick={() => navigate('/quick-delivery')} icon={<Truck className="w-4 h-4" />}>
            Route Register
          </Button>
          <Button onClick={() => navigate('/delivery-boys')} variant="secondary" icon={<Bike className="w-4 h-4 text-sky-600" />}>
            Delivery Boys
          </Button>
          <Button onClick={() => navigate('/truck-supply')} variant="secondary" icon={<Truck className="w-4 h-4 text-indigo-600" />}>
            Truck / Bulk
          </Button>
          <Button onClick={() => navigate('/monthly-bills')} variant="secondary" icon={<Droplets className="w-4 h-4 text-sky-600" />}>
            WhatsApp Bills
          </Button>
          <Button onClick={() => navigate('/customers')} variant="secondary" icon={<Plus className="w-4 h-4" />}>
            Add Customer
          </Button>
          <Button onClick={() => navigate('/payments')} variant="secondary" icon={<CreditCard className="w-4 h-4 text-emerald-600" />}>
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent Deliveries</h3>
            <button onClick={() => navigate('/deliveries')} className="text-xs font-bold text-sky-600 hover:text-sky-700">
              View All
            </button>
          </div>
          {recentDeliveries.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {recentDeliveries.map((d) => {
                const isSkipped = d.status === 'skipped';
                return (
                  <div key={d.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 text-sm">{d.customerName}</p>
                        {isSkipped ? (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-0.5">
                            <X className="w-2.5 h-2.5 stroke-[3]" /> Pani Nahi Gya
                          </span>
                        ) : (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5 stroke-[3]" /> Delivered
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {format(new Date(d.date), 'MMM d, yyyy')} at {d.time}
                        {d.deliveryBoyName ? ` • 🛵 ${d.deliveryBoyName}` : ''}
                      </p>
                      {isSkipped && d.skipReason ? (
                        <p className="text-[11px] text-rose-600 font-semibold mt-0.5">
                          Wajah: {d.skipReason}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      {!isSkipped && (
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-900 block">{fmt(d.totalPrice)}</span>
                          <span className="text-[11px] text-gray-400 font-medium">
                            {d.quantity} Jars {d.extraBottles ? `(+${d.extraBottles} Extra)` : ''}
                          </span>
                        </div>
                      )}
                      <StatusBadge status={d.paymentStatus} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={<Truck className="w-8 h-8" />} title="No deliveries yet" description="Record your first delivery to see it here." />
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent Customers</h3>
            <button onClick={() => navigate('/customers')} className="text-xs font-bold text-sky-600 hover:text-sky-700">
              View All
            </button>
          </div>
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
                      <p className="text-xs text-gray-500">{c.phone}{c.area ? ` • ${c.area}` : ''}</p>
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
