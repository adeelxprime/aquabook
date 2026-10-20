import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Users, CheckCircle2, XCircle, AlertTriangle, 
  DollarSign, Plus, Search, LogOut, ArrowRight, RefreshCw, 
  Trash2, Edit, Calendar, Lock, Phone, Mail, ShieldAlert,
  Receipt, ArrowUpRight, Check, X
} from 'lucide-react';
import { 
  getBusinesses, getAdminDashboardStats, toggleBusinessActive, 
  renewSubscription, deleteBusiness, addBusiness, updateBusiness,
  getSubPayments, loginAsBusiness, logout, checkAndUpdateSubscription,
  syncBusinessesFromSupabase
} from '../../services/adminService';
import type { Business, SubscriptionPayment } from '../../types/admin';
import SupabaseConfigCard from '../../components/SupabaseConfigCard';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const navigate = useNavigate();

  // State
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'inactive'>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isPaymentsModalOpen, setIsPaymentsModalOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  // Form states
  const [businessForm, setBusinessForm] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    username: '',
    password: '',
    plan: 'monthly' as 'monthly' | 'yearly' | 'trial',
    amount: 1500,
    days: 30,
  });

  const [subForm, setSubForm] = useState({
    plan: 'monthly' as 'monthly' | 'yearly' | 'trial',
    days: 30,
    amount: 1500,
    status: 'active' as 'active' | 'inactive' | 'expired',
    notes: '',
  });

  // Reload data
  const loadData = () => {
    // refresh all expiration checks
    const list = getBusinesses();
    list.forEach(b => checkAndUpdateSubscription(b.id));
    setBusinesses(getBusinesses());
    setPayments(getSubPayments());
  };

  useEffect(() => {
    loadData();
    syncBusinessesFromSupabase().then(() => loadData()).catch(() => {});
  }, []);

  const stats = useMemo(() => getAdminDashboardStats(), [businesses, payments]);

  // Filtered businesses
  const filteredBusinesses = useMemo(() => {
    return businesses.filter(b => {
      const matchSearch = 
        b.businessName.toLowerCase().includes(search.toLowerCase()) ||
        b.ownerName.toLowerCase().includes(search.toLowerCase()) ||
        b.username.toLowerCase().includes(search.toLowerCase()) ||
        b.phone.includes(search);

      let matchStatus = true;
      if (statusFilter === 'active') {
        matchStatus = b.isActive && b.subscription.status === 'active';
      } else if (statusFilter === 'expired') {
        matchStatus = b.subscription.status === 'expired';
      } else if (statusFilter === 'inactive') {
        matchStatus = !b.isActive || b.subscription.status === 'inactive';
      }

      return matchSearch && matchStatus;
    });
  }, [businesses, search, statusFilter]);

  // Actions
  const handleToggleActive = (id: string, name: string) => {
    const updated = toggleBusinessActive(id);
    if (updated) {
      if (updated.isActive) {
        toast.success(`"${name}" is now ALLOWED (ON)!`);
      } else {
        toast.error(`"${name}" is now BLOCKED (OFF)!`);
      }
      loadData();
    }
  };

  const handleOpenAdd = () => {
    setBusinessForm({
      businessName: '',
      ownerName: '',
      email: '',
      phone: '',
      address: '',
      username: '',
      password: '',
      plan: 'monthly',
      amount: 1500,
      days: 30,
    });
    setIsAddModalOpen(true);
  };

  const handleCreateBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = businessForm.username.trim();
    const cleanPass = businessForm.password.trim();
    const cleanName = businessForm.businessName.trim();

    if (!cleanName || !cleanUser || !cleanPass) {
      toast.error('Please fill required fields (Name, Username, Password)');
      return;
    }

    const durationDays = Math.max(1, Number(businessForm.days) || 30);
    const today = new Date();
    const end = new Date(today);
    end.setDate(today.getDate() + durationDays);

    addBusiness({
      businessName: cleanName,
      ownerName: businessForm.ownerName.trim(),
      email: businessForm.email.trim(),
      phone: businessForm.phone.trim(),
      address: businessForm.address.trim(),
      username: cleanUser,
      password: cleanPass,
      isActive: true,
      subscription: {
        plan: businessForm.plan,
        startDate: today.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        status: 'active',
        amount: Number(businessForm.amount) || 0,
      },
    });

    toast.success('Business created with active subscription!');
    setIsAddModalOpen(false);
    loadData();
  };

  const handleOpenEdit = (b: Business) => {
    setSelectedBusiness(b);
    setBusinessForm({
      businessName: b.businessName,
      ownerName: b.ownerName,
      email: b.email,
      phone: b.phone,
      address: b.address,
      username: b.username,
      password: b.password,
      plan: b.subscription.plan,
      amount: b.subscription.amount,
      days: 30,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness) return;

    updateBusiness(selectedBusiness.id, {
      businessName: businessForm.businessName,
      ownerName: businessForm.ownerName,
      email: businessForm.email,
      phone: businessForm.phone,
      address: businessForm.address,
      username: businessForm.username,
      password: businessForm.password,
    });

    toast.success('Business info updated!');
    setIsEditModalOpen(false);
    loadData();
  };

  const handleOpenSubModal = (b: Business) => {
    setSelectedBusiness(b);
    setSubForm({
      plan: b.subscription.plan,
      days: b.subscription.plan === 'yearly' ? 365 : 30,
      amount: b.subscription.plan === 'yearly' ? 15000 : 1500,
      status: b.subscription.status,
      notes: `Renewal by Admin`,
    });
    setIsSubModalOpen(true);
  };

  const handleRenewSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness) return;

    renewSubscription(
      selectedBusiness.id,
      subForm.plan,
      subForm.days,
      subForm.amount,
      subForm.notes
    );

    toast.success(`Subscription activated for ${selectedBusiness.businessName}!`);
    setIsSubModalOpen(false);
    loadData();
  };

  const handleDeleteBusiness = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? All customer and delivery data will be erased.`)) {
      deleteBusiness(id);
      toast.success('Business deleted.');
      loadData();
    }
  };

  const handleLoginAs = (b: Business) => {
    loginAsBusiness(b.id);
    toast.success(`Logged in as "${b.businessName}"`);
    navigate('/');
  };

  const handleAdminLogout = () => {
    logout();
    toast.success('Admin signed out');
    navigate('/admin/login');
  };

  // Helper for days remaining
  const getDaysRemaining = (endDateStr: string) => {
    const end = new Date(endDateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center font-black text-white shadow-md shadow-sky-500/20">
            A
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base">AquaBook</span>
              <span className="text-[10px] font-semibold bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/30">
                SUPER ADMIN
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Multi-Tenant Business & Subscription Manager</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsPaymentsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
          >
            <Receipt className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Subscription Payments</span>
            <span className="text-[10px] bg-slate-700 px-1.5 py-0.2 rounded-full">{payments.length}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Business</span>
          </button>

          <button
            onClick={handleAdminLogout}
            title="Sign out"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* KPI Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Total Businesses</span>
              <Building2 className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalBusinesses}</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Active (ON)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400">{stats.activeBusinesses}</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Blocked (OFF)</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-bold text-rose-400">{stats.inactiveBusinesses}</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Expired</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-amber-400">{stats.expiredBusinesses}</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Total Revenue</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-white">Rs. {stats.totalRevenue.toLocaleString()}</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">This Month</span>
              <Receipt className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-xl font-bold text-sky-400">Rs. {stats.thisMonthRevenue.toLocaleString()}</p>
          </div>
        </div>

        {/* Supabase Cloud Connection Panel */}
        <SupabaseConfigCard />

        {/* Filter and Search Bar */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business name, owner, username, phone..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-700 overflow-x-auto">
            {(['all', 'active', 'expired', 'inactive'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap ${
                  statusFilter === tab
                    ? 'bg-sky-500 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'inactive' ? 'Blocked / OFF' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Businesses List Table */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-400" />
              <h2 className="font-semibold text-white text-base">Client Water Businesses ({filteredBusinesses.length})</h2>
            </div>
            <button
              onClick={loadData}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 p-1 hover:bg-slate-700 rounded"
              title="Refresh status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {filteredBusinesses.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-base font-medium text-slate-300">No businesses found</p>
              <p className="text-xs text-slate-500 mt-1">Try adjusting your search or add a new business.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-700/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="px-5 py-3.5">Business & Owner</th>
                    <th className="px-4 py-3.5">Login Credentials</th>
                    <th className="px-4 py-3.5">Plan & Expiry</th>
                    <th className="px-4 py-3.5 text-center">Allow Access (ON/OFF)</th>
                    <th className="px-4 py-3.5">Subscription Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filteredBusinesses.map(b => {
                    const daysLeft = getDaysRemaining(b.subscription.endDate);
                    const isAllowed = b.isActive;

                    return (
                      <tr key={b.id} className="hover:bg-slate-750/50 transition-colors">
                        {/* Business & Owner */}
                        <td className="px-5 py-4">
                          <div className="font-bold text-white text-sm">{b.businessName}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{b.ownerName}</span>
                            <span>•</span>
                            <span>{b.phone}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{b.address}</div>
                        </td>

                        {/* Credentials */}
                        <td className="px-4 py-4">
                          <div className="text-xs">
                            <span className="text-slate-400">User: </span>
                            <span className="font-mono text-sky-400 bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-800/40">
                              {b.username}
                            </span>
                          </div>
                          <div className="text-xs mt-1">
                            <span className="text-slate-400">Pass: </span>
                            <span className="font-mono text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                              {b.password}
                            </span>
                          </div>
                        </td>

                        {/* Plan & Expiry */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-white uppercase text-xs">
                              {b.subscription.plan}
                            </span>
                            <span className="text-slate-400 text-xs">· Rs. {b.subscription.amount}</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>Until {b.subscription.endDate}</span>
                          </div>
                          <div className="text-[11px] mt-0.5">
                            {daysLeft > 0 ? (
                              <span className="text-emerald-400 font-medium">{daysLeft} days remaining</span>
                            ) : daysLeft === 0 ? (
                              <span className="text-amber-400 font-medium">Expires today</span>
                            ) : (
                              <span className="text-rose-400 font-medium">Expired {Math.abs(daysLeft)} days ago</span>
                            )}
                          </div>
                        </td>

                        {/* MASTER ON/OFF SWITCH */}
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleToggleActive(b.id, b.businessName)}
                            className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                              isAllowed ? 'bg-emerald-500' : 'bg-rose-600'
                            }`}
                            title={isAllowed ? 'Click to Turn OFF (Suspend Access)' : 'Click to Turn ON (Allow Access)'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                                isAllowed ? 'translate-x-7' : 'translate-x-0'
                              }`}
                            >
                              {isAllowed ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-rose-600 stroke-[3]" />
                              )}
                            </span>
                          </button>
                          <div className="text-[10px] font-bold mt-1 uppercase tracking-wider">
                            {isAllowed ? (
                              <span className="text-emerald-400">ALLOWED (ON)</span>
                            ) : (
                              <span className="text-rose-400">BLOCKED (OFF)</span>
                            )}
                          </div>
                        </td>

                        {/* Subscription Status Badge */}
                        <td className="px-4 py-4">
                          {b.subscription.status === 'active' && isAllowed && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Active
                            </span>
                          )}
                          {b.subscription.status === 'expired' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Expired
                            </span>
                          )}
                          {(!isAllowed || b.subscription.status === 'inactive') && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300 border border-slate-600">
                              <XCircle className="w-3.5 h-3.5" />
                              Suspended
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Renew/Subscription */}
                            <button
                              onClick={() => handleOpenSubModal(b)}
                              className="px-2.5 py-1.5 text-xs font-medium bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 border border-sky-500/30 rounded-lg transition-colors flex items-center gap-1"
                              title="Renew or Change Subscription"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Renew</span>
                            </button>

                            {/* View / Login as business */}
                            <button
                              onClick={() => handleLoginAs(b)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                              title="Open client dashboard as this business"
                            >
                              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleOpenEdit(b)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                              title="Edit business details"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteBusiness(b.id, b.businessName)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                              title="Delete business"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ==================== ADD BUSINESS MODAL ==================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-sky-400" />
                Add New Client Business
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBusiness} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Business Name *</label>
                  <input
                    type="text"
                    required
                    value={businessForm.businessName}
                    onChange={(e) => setBusinessForm({ ...businessForm, businessName: e.target.value })}
                    placeholder="e.g. Al-Madina Water Co."
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Owner Name</label>
                  <input
                    type="text"
                    value={businessForm.ownerName}
                    onChange={(e) => setBusinessForm({ ...businessForm, ownerName: e.target.value })}
                    placeholder="e.g. Tariq Khan"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={businessForm.phone}
                    onChange={(e) => setBusinessForm({ ...businessForm, phone: e.target.value })}
                    placeholder="+91 98765 00000"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={businessForm.email}
                    onChange={(e) => setBusinessForm({ ...businessForm, email: e.target.value })}
                    placeholder="owner@example.com"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Address</label>
                <input
                  type="text"
                  value={businessForm.address}
                  onChange={(e) => setBusinessForm({ ...businessForm, address: e.target.value })}
                  placeholder="Business street or office address"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </div>

              {/* Credentials */}
              <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-700 space-y-3">
                <p className="text-xs font-bold text-sky-400 uppercase tracking-wider">Business Login Credentials</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      value={businessForm.username}
                      onChange={(e) => setBusinessForm({ ...businessForm, username: e.target.value })}
                      placeholder="e.g. almadinawater"
                      className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Password *</label>
                    <input
                      type="text"
                      required
                      value={businessForm.password}
                      onChange={(e) => setBusinessForm({ ...businessForm, password: e.target.value })}
                      placeholder="e.g. secret123"
                      className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Initial Subscription */}
              <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-700 space-y-3">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Initial Subscription Setup</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Plan</label>
                    <select
                      value={businessForm.plan}
                      onChange={(e) => {
                        const p = e.target.value as any;
                        setBusinessForm({
                          ...businessForm,
                          plan: p,
                          days: p === 'yearly' ? 365 : p === 'trial' ? 7 : 30,
                          amount: p === 'yearly' ? 15000 : p === 'trial' ? 0 : 1500,
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                    >
                      <option value="monthly">Monthly (30 Days)</option>
                      <option value="yearly">Yearly (365 Days)</option>
                      <option value="trial">Free Trial (7 Days)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Duration (Days)</label>
                    <input
                      type="number"
                      value={businessForm.days}
                      onChange={(e) => setBusinessForm({ ...businessForm, days: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Amount Paid (Rs.)</label>
                    <input
                      type="number"
                      value={businessForm.amount}
                      onChange={(e) => setBusinessForm({ ...businessForm, amount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-700/50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-xl shadow-md shadow-sky-500/20"
                >
                  Save & Activate Business
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== EDIT BUSINESS MODAL ==================== */}
      {isEditModalOpen && selectedBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-sky-400" />
                Edit Business Details
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBusiness} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={businessForm.businessName}
                  onChange={(e) => setBusinessForm({ ...businessForm, businessName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Owner Name</label>
                  <input
                    type="text"
                    value={businessForm.ownerName}
                    onChange={(e) => setBusinessForm({ ...businessForm, ownerName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Phone</label>
                  <input
                    type="text"
                    value={businessForm.phone}
                    onChange={(e) => setBusinessForm({ ...businessForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Address</label>
                <input
                  type="text"
                  value={businessForm.address}
                  onChange={(e) => setBusinessForm({ ...businessForm, address: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-900 rounded-xl border border-slate-700">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Login Username</label>
                  <input
                    type="text"
                    value={businessForm.username}
                    onChange={(e) => setBusinessForm({ ...businessForm, username: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Login Password</label>
                  <input
                    type="text"
                    value={businessForm.password}
                    onChange={(e) => setBusinessForm({ ...businessForm, password: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-700/50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-xl"
                >
                  Update Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== RENEW / EXTEND SUBSCRIPTION MODAL ==================== */}
      {isSubModalOpen && selectedBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-emerald-400" />
                  Renew Subscription
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedBusiness.businessName}</p>
              </div>
              <button onClick={() => setIsSubModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRenewSubscription} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Select Plan</label>
                <select
                  value={subForm.plan}
                  onChange={(e) => {
                    const p = e.target.value as any;
                    setSubForm({
                      ...subForm,
                      plan: p,
                      days: p === 'yearly' ? 365 : p === 'trial' ? 7 : 30,
                      amount: p === 'yearly' ? 15000 : p === 'trial' ? 0 : 1500,
                    });
                  }}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white"
                >
                  <option value="monthly">Monthly Subscription (30 Days)</option>
                  <option value="yearly">Yearly Subscription (365 Days)</option>
                  <option value="trial">Trial Access (7 Days)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Extension (Days)</label>
                  <input
                    type="number"
                    value={subForm.days}
                    onChange={(e) => setSubForm({ ...subForm, days: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Amount Collected (Rs.)</label>
                  <input
                    type="number"
                    value={subForm.amount}
                    onChange={(e) => setSubForm({ ...subForm, amount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Payment Notes</label>
                <input
                  type="text"
                  value={subForm.notes}
                  onChange={(e) => setSubForm({ ...subForm, notes: e.target.value })}
                  placeholder="e.g. Paid via GooglePay / Cash"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white"
                />
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>This will set the status to <strong>ACTIVE (ALLOWED)</strong> starting today for {subForm.days} days and record the payment log.</p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-700/50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-md shadow-emerald-500/20"
                >
                  Confirm & Activate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== SUBSCRIPTION PAYMENTS LOG MODAL ==================== */}
      {isPaymentsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">Subscription Payments Received ({payments.length})</h3>
              </div>
              <button onClick={() => setIsPaymentsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {payments.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Receipt className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                  <p>No subscription payment records yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-[11px] font-semibold uppercase text-slate-400">
                        <th className="py-2.5">Date</th>
                        <th className="py-2.5">Business</th>
                        <th className="py-2.5">Plan</th>
                        <th className="py-2.5">Coverage Period</th>
                        <th className="py-2.5">Amount</th>
                        <th className="py-2.5">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60">
                      {payments.map(p => (
                        <tr key={p.id} className="hover:bg-slate-750/30">
                          <td className="py-3 text-xs text-slate-300">{p.date}</td>
                          <td className="py-3 font-medium text-white">{p.businessName}</td>
                          <td className="py-3 text-xs uppercase text-sky-400 font-semibold">{p.plan}</td>
                          <td className="py-3 text-xs text-slate-400">{p.startDate} → {p.endDate}</td>
                          <td className="py-3 font-bold text-emerald-400">Rs. {p.amount.toLocaleString()}</td>
                          <td className="py-3 text-xs text-slate-400">{p.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-700 flex justify-between items-center text-xs text-slate-400">
              <span>Total Revenue: <strong className="text-emerald-400 text-sm">Rs. {stats.totalRevenue.toLocaleString()}</strong></span>
              <button
                onClick={() => setIsPaymentsModalOpen(false)}
                className="px-4 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
