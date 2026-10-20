import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

// ==================== Modal ====================
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;
  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizeClass} max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

// ==================== Confirm Dialog ====================
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', variant = 'danger' }: ConfirmDialogProps) {
  if (!isOpen) return null;
  const btnClass = variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-sky-500 hover:bg-sky-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${btnClass}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

// ==================== Loading Spinner ====================
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];
  return (
    <div className="flex items-center justify-center p-8">
      <div className={`${sizeClass} border-3 border-gray-200 border-t-sky-500 rounded-full animate-spin`} />
    </div>
  );
}

// ==================== Empty State ====================
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-500 text-sm text-center max-w-sm mb-4">{description}</p>
      {action && (
        <button onClick={action.onClick} className="px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 transition-colors">
          {action.label}
        </button>
      )}
    </div>
  );
}

// ==================== Status Badge ====================
interface StatusBadgeProps {
  status: 'paid' | 'partial' | 'unpaid' | 'active' | 'inactive';
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = {
    paid: { bg: 'bg-emerald-50 text-emerald-700', label: 'Paid' },
    partial: { bg: 'bg-amber-50 text-amber-700', label: 'Partial' },
    unpaid: { bg: 'bg-red-50 text-red-700', label: 'Unpaid' },
    active: { bg: 'bg-emerald-50 text-emerald-700', label: 'Active' },
    inactive: { bg: 'bg-gray-100 text-gray-600', label: 'Inactive' },
  }[status];
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return <span className={`inline-flex items-center font-medium rounded-full ${config.bg} ${sizeClass}`}>{config.label}</span>;
}

// ==================== Search Input ====================
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2">
          <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
        </button>
      )}
    </div>
  );
}

// ==================== Searchable Select ====================
interface SearchableSelectProps {
  options: { value: string; label: string; sublabel?: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
}

export function SearchableSelect({ options, value, onChange, placeholder = 'Select...', label, required, error }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    (o.sublabel?.toLowerCase().includes(search.toLowerCase()))
  );

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); setTimeout(() => inputRef.current?.focus(), 50); }}
        className={`w-full px-3 py-2.5 text-left bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all ${error ? 'border-red-300' : 'border-gray-200'}`}
      >
        {selected ? <span className="text-gray-900">{selected.label}</span> : <span className="text-gray-400">{placeholder}</span>}
      </button>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">No results found</div>
            ) : (
              filtered.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setIsOpen(false); setSearch(''); }}
                  className={`w-full text-left px-3 py-2.5 text-sm hover:bg-sky-50 transition-colors ${value === o.value ? 'bg-sky-50 text-sky-700' : 'text-gray-700'}`}
                >
                  <div className="font-medium">{o.label}</div>
                  {o.sublabel && <div className="text-xs text-gray-400">{o.sublabel}</div>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== Card ====================
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

// ==================== Page Header ====================
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ==================== Stat Card ====================
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: string;
}

export function StatCard({ label, value, icon, color = 'sky' }: StatCardProps) {
  const colorMap: Record<string, string> = {
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color] || colorMap.sky}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

// ==================== Form Input ====================
interface FormInputProps {
  label: string;
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  min?: number;
  step?: string;
}

export function FormInput({ label, type = 'text', value, onChange, placeholder, required, error, disabled, min, step }: FormInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        step={step}
        className={`w-full px-3 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all disabled:bg-gray-50 disabled:text-gray-400 ${error ? 'border-red-300' : 'border-gray-200'}`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ==================== Form Select ====================
interface FormSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: string;
}

export function FormSelect({ label, value, onChange, options, required, error }: FormSelectProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all ${error ? 'border-red-300' : 'border-gray-200'}`}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ==================== Form Textarea ====================
interface FormTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function FormTextarea({ label, value, onChange, placeholder, rows = 3 }: FormTextareaProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all resize-none"
      />
    </div>
  );
}

// ==================== Button ====================
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function Button({ children, onClick, type = 'button', variant = 'primary', size = 'md', disabled, loading, icon, className = '' }: ButtonProps) {
  const variantClass = {
    primary: 'bg-sky-500 text-white hover:bg-sky-600 shadow-sm',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
    ghost: 'text-gray-600 hover:bg-gray-100',
  }[variant];
  const sizeClass = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  }[size];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variantClass} ${sizeClass} ${className}`}
    >
      {loading ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : icon}
      {children}
    </button>
  );
}

// ==================== Tabs ====================
interface TabsProps {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onChange: (tab: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {tab.label}
          {tab.count !== undefined && <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>}
        </button>
      ))}
    </div>
  );
}
