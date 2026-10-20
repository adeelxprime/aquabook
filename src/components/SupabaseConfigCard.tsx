import { useState, useEffect } from 'react';
import { Card, Button, FormInput } from './ui';
import { 
  getSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig, 
  isSupabaseConfigured, testSupabaseConnection 
} from '../services/supabaseClient';
import { syncLocalDataToSupabase, pullCloudDataToLocal } from '../services/supabaseService';
import { getAuth } from '../services/adminService';
import { 
  Database, CheckCircle2, AlertTriangle, RefreshCw, 
  Copy, ExternalLink, ShieldCheck, Check, Sparkles, Server, Download
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SupabaseConfigCard() {
  const [config, setConfig] = useState(getSupabaseConfig());
  const [isConfigured, setIsConfigured] = useState(isSupabaseConfigured());
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  useEffect(() => {
    setIsConfigured(isSupabaseConfigured());
  }, [config]);

  const handleSave = () => {
    if (!config.url || !config.anonKey) {
      toast.error('Baraye meharbani URL aur Anon Key dono darj karein.');
      return;
    }
    if (!config.url.startsWith('https://')) {
      toast.error('Supabase URL "https://" se shuru hona chahiye.');
      return;
    }
    saveSupabaseConfig(config.url, config.anonKey);
    setIsConfigured(true);
    toast.success('Supabase credentials save ho gaye! Ab "Test Connection" dabayein.');
  };

  const handleTest = async () => {
    setTesting(true);
    setConnectionStatus(null);
    try {
      const res = await testSupabaseConnection();
      setConnectionStatus({
        tested: true,
        success: res.success,
        message: res.message,
      });
      if (res.success) {
        toast.success('Database connect ho gaya!');
      } else {
        toast.error(res.message);
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    const auth = getAuth();
    if (!auth.businessId) {
      toast.error('Pehle kisi business me login karein ya business dashboard kholein.');
      return;
    }
    const bizId = auth.businessId;
    setSyncing(true);
    try {
      const res = await syncLocalDataToSupabase(bizId);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } finally {
      setSyncing(false);
    }
  };

  const handlePull = async () => {
    const auth = getAuth();
    if (!auth.businessId) {
      toast.error('Pehle kisi business me login karein ya business dashboard kholein.');
      return;
    }
    const bizId = auth.businessId;
    setPulling(true);
    try {
      const res = await pullCloudDataToLocal(bizId);
      if (res.success) {
        toast.success(res.message);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('aquabook_auth_change', { detail: auth }));
        }
      } else {
        toast.error(res.message);
      }
    } finally {
      setPulling(false);
    }
  };

  const handleCopySql = () => {
    const sqlText = `-- Copy and run in Supabase SQL Editor:
-- File is saved locally in: supabase_schema.sql`;
    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    toast.success('SQL schema command copied!');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <Card className="p-5 border-sky-100 bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Supabase PostgreSQL Cloud Database</h2>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                isConfigured 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {isConfigured ? 'CONFIGURED' : 'LOCAL STORAGE MODE'}
              </span>
            </div>
            <p className="text-xs text-sky-200/70 mt-0.5">
              Multi-tenant live cloud database connection & instant synchronization
            </p>
          </div>
        </div>

        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-sky-200 text-xs font-bold rounded-xl border border-white/10 transition-colors w-fit"
        >
          <span>Supabase Dashboard</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Connection Info & Steps */}
      <div className="py-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-sky-200 font-semibold mb-1.5">
              Project URL:
            </label>
            <input
              type="text"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              placeholder="https://your-project-id.supabase.co"
              className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <span className="text-[10px] text-sky-300/60 mt-1 block">
              Found in: Project Settings → API → Project URL
            </span>
          </div>

          <div>
            <label className="block text-sky-200 font-semibold mb-1.5">
              Anon Public API Key:
            </label>
            <input
              type="password"
              value={config.anonKey}
              onChange={(e) => setConfig({ ...config, anonKey: e.target.value })}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <span className="text-[10px] text-sky-300/60 mt-1 block">
              Found in: Project Settings → API → Project API keys (anon public)
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <span>Save Credentials</span>
          </button>

          <button
            onClick={handleTest}
            disabled={testing || !config.url}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Testing...' : 'Test Connection'}</span>
          </button>

          <button
            onClick={handlePull}
            disabled={pulling || !isConfigured}
            className="px-4 py-2 bg-sky-600/30 hover:bg-sky-600/50 disabled:opacity-40 text-sky-200 font-bold text-xs rounded-xl border border-sky-400/30 transition-all flex items-center gap-1.5"
          >
            <Download className={`w-3.5 h-3.5 ${pulling ? 'animate-bounce' : ''}`} />
            <span>{pulling ? 'Downloading...' : 'Pull Cloud Data to Local'}</span>
          </button>

          <button
            onClick={handleSync}
            disabled={syncing || !isConfigured}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-sky-200 font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-1.5"
          >
            <Server className="w-3.5 h-3.5" />
            <span>{syncing ? 'Syncing...' : 'Sync Local Data to Supabase'}</span>
          </button>

          <button
            onClick={() => setShowSqlModal(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs rounded-xl border border-sky-400/20 transition-all flex items-center gap-1.5 ml-auto"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>View SQL Schema Script</span>
          </button>
        </div>

        {/* Connection status result */}
        {connectionStatus && (
          <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
            connectionStatus.success 
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200' 
              : 'bg-rose-500/20 border-rose-500/40 text-rose-200'
          }`}>
            {connectionStatus.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{connectionStatus.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* SQL Script Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs text-gray-900">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-base text-gray-900">Supabase SQL Schema Script</h3>
                <p className="text-xs text-gray-500">Isko Supabase ke SQL Editor me paste karein aur "Run" dabayein</p>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3">
              <div className="p-3 bg-slate-900 text-sky-200 rounded-2xl font-mono text-[11px] leading-relaxed overflow-x-auto">
                <p className="text-emerald-400 font-bold mb-2">-- File saved in your project root as: supabase_schema.sql</p>
                <p className="text-gray-400">-- Tables created:</p>
                <p className="text-white">1. public.businesses (Multi-tenant plants)</p>
                <p className="text-white">2. public.customers (Customers per plant)</p>
                <p className="text-white">3. public.deliveries (Daily bottle khatta)</p>
                <p className="text-white">4. public.payments (Customer receipts)</p>
                <p className="text-white">5. public.settings (Business configuration)</p>
                <p className="text-white">6. public.subscription_payments (Super Admin fees)</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
              >
                Close
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`-- Please open and run supabase_schema.sql from project folder`);
                  toast.success('Schema file location copied!');
                }}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>supabase_schema.sql tayar hai</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
