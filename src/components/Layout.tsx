import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Truck, CreditCard, BarChart3, 
  Settings, Menu, X, Droplets, ChevronLeft, LogOut, ShieldCheck, 
  Sparkles, Calendar, MessageSquare, Smartphone, RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getAuth, getBusinessById, logout } from '../services/adminService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import PWAInstallBanner from './PWAInstallBanner';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/quick-delivery', icon: Truck, label: "Today's Delivery Route" },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/deliveries', icon: Calendar, label: 'All Deliveries' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
  { to: '/monthly-bills', icon: MessageSquare, label: 'Monthly Bills (WhatsApp)' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { settings, syncFromCloud, isSyncing } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const auth = getAuth();
  const business = auth.businessId ? getBusinessById(auth.businessId) : null;
  const isSuperAdmin = auth.userType === 'admin';

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  // Remaining days calculation
  const getDaysRemaining = (endDateStr?: string) => {
    if (!endDateStr) return null;
    const end = new Date(endDateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysLeft = business ? getDaysRemaining(business.subscription.endDate) : null;

  return (
    <div className="flex h-screen bg-gray-50/80 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-100 transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${collapsed ? 'w-[72px]' : 'w-64'}`}>
        {/* Logo & Brand */}
        <div className={`flex items-center gap-3 h-16 border-b border-gray-100 flex-shrink-0 ${collapsed ? 'px-4 justify-center' : 'px-5'}`}>
          <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-sky-500/20">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <span className="text-base font-bold text-gray-900 block truncate">
                {business?.businessName || settings.businessName || 'AquaBook'}
              </span>
              <span className="text-[10px] text-gray-400 block truncate">Water Management</span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Subscription Info Badge in Sidebar */}
        {!collapsed && business && (
          <div className="mx-3 mt-3 p-2.5 bg-sky-50/70 border border-sky-100 rounded-xl text-xs">
            <div className="flex items-center justify-between font-semibold text-sky-900 mb-1">
              <span className="capitalize">{business.subscription.plan} Plan</span>
              <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                ACTIVE
              </span>
            </div>
            {daysLeft !== null && (
              <p className="text-[11px] text-sky-700">
                {daysLeft > 0 ? `${daysLeft} days remaining` : 'Expires today'}
              </p>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => {
                const active = item.to === '/' ? location.pathname === '/' : isActive;
                return `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active 
                    ? 'bg-sky-50 text-sky-700 font-semibold shadow-sm shadow-sky-100' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } ${collapsed ? 'justify-center' : ''}`;
              }}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Super admin quick switch indicator */}
        {!collapsed && isSuperAdmin && (
          <div className="px-3 pb-2">
            <Link
              to="/admin"
              className="flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>Back to Admin Panel</span>
            </Link>
          </div>
        )}

        {/* Footer / Logout */}
        <div className="p-3 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-2 rounded-xl transition-colors w-full ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Sign Out"
          >
            <LogOut className="w-4 h-4 text-gray-400 group-hover:text-rose-600" />
            {!collapsed && <span>Sign Out</span>}
          </button>

          <button 
            onClick={() => setCollapsed(!collapsed)} 
            className="hidden lg:flex p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors ml-1"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg">
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-sm font-bold text-gray-800">
                {business?.businessName || settings.businessName || 'AquaBook'}
              </h2>
              {business?.ownerName && (
                <p className="text-[11px] text-gray-400">Owner: {business.ownerName}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* 1-Click Cloud Sync Button */}
            <button
              onClick={() => syncFromCloud(true)}
              disabled={isSyncing}
              title={isSupabaseConfigured() ? 'Supabase cloud se data sync karein' : 'Supabase connect nahi hai'}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold rounded-xl border border-sky-200/80 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-600 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
            </button>

            {/* Subscription active badge */}
            {business && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-xs font-semibold text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Subscription Active</span>
                {daysLeft !== null && (
                  <span className="text-[11px] text-emerald-600 font-normal">({daysLeft}d left)</span>
                )}
              </div>
            )}

            {isSuperAdmin && (
              <Link
                to="/admin"
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-sky-400 text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin View</span>
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-rose-600 bg-gray-50 hover:bg-rose-50 border border-gray-200/80 px-3 py-1.5 rounded-xl transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content View */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* PWA Mobile Add to Screen Banner */}
        <PWAInstallBanner />

        {/* Mobile Bottom Navigation Bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30">
          <div className="flex justify-around items-center h-16 px-2">
            {navItems.slice(0, 5).map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => {
                  const active = item.to === '/' ? location.pathname === '/' : isActive;
                  return `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                    active ? 'text-sky-600 font-bold' : 'text-gray-400'
                  }`;
                }}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
