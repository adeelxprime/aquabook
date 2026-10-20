import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplets, Eye, EyeOff } from 'lucide-react';
import { loginAdmin } from '../../services/adminService';
import toast from 'react-hot-toast';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const success = loginAdmin(username, password);
      if (success) {
        toast.success('Welcome, Admin!');
        navigate('/admin');
      } else {
        setError('Invalid username or password');
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-500/25">
            <Droplets className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">AquaBook</h1>
          <p className="text-slate-400 text-sm mt-1">Super Admin Panel</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" autoFocus
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40 transition-all pr-10" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-medium rounded-xl hover:from-sky-600 hover:to-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Sign In'}
          </button>
          <div className="text-center">
            <button type="button" onClick={() => navigate('/login')} className="text-sm text-slate-400 hover:text-sky-400 transition-colors">
              Business Owner Login →
            </button>
          </div>
        </form>

        <p className="text-center text-slate-600 text-xs mt-6">Default: admin / admin123</p>
      </div>
    </div>
  );
}
