import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Lock, ShieldAlert, Phone, Mail, LogOut, ArrowRight, RefreshCw } from 'lucide-react';
import { getAuth, getBusinessById, logout } from '../services/adminService';

export default function SubscriptionExpired() {
  const navigate = useNavigate();
  const auth = getAuth();
  const business = auth.businessId ? getBusinessById(auth.businessId) : null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isSuspended = business ? business.isActive === false : false;
  const isExpired = business ? business.subscription.status === 'expired' : false;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-gray-200/80 shadow-2xl p-8 sm:p-10 text-center">
        {/* Warning Icon Badge */}
        <div className="w-20 h-20 bg-rose-50 border border-rose-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-rose-500 shadow-inner">
          <Lock className="w-10 h-10" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100/70 text-rose-700 text-xs font-bold rounded-full mb-3 uppercase tracking-wider">
          <ShieldAlert className="w-3.5 h-3.5" />
          {isSuspended ? 'Account Access Suspended (OFF)' : 'Subscription Expired'}
        </div>

        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          {business?.businessName || 'Business Portal Locked'}
        </h1>

        <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto leading-relaxed">
          {isSuspended ? (
            <>
              Aapka business portal super administrator ki taraf se <strong>turn OFF</strong> kar diya gaya hai. Access dobara chalu karwane ke liye admin se rabta karein.
            </>
          ) : (
            <>
              Aapki AquaBook subscription ki muddat khatam ho chuki hai. Dobara services use karne ke liye apna subscription plan renew karwayen.
            </>
          )}
        </p>

        {/* Subscription Info Card */}
        {business && (
          <div className="mt-6 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-left text-xs space-y-2">
            <div className="flex justify-between py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-medium">Business Account:</span>
              <span className="font-bold text-gray-900">{business.businessName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-medium">Plan:</span>
              <span className="font-semibold text-gray-800 uppercase">{business.subscription.plan}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-medium">Expiry Date:</span>
              <span className="font-semibold text-rose-600">{business.subscription.endDate}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500 font-medium">Access Status:</span>
              <span className="font-bold text-rose-600 uppercase">
                {business.isActive ? 'EXPIRED' : 'BLOCKED / SUSPENDED (OFF)'}
              </span>
            </div>
          </div>
        )}

        {/* Contact Admin Box */}
        <div className="mt-6 p-4 bg-sky-50/70 border border-sky-100 rounded-2xl text-xs text-sky-900 flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold">Contact Administrator</p>
              <p className="text-sky-700 text-[11px]">Renew subscription to restore instant access</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/login')}
            className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Another Account</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex-1 py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
