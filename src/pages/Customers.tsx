import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader, Card, Button, SearchInput, Modal, ConfirmDialog, FormInput, FormSelect, FormTextarea, StatusBadge, EmptyState } from '../components/ui';
import { Users, Plus, Edit, Trash2, Eye, Phone, MapPin, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { getDeliveriesByCustomer } from '../services/dataService';
import toast from 'react-hot-toast';

export default function Customers() {
  const navigate = useNavigate();
  const { 
    customers, addCustomer, updateCustomer, deleteCustomer, 
    getCustomerBalance, settings, syncFromCloud, isSyncing 
  } = useApp();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sort, setSort] = useState('newest');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '', phone: '', address: '', area: '', waterType: 'Regular',
    quantity: 1, pricePerUnit: settings.defaultWaterPrice,
    status: 'active' as 'active' | 'inactive', notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    let list = customers.filter(c => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.toLowerCase().includes(search.toLowerCase()) || c.address.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'all' || c.status === filter;
      return matchSearch && matchFilter;
    });

    list.sort((a, b) => {
      switch (sort) {
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'name_desc': return b.name.localeCompare(a.name);
        case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'balance': return getCustomerBalance(b.id).outstandingBalance - getCustomerBalance(a.id).outstandingBalance;
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return list;
  }, [customers, search, filter, sort, getCustomerBalance]);

  const fmt = (v: number) => `${settings.currencySymbol}${v.toLocaleString()}`;

  const openAdd = () => {
    setEditingCustomer(null);
    setForm({ name: '', phone: '', address: '', area: '', waterType: 'Regular', quantity: 1, pricePerUnit: settings.defaultWaterPrice, status: 'active', notes: '' });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (id: string) => {
    const c = customers.find(x => x.id === id);
    if (!c) return;
    setEditingCustomer(id);
    setForm({ name: c.name, phone: c.phone, address: c.address, area: c.area || '', waterType: c.waterType, quantity: c.quantity, pricePerUnit: c.pricePerUnit, status: c.status, notes: c.notes });
    setErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    if (!form.address.trim()) e.address = 'Address is required';
    if (form.quantity <= 0) e.quantity = 'Must be > 0';
    if (form.pricePerUnit < 0) e.pricePerUnit = 'Cannot be negative';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (editingCustomer) {
      updateCustomer(editingCustomer, form);
      toast.success('Customer updated!');
    } else {
      addCustomer(form);
      toast.success('Customer added!');
    }
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteCustomer(deleteId);
      toast.success('Customer deleted');
      setDeleteId(null);
    }
  };

  const getLastDelivery = (customerId: string) => {
    const dels = getDeliveriesByCustomer(customerId);
    if (dels.length === 0) return null;
    return dels.sort((a, b) => b.date.localeCompare(a.date))[0];
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} total customers`}
        action={
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              onClick={() => syncFromCloud(true)} 
              disabled={isSyncing}
              icon={<RefreshCw className={`w-4 h-4 text-sky-600 ${isSyncing ? 'animate-spin' : ''}`} />}
            >
              {isSyncing ? 'Syncing...' : 'Sync Cloud'}
            </Button>
            <Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>Add Customer</Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, phone, address..." className="flex-1" />
        <div className="flex gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
            <option value="balance">Balance ↓</option>
          </select>
        </div>
      </div>

      {/* Customer List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-6 shadow-xs">
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-900 text-base">Koi customer nahi mila</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-5">
            Agar aapne Supabase cloud par data upload kiya hua hai to neechay "Cloud Se Load Karein" dabayein, ya naya customer shamil karein.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button 
              variant="secondary" 
              onClick={() => syncFromCloud(true)} 
              disabled={isSyncing} 
              icon={<RefreshCw className={`w-4 h-4 text-sky-600 ${isSyncing ? 'animate-spin' : ''}`} />}
            >
              {isSyncing ? 'Loading from Cloud...' : 'Cloud Se Load Karein (Sync)'}
            </Button>
            <Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>
              Naya Customer Banayein
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Water</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Balance</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Last Delivery</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(c => {
                      const balance = getCustomerBalance(c.id);
                      const lastDel = getLastDelivery(c.id);
                      return (
                        <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-sky-50 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-bold text-sky-600">{c.name.charAt(0).toUpperCase()}</span>
                              </div>
                              <span className="font-medium text-gray-900">{c.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-sm text-gray-600">{c.phone}</div>
                            <div className="text-xs text-gray-400 truncate max-w-[200px]">{c.address}</div>
                          </td>
                          <td className="px-5 py-4 text-sm">
                            <div>{c.quantity} × {c.waterType}</div>
                            <div className="text-xs text-gray-400">@ {fmt(c.pricePerUnit)}</div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-sm font-semibold ${balance.outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                              {fmt(balance.outstandingBalance)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-500">
                            {lastDel ? format(new Date(lastDel.date), 'MMM d, yyyy') : '—'}
                          </td>
                          <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => navigate(`/customers/${c.id}`)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                              <button onClick={() => openEdit(c.id)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Edit"><Edit className="w-4 h-4 text-gray-500" /></button>
                              <button onClick={() => setDeleteId(c.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4 text-red-400" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {filtered.map(c => {
              const balance = getCustomerBalance(c.id);
              const lastDel = getLastDelivery(c.id);
              return (
                <Card key={c.id} className="p-4" onClick={() => navigate(`/customers/${c.id}`)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-sky-50 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-sky-600">{c.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{c.name}</p>
                        <StatusBadge status={c.status} size="sm" />
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${balance.outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {fmt(balance.outstandingBalance)}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-500">
                    <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{c.phone}</div>
                    <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /><span className="truncate">{c.address}</span></div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                    <span className="text-xs text-gray-400">{c.quantity} × {c.waterType} @ {fmt(c.pricePerUnit)}</span>
                    <span className="text-xs text-gray-400">{lastDel ? format(new Date(lastDel.date), 'MMM d') : 'No deliveries'}</span>
                  </div>
                  <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="secondary" onClick={() => openEdit(c.id)} icon={<Edit className="w-3.5 h-3.5" />} className="flex-1">Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteId(c.id)} icon={<Trash2 className="w-3.5 h-3.5" />} className="flex-1">Delete</Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCustomer ? 'Edit Customer' : 'Add Customer'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required error={errors.name} placeholder="Customer name" />
            <FormInput label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required error={errors.phone} placeholder="Phone number" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} required error={errors.address} placeholder="Street or house address" />
            <FormInput label="Area / Route" value={form.area} onChange={(v) => setForm({ ...form, area: v })} placeholder="e.g. Sector 14, Main Market, Block B" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput label="Water Type" value={form.waterType} onChange={(v) => setForm({ ...form, waterType: v })} placeholder="e.g. Regular, RO" />
            <FormInput label="Default Quantity" type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: Number(v) })} min={1} error={errors.quantity} />
            <FormInput label="Price per Unit" type="number" value={form.pricePerUnit} onChange={(v) => setForm({ ...form, pricePerUnit: Number(v) })} min={0} step="0.01" error={errors.pricePerUnit} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v as 'active' | 'inactive' })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
            <div />
          </div>
          <FormTextarea label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Any additional notes..." />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingCustomer ? 'Update Customer' : 'Add Customer'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Customer" message="This will permanently delete this customer and all their delivery and payment records. This cannot be undone." confirmText="Delete Customer" variant="danger" />
    </div>
  );
}
