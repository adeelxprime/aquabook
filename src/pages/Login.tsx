import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplets, Eye, EyeOff, ArrowRight, AlertTriangle, Building2, Bike, ShieldCheck } from 'lucide-react';
import { loginBusiness, loginDeliveryBoy, syncBusinessesFromSupabase } from '../services/adminService';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const [loginRole, setLoginRole] = useState<'owner' | 'delivery_boy'>('owner');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [secretClicks, setSecretClicks] = useState(0);

  useEffect(() => {
    syncBusinessesFromSupabase().catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username/mobile and password.');
      return;
    }

    setLoading(true);
    try {
      if (loginRole === 'delivery_boy') {
        const result = loginDeliveryBoy(username, password);
        if (result.success) {
          toast.success(`Welcome Rider ${result.deliveryBoy?.name || 'Rider'}! Route shuru karein 🚴`);
          navigate('/quick-delivery');
        } else {
          setErrorMsg(result.message);
        }
      } else {
        const result = await loginBusiness(username, password);
        if (result.success) {
          toast.success(`Welcome back, ${result.business?.businessName || 'Owner'}!`);
          navigate('/');
        } else {
          setErrorMsg(result.message);
        }
      }
    } catch {
      setErrorMsg('Login error occurred. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSecretAdminClick = () => {
    const next = secretClicks + 1;
    if (next >= 3) {
      setSecretClicks(0);
      navigate('/admin/login');
    } else {
      setSecretClicks(next);
      setTimeout(() => setSecretClicks(0), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* App Logo & Branding */}
        <div className="text-center mb-6">
          <div 
            onClick={handleSecretAdminClick}
            title="AquaBook"
            className="w-16 h-16 bg-gradient-to-tr from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-sky-500/20 cursor-pointer select-none active:scale-95 transition-transform"
          >
            <Droplets className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">AquaBook</h1>
          <p className="text-gray-500 text-sm mt-1">Water Supply & Route Management Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-sky-950/5 p-6 sm:p-8">
          {/* Role Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-gray-100/80 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => { setLoginRole('owner'); setErrorMsg(''); }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                loginRole === 'owner'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-4 h-4 text-sky-500" />
              <span>Plant Owner</span>
            </button>

            <button
              type="button"
              onClick={() => { setLoginRole('delivery_boy'); setErrorMsg(''); }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                loginRole === 'delivery_boy'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Bike className="w-4 h-4 text-emerald-500" />
              <span>Delivery Boy (Rider)</span>
            </button>
          </div>

          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900">
              {loginRole === 'delivery_boy' ? 'Rider / Delivery Boy Login' : 'Plant Owner Sign In'}
            </h2>
            <p className="text-gray-500 text-xs mt-1">
              {loginRole === 'delivery_boy'
                ? 'Apna mobile number ya username aur password/PIN enter karein'
                : 'Manage your customers, riders, routes & payments'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Access Notice</p>
                <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                {loginRole === 'delivery_boy' ? 'Rider Mobile Number / Username' : 'Business Username'}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={loginRole === 'delivery_boy' ? 'e.g. 03001234567 or ali_rider' : 'Enter business username'}
                className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                {loginRole === 'delivery_boy' ? 'Password / 4-Digit PIN' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={loginRole === 'delivery_boy' ? '•••• or 1234' : '••••••••'}
                  className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-2 py-3 text-white font-medium text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                loginRole === 'delivery_boy'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-sky-500/20'
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{loginRole === 'delivery_boy' ? 'Start Delivery Route 🚴' : 'Sign In as Owner'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
