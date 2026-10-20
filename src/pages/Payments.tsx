import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader, Card, Button, SearchInput, Modal, ConfirmDialog, FormInput, FormSelect, FormTextarea, SearchableSelect, EmptyState } from '../components/ui';
import { CreditCard, Plus, Edit, Trash2, Banknote, Building2, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const methodIcons: Record<string, React.ReactNode> = {
  cash: <Banknote className="w-4 h-4 text-emerald-500" />,
  bank_transfer: <Building2 className="w-4 h-4 text-blue-500" />,
  other: <HelpCircle className="w-4 h-4 text-gray-400" />,
};
const methodLabels: Record<string, string> = { cash: 'Cash', bank_transfer: 'Bank Transfer', other: 'Other' };

export default function Payments() {
  const { customers, payments, addPayment, updatePayment, deletePayment, getCustomerBalance, settings } = useApp();

  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterMethod, setFilterMethod] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({ customerId: '', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), method: 'cash' as 'cash' | 'bank_transfer' | 'other', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedBalance = form.customerId ? getCustomerBalance(form.customerId) : null;

  const filtered = useMemo(() => {
    return payments.filter(p => {
      const matchSearch = !search || p.customerName.toLowerCase().includes(search.toLowerCase());
      const matchMethod = filterMethod === 'all' || p.method === filterMethod;
      const matchStart = !startDate || p.date >= startDate;
      const matchEnd = !endDate || p.date <= endDate;
      return matchSearch && matchMethod && matchStart && matchEnd;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [payments, search, filterMethod, startDate, endDate]);

  const customerOptions = customers.map(c => {
    const bal = getCustomerBalance(c.id);
    return { value: c.id, label: c.name, sublabel: `Outstanding: ${settings.currencySymbol}${bal.outstandingBalance.toLocaleString()}` };
  });

  const fmt = (v: number) => `${settings.currencySymbol}${v.toLocaleString()}`;

  const openModal = (id?: string) => {
    if (id) {
      const p = payments.find(x => x.id === id);
      if (!p) return;
      setEditingId(id);
      setForm({ customerId: p.customerId, amount: p.amount, date: p.date, method: p.method, notes: p.notes });
    } else {
      setEditingId(null);
      setForm({ customerId: '', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), method: 'cash', notes: '' });
    }
    setErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.customerId) e.customerId = 'Select a customer';
    if (form.amount <= 0) e.amount = 'Amount must be > 0';
    if (!form.date) e.date = 'Date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const customer = customers.find(c => c.id === form.customerId);
    const data = { ...form, customerName: customer?.name || 'Unknown' };
    if (editingId) {
      updatePayment(editingId, data);
      toast.success('Payment updated!');
    } else {
      addPayment(data);
      toast.success('Payment recorded!');
    }
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) { deletePayment(deleteId); toast.success('Payment deleted'); setDeleteId(null); }
  };

  const totalAmount = filtered.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <PageHeader title="Payments" subtitle={`${payments.length} total payments`} action={<Button onClick={() => openModal()} icon={<Plus className="w-4 h-4" />}>Add Payment</Button>} />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500 font-medium uppercase">Total Payments</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{filtered.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 font-medium uppercase">Total Amount</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{fmt(totalAmount)}</p>
        </Card>
        <Card className="p-4 hidden md:block">
          <p className="text-xs text-gray-500 font-medium uppercase">Avg Payment</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{filtered.length ? fmt(Math.round(totalAmount / filtered.length)) : fmt(0)}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by customer name..." />
          </div>
          <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20">
            <option value="all">All Methods</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="other">Other</option>
          </select>
          <div className="flex gap-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
          </div>
        </div>
      </Card>

      {/* Payment List */}
      {filtered.length === 0 ? (
        <EmptyState icon={<CreditCard className="w-8 h-8" />} title="No payments found" description={search ? 'Try adjusting your filters.' : 'Record your first payment to get started.'} action={!search ? { label: 'Add Payment', onClick: () => openModal() } : undefined} />
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Notes</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-sm">{format(new Date(p.date), 'MMM d, yyyy')}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{p.customerName}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-emerald-600">{fmt(p.amount)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 text-sm">{methodIcons[p.method]}{methodLabels[p.method]}</div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 max-w-[200px] truncate">{p.notes || '—'}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openModal(p.id)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><Edit className="w-4 h-4 text-gray-500" /></button>
                          <button onClick={() => setDeleteId(p.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4 text-red-400" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Mobile */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filtered.map(p => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{p.customerName}</p>
                    <p className="text-xs text-gray-500">{format(new Date(p.date), 'MMM d, yyyy')}</p>
                  </div>
                  <span className="text-lg font-bold text-emerald-600">{fmt(p.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500">{methodIcons[p.method]}{methodLabels[p.method]}</div>
                  <div className="flex gap-1">
                    <button onClick={() => openModal(p.id)} className="p-2 hover:bg-gray-100 rounded-lg"><Edit className="w-4 h-4 text-gray-500" /></button>
                    <button onClick={() => setDeleteId(p.id)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </div>
                {p.notes && <p className="text-xs text-gray-400 mt-2 border-t border-gray-50 pt-2">{p.notes}</p>}
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Payment' : 'Add Payment'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <SearchableSelect label="Customer" options={customerOptions} value={form.customerId} onChange={(v) => setForm({ ...form, customerId: v })} placeholder="Search and select customer..." required error={errors.customerId} />
          {selectedBalance && (
            <div className={`text-sm p-3 rounded-xl ${selectedBalance.outstandingBalance > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
              Outstanding Balance: <span className="font-semibold">{fmt(selectedBalance.outstandingBalance)}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Amount" type="number" value={form.amount} onChange={(v) => setForm({ ...form, amount: Number(v) })} required min={0} step="0.01" error={errors.amount} placeholder="0" />
            <FormInput label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} required error={errors.date} />
          </div>
          <FormSelect label="Payment Method" value={form.method} onChange={(v) => setForm({ ...form, method: v as any })} options={[{ value: 'cash', label: 'Cash' }, { value: 'bank_transfer', label: 'Bank Transfer' }, { value: 'other', label: 'Other' }]} />
          <FormTextarea label="Notes (Optional)" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Payment notes..." />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingId ? 'Update Payment' : 'Record Payment'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Payment" message="Are you sure you want to delete this payment? This cannot be undone." confirmText="Delete" variant="danger" />
    </div>
  );
}
