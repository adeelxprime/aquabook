import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader, Card, FormInput, FormSelect, FormTextarea, Button, ConfirmDialog } from '../components/ui';
import { Building2, Globe, Bell, Database, Download, Upload, Trash2, ShieldCheck, Calendar, Clock, Smartphone, PlusSquare, Share2 } from 'lucide-react';
import { getAuth, getBusinessById } from '../services/adminService';
import toast from 'react-hot-toast';

const currencyMap: Record<string, string> = { 
  PKR: 'Rs.', 
  USD: '$', 
  AED: 'د.إ', 
  SAR: '﷼', 
  EUR: '€', 
  GBP: '£', 
  INR: '₹' 
};

export default function SettingsPage() {
  const { settings, updateSettings, refreshAll } = useApp();
  const auth = getAuth();
  const business = auth.businessId ? getBusinessById(auth.businessId) : null;

  const [biz, setBiz] = useState({ businessName: settings.businessName, businessPhone: settings.businessPhone, businessAddress: settings.businessAddress });
  const [defaults, setDefaults] = useState({ defaultWaterPrice: settings.defaultWaterPrice, currency: settings.currency });
  const [prefs, setPrefs] = useState({ notificationsEnabled: settings.notificationsEnabled, theme: settings.theme });
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const saveBiz = () => { updateSettings(biz); toast.success('Business info saved!'); };
  const saveDefaults = () => {
    updateSettings({ ...defaults, currencySymbol: currencyMap[defaults.currency] || defaults.currency });
    toast.success('Defaults saved!');
  };
  const savePrefs = () => { updateSettings(prefs); toast.success('Preferences saved!'); };

  const exportData = () => {
    const data: Record<string, unknown> = {};
    const scope = auth.businessId ? `_${auth.businessId}` : '';
    [`aquabook_customers${scope}`, `aquabook_deliveries${scope}`, `aquabook_payments${scope}`, `aquabook_settings${scope}`].forEach(key => {
      const val = localStorage.getItem(key);
      if (val) data[key] = JSON.parse(val);
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `aquabook-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Data exported!');
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          Object.entries(data).forEach(([key, value]) => {
            localStorage.setItem(key, JSON.stringify(value));
          });
          refreshAll();
          toast.success('Data imported successfully!');
        } catch {
          toast.error('Invalid file format');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const clearAllData = () => {
    const scope = auth.businessId ? `_${auth.businessId}` : '';
    [`aquabook_customers${scope}`, `aquabook_deliveries${scope}`, `aquabook_payments${scope}`].forEach(key => localStorage.removeItem(key));
    refreshAll();
    toast.success('All data cleared!');
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0 max-w-3xl">
      <PageHeader title="Settings" subtitle="Manage your business configuration & subscription" />

      {/* Subscription Card */}
      {business && (
        <Card className="p-5 border-sky-100 bg-gradient-to-r from-sky-50/50 via-white to-blue-50/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center text-white shadow-sm">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Current Subscription</h3>
                <p className="text-xs text-gray-500">Plan and validity details</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full uppercase tracking-wider">
              {business.subscription.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-white rounded-xl border border-sky-100 text-xs">
            <div>
              <span className="text-gray-400 block font-medium">Plan Package:</span>
              <span className="text-gray-900 font-bold uppercase text-sm">{business.subscription.plan}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Valid Until:</span>
              <span className="text-emerald-700 font-bold text-sm flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {business.subscription.endDate}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Access Control:</span>
              <span className="text-gray-900 font-bold">
                {business.isActive ? 'Active & Allowed (ON)' : 'Suspended (OFF)'}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 text-right">To extend or change plan, contact super admin.</p>
        </Card>
      )}

      {/* Business Information */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-sky-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Business Information</h3>
        </div>
        <div className="space-y-4">
          <FormInput label="Business Name" value={biz.businessName} onChange={(v) => setBiz({ ...biz, businessName: v })} placeholder="Your business name" />
          <FormInput label="Phone Number" value={biz.businessPhone} onChange={(v) => setBiz({ ...biz, businessPhone: v })} placeholder="Business phone" />
          <FormTextarea label="Address" value={biz.businessAddress} onChange={(v) => setBiz({ ...biz, businessAddress: v })} placeholder="Business address" />
          <div className="flex justify-end">
            <Button onClick={saveBiz}>Save Business Info</Button>
          </div>
        </div>
      </Card>

      {/* Defaults */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
            <Globe className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Defaults</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Default Water Price" type="number" value={defaults.defaultWaterPrice} onChange={(v) => setDefaults({ ...defaults, defaultWaterPrice: Number(v) })} min={0} step="0.01" />
            <FormSelect label="Currency" value={defaults.currency} onChange={(v) => setDefaults({ ...defaults, currency: v })} options={[
              { value: 'PKR', label: 'PKR (Rs. - Pakistani Rupee)' },
              { value: 'USD', label: 'USD ($)' },
              { value: 'AED', label: 'AED (د.إ - UAE Dirham)' },
              { value: 'SAR', label: 'SAR (﷼ - Saudi Riyal)' },
              { value: 'EUR', label: 'EUR (€)' },
              { value: 'GBP', label: 'GBP (£)' },
              { value: 'INR', label: 'INR (₹)' },
            ]} />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveDefaults}>Save Defaults</Button>
          </div>
        </div>
      </Card>

      {/* Mobile Screen App (PWA) Card */}
      <Card className="p-5 border-sky-100 bg-gradient-to-br from-sky-50/50 via-white to-blue-50/30">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 bg-sky-500 text-white rounded-xl flex items-center justify-center font-bold shadow-xs">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              Mobile Screen Par Add Karein (Install App)
              <span className="text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">PWA</span>
            </h3>
            <p className="text-xs text-gray-500">Android ya iPhone par Play Store jesi app install karein</p>
          </div>
        </div>

        <div className="bg-white/80 rounded-2xl p-4 border border-sky-100 space-y-3 text-xs">
          <p className="text-gray-700">
            AquaBook ko apne mobile phone ki home screen par add karne ke baad aap <strong>bina browser khole 1-tap me delivery khatta</strong> chala sakte hain:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="p-3 bg-sky-50/80 rounded-xl border border-sky-100">
              <span className="font-bold text-sky-900 block mb-1">🤖 Android (Chrome):</span>
              <p className="text-gray-600 text-[11px]">
                Chrome ke <strong>3 Dots (Menu)</strong> dabayein aur <strong>"Install App"</strong> ya <strong>"Add to Home screen"</strong> par click karein.
              </p>
            </div>
            <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100">
              <span className="font-bold text-blue-900 block mb-1">🍏 iPhone (Safari):</span>
              <p className="text-gray-600 text-[11px]">
                Neeche <strong>Share (⬆️)</strong> button dabayein aur <strong>"Add to Home Screen" (➕)</strong> select karein.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
            <Bell className="w-4 h-4 text-amber-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Preferences</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">Notifications</p>
              <p className="text-xs text-gray-500">Show toast notifications for actions</p>
            </div>
            <button
              onClick={() => setPrefs({ ...prefs, notificationsEnabled: !prefs.notificationsEnabled })}
              className={`relative w-11 h-6 rounded-full transition-colors ${prefs.notificationsEnabled ? 'bg-sky-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${prefs.notificationsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <FormSelect label="Theme" value={prefs.theme} onChange={(v) => setPrefs({ ...prefs, theme: v as 'light' | 'dark' })} options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark (Coming Soon)' },
          ]} />
          <div className="flex justify-end">
            <Button onClick={savePrefs}>Save Preferences</Button>
          </div>
        </div>
      </Card>

      {/* Data Management */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
            <Database className="w-4 h-4 text-red-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Data Management</h3>
        </div>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="secondary" onClick={exportData} icon={<Download className="w-4 h-4" />} className="flex-1">Export Business Data</Button>
            <Button variant="secondary" onClick={importData} icon={<Upload className="w-4 h-4" />} className="flex-1">Import Data</Button>
          </div>
          <Button variant="danger" onClick={() => setShowClearConfirm(true)} icon={<Trash2 className="w-4 h-4" />} className="w-full">Clear Business Records</Button>
          <p className="text-xs text-gray-400 text-center">Warning: Clearing data will permanently delete all customers, deliveries, and payments for this business account.</p>
        </div>
      </Card>

      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={clearAllData}
        title="Clear Business Records"
        message="This will permanently delete this business's customers, deliveries, and payment records. Subscription will remain intact."
        confirmText="Clear Records"
        variant="danger"
      />
    </div>
  );
}
