import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader, Card, Button, SearchInput, Modal, ConfirmDialog, FormInput, FormSelect, FormTextarea, SearchableSelect, StatusBadge, EmptyState } from '../components/ui';
import { Truck, Plus, Edit, Trash2, Calendar, MessageSquare, Phone, Users, CheckSquare, Square, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { openWhatsAppDeliverySlip, openSmsDeliverySlip, getCustomerBalance } from '../services/dataService';
import toast from 'react-hot-toast';

export default function Deliveries() {
  const { customers, deliveries, addDelivery, updateDelivery, deleteDelivery, settings } = useApp();

  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    customerId: '', date: format(new Date(), 'yyyy-MM-dd'), time: format(new Date(), 'HH:mm'),
    quantity: 1, emptyBottlesReceived: 1, waterType: 'Regular', pricePerUnit: settings.defaultWaterPrice,
    totalPrice: settings.defaultWaterPrice, paymentStatus: 'paid' as 'paid' | 'partial' | 'unpaid',
    paidAmount: settings.defaultWaterPrice, notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Multi-Customer Bulk Delivery Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkAreaFilter, setBulkAreaFilter] = useState('all');
  const [bulkDate, setBulkDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bulkTime, setBulkTime] = useState(format(new Date(), 'HH:mm'));
  const [bulkQtyMode, setBulkQtyMode] = useState<'default' | 'custom'>('default');
  const [bulkCustomQty, setBulkCustomQty] = useState(1);
  const [bulkPaymentStatus, setBulkPaymentStatus] = useState<'paid' | 'unpaid'>('unpaid');

  const areas = useMemo(() => {
    const set = new Set<string>();
    customers.forEach(c => {
      if (c.area) set.add(c.area);
    });
    return Array.from(set);
  }, [customers]);

  const bulkFilteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (c.status !== 'active') return false;
      const matchSearch = 
        !bulkSearch || 
        c.name.toLowerCase().includes(bulkSearch.toLowerCase()) || 
        c.phone.includes(bulkSearch) || 
        (c.area && c.area.toLowerCase().includes(bulkSearch.toLowerCase()));
      const matchArea = bulkAreaFilter === 'all' || c.area === bulkAreaFilter;
      return matchSearch && matchArea;
    });
  }, [customers, bulkSearch, bulkAreaFilter]);

  const toggleBulkCustomer = (id: string) => {
    setBulkSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllBulkFiltered = () => {
    const filteredIds = bulkFilteredCustomers.map(c => c.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => bulkSelectedIds.includes(id));
    if (allSelected) {
      setBulkSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setBulkSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const bulkSummary = useMemo(() => {
    let bottles = 0;
    let totalAmt = 0;
    bulkSelectedIds.forEach(id => {
      const c = customers.find(x => x.id === id);
      if (!c) return;
      const qty = bulkQtyMode === 'custom' ? Math.max(1, bulkCustomQty) : (c.quantity || 1);
      const price = c.pricePerUnit || settings.defaultWaterPrice || 30;
      bottles += qty;
      totalAmt += qty * price;
    });
    return { count: bulkSelectedIds.length, bottles, totalAmt };
  }, [bulkSelectedIds, bulkQtyMode, bulkCustomQty, customers, settings]);

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkSelectedIds.length === 0) {
      toast.error('Baraye meharbani pehle customers select karein.');
      return;
    }

    let count = 0;
    bulkSelectedIds.forEach(id => {
      const c = customers.find(x => x.id === id);
      if (!c) return;

      const qty = bulkQtyMode === 'custom' ? Math.max(1, bulkCustomQty) : (c.quantity || 1);
      const unitPrice = c.pricePerUnit || settings.defaultWaterPrice || 30;
      const totalPrice = qty * unitPrice;

      addDelivery({
        customerId: c.id,
        customerName: c.name,
        date: bulkDate,
        time: bulkTime,
        quantity: qty,
        emptyBottlesReceived: qty,
        waterType: c.waterType || 'Regular',
        pricePerUnit: unitPrice,
        totalPrice,
        paymentStatus: bulkPaymentStatus,
        paidAmount: bulkPaymentStatus === 'paid' ? totalPrice : 0,
        notes: 'Multi-Customer Delivery',
      });
      count++;
    });

    toast.success(`Mubarak! ${count} customers ko ek sath delivery record ho gayi!`);
    setIsBulkModalOpen(false);
    setBulkSelectedIds([]);
  };

  const filtered = useMemo(() => {
    return deliveries.filter(d => {
      const matchSearch = !search || d.customerName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || d.paymentStatus === filterStatus;
      const matchCustomer = !filterCustomer || d.customerId === filterCustomer;
      const matchStart = !startDate || d.date >= startDate;
      const matchEnd = !endDate || d.date <= endDate;
      return matchSearch && matchStatus && matchCustomer && matchStart && matchEnd;
    }).sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || '00:00'}`);
      const db = new Date(`${b.date}T${b.time || '00:00'}`);
      return db.getTime() - da.getTime();
    });
  }, [deliveries, search, filterStatus, filterCustomer, startDate, endDate]);

  const customerOptions = customers.map(c => ({ value: c.id, label: c.name, sublabel: `${c.phone}${c.area ? ` • ${c.area}` : ''}` }));
  const fmt = (v: number) => `${settings.currencySymbol}${v.toLocaleString()}`;

  const handleCustomerChange = (customerId: string) => {
    const c = customers.find(x => x.id === customerId);
    if (c) {
      const qty = c.quantity || 1;
      const price = c.pricePerUnit || settings.defaultWaterPrice;
      const total = qty * price;
      setForm(prev => ({
        ...prev, customerId, quantity: qty, emptyBottlesReceived: qty, waterType: c.waterType || 'Regular',
        pricePerUnit: price, totalPrice: total,
        paidAmount: prev.paymentStatus === 'paid' ? total : prev.paymentStatus === 'unpaid' ? 0 : prev.paidAmount,
      }));
    } else {
      setForm(prev => ({ ...prev, customerId }));
    }
  };

  const handleQtyPriceChange = (field: 'quantity' | 'pricePerUnit', val: number) => {
    setForm(prev => {
      const q = field === 'quantity' ? val : prev.quantity;
      const p = field === 'pricePerUnit' ? val : prev.pricePerUnit;
      const total = q * p;
      return { 
        ...prev, 
        [field]: val, 
        emptyBottlesReceived: field === 'quantity' ? val : prev.emptyBottlesReceived,
        totalPrice: total, 
        paidAmount: prev.paymentStatus === 'paid' ? total : prev.paidAmount 
      };
    });
  };

  const handleStatusChange = (status: string) => {
    setForm(prev => ({
      ...prev, paymentStatus: status as any,
      paidAmount: status === 'paid' ? prev.totalPrice : status === 'unpaid' ? 0 : prev.paidAmount,
    }));
  };

  const openModal = (id?: string) => {
    if (id) {
      const d = deliveries.find(x => x.id === id);
      if (!d) return;
      setEditingId(id);
      setForm({ customerId: d.customerId, date: d.date, time: d.time, quantity: d.quantity, emptyBottlesReceived: d.emptyBottlesReceived || d.quantity, waterType: d.waterType, pricePerUnit: d.pricePerUnit, totalPrice: d.totalPrice, paymentStatus: d.paymentStatus, paidAmount: d.paidAmount, notes: d.notes });
    } else {
      setEditingId(null);
      setForm({ customerId: '', date: format(new Date(), 'yyyy-MM-dd'), time: format(new Date(), 'HH:mm'), quantity: 1, emptyBottlesReceived: 1, waterType: 'Regular', pricePerUnit: settings.defaultWaterPrice, totalPrice: settings.defaultWaterPrice, paymentStatus: 'paid', paidAmount: settings.defaultWaterPrice, notes: '' });
    }
    setErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.customerId) e.customerId = 'Select a customer';
    if (!form.date) e.date = 'Date is required';
    if (form.quantity <= 0) e.quantity = 'Must be > 0';
    if (form.totalPrice < 0) e.totalPrice = 'Cannot be negative';
    if (form.paymentStatus === 'partial' && (form.paidAmount <= 0 || form.paidAmount >= form.totalPrice)) {
      e.paidAmount = 'Must be between 0 and total price';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const customer = customers.find(c => c.id === form.customerId);
    const data = { ...form, customerName: customer?.name || 'Unknown' };
    
    if (editingId) {
      updateDelivery(editingId, data);
      toast.success('Delivery updated!');
    } else {
      const newDel = addDelivery(data);
      toast.success('Delivery recorded!');

      // Offer quick WhatsApp slip if customer phone exists
      if (customer && customer.phone) {
        const bal = getCustomerBalance(customer.id);
        openWhatsAppDeliverySlip(newDel, customer, bal, settings);
      }
    }
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) { deleteDelivery(deleteId); toast.success('Delivery deleted'); setDeleteId(null); }
  };

  const handleSendSlip = (delivery: any) => {
    const customer = customers.find(c => c.id === delivery.customerId);
    if (!customer) {
      toast.error('Customer not found');
      return;
    }
    const bal = getCustomerBalance(customer.id);
    openWhatsAppDeliverySlip(delivery, customer, bal, settings);
    toast.success(`Opening WhatsApp slip for ${customer.name}`);
  };

  const handleSendSmsSlip = (delivery: any) => {
    const customer = customers.find(c => c.id === delivery.customerId);
    if (!customer) {
      toast.error('Customer not found');
      return;
    }
    const bal = getCustomerBalance(customer.id);
    openSmsDeliverySlip(delivery, customer, bal, settings);
    toast.success(`Opening SMS slip for ${customer.name}`);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <PageHeader 
        title="Delivery Records" 
        subtitle={`${deliveries.length} total deliveries recorded`} 
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant="secondary" 
              onClick={() => setIsBulkModalOpen(true)} 
              icon={<Users className="w-4 h-4 text-sky-600" />}
            >
              Multi-Customer Delivery
            </Button>
            <Button onClick={() => openModal()} icon={<Plus className="w-4 h-4" />}>
              Record Delivery
            </Button>
          </div>
        } 
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by customer name..." />
          </div>
          <select value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20">
            <option value="">All Customers</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20">
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <div className="flex gap-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
          </div>
        </div>
      </Card>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState icon={<Truck className="w-8 h-8" />} title="No deliveries found" description={search || filterStatus !== 'all' ? 'Try adjusting your filters.' : 'Record your first delivery to get started.'} action={!search ? { label: 'Record Delivery', onClick: () => openModal() } : undefined} />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date & Time</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Bottles & Cans</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Notes</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(d => (
                      <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="text-sm font-medium">{format(new Date(d.date), 'MMM d, yyyy')}</div>
                          <div className="text-xs text-gray-400">{d.time}</div>
                        </td>
                        <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{d.customerName}</td>
                        <td className="px-5 py-3.5 text-sm">
                          <div className="font-semibold text-sky-700">{d.quantity} bottles ({d.waterType})</div>
                          <div className="text-xs text-gray-400">
                            Empty returned: {d.emptyBottlesReceived || 0} cans
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm font-semibold">{fmt(d.totalPrice)}</td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={d.paymentStatus} />
                          {d.paymentStatus === 'partial' && <div className="text-xs text-gray-400 mt-0.5">Paid: {fmt(d.paidAmount)}</div>}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500 max-w-[150px] truncate">{d.notes || '—'}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            {/* WhatsApp Delivery Slip */}
                            <button
                              onClick={() => handleSendSlip(d)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Send WhatsApp Delivery Slip"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            {/* SMS Delivery Slip */}
                            <button
                              onClick={() => handleSendSmsSlip(d)}
                              className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                              title="Send SMS Delivery Slip"
                            >
                              <Phone className="w-4 h-4" />
                            </button>
                            <button onClick={() => openModal(d.id)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><Edit className="w-4 h-4 text-gray-500" /></button>
                            <button onClick={() => setDeleteId(d.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4 text-red-400" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filtered.map(d => (
              <Card key={d.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{d.customerName}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(d.date), 'MMM d, yyyy')} at {d.time}</p>
                  </div>
                  <StatusBadge status={d.paymentStatus} />
                </div>
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mb-2 text-sm">
                  <div>
                    <span className="text-gray-900 font-bold">{d.quantity} bottles</span>
                    {d.emptyBottlesReceived ? (
                      <span className="text-xs text-gray-500 block">({d.emptyBottlesReceived} empty returned)</span>
                    ) : null}
                  </div>
                  <span className="font-semibold text-sky-600">{fmt(d.totalPrice)}</span>
                </div>
                {d.paymentStatus === 'partial' && <p className="text-xs text-gray-400 mb-2">Paid: {fmt(d.paidAmount)}</p>}
                {d.notes && <p className="text-xs text-gray-400 mb-2">{d.notes}</p>}
                
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    onClick={() => handleSendSlip(d)}
                    className="py-1.5 px-2 bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    onClick={() => handleSendSmsSlip(d)}
                    className="py-1.5 px-2 bg-sky-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>SMS</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => openModal(d.id)} icon={<Edit className="w-3.5 h-3.5" />}>Edit</Button>
                  <Button size="sm" variant="danger" className="flex-1" onClick={() => setDeleteId(d.id)} icon={<Trash2 className="w-3.5 h-3.5" />}>Delete</Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Delivery' : 'Record Delivery'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <SearchableSelect label="Customer" options={customerOptions} value={form.customerId} onChange={handleCustomerChange} placeholder="Search and select customer..." required error={errors.customerId} />
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} required error={errors.date} />
            <FormInput label="Time" type="time" value={form.time} onChange={(v) => setForm({ ...form, time: v })} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput label="Water Type" value={form.waterType} onChange={(v) => setForm({ ...form, waterType: v })} />
            <FormInput label="Filled Bottles (Qty)" type="number" value={form.quantity} onChange={(v) => handleQtyPriceChange('quantity', Number(v))} required min={1} error={errors.quantity} />
            <FormInput label="Empty Cans Returned" type="number" value={form.emptyBottlesReceived} onChange={(v) => setForm({ ...form, emptyBottlesReceived: Number(v) })} min={0} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label={`Price Per Unit (${settings.currencySymbol})`} type="number" value={form.pricePerUnit} onChange={(v) => handleQtyPriceChange('pricePerUnit', Number(v))} min={0} step="0.01" />
            <FormInput label={`Total Price (${settings.currencySymbol})`} type="number" value={form.totalPrice} onChange={(v) => { const t = Number(v); setForm(prev => ({ ...prev, totalPrice: t, paidAmount: prev.paymentStatus === 'paid' ? t : prev.paidAmount })); }} min={0} step="0.01" error={errors.totalPrice} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Payment Status" value={form.paymentStatus} onChange={handleStatusChange} options={[{ value: 'paid', label: 'Paid' }, { value: 'partial', label: 'Partially Paid' }, { value: 'unpaid', label: 'Unpaid' }]} />
            {form.paymentStatus === 'partial' && (
              <FormInput label={`Paid Amount (${settings.currencySymbol})`} type="number" value={form.paidAmount} onChange={(v) => setForm({ ...form, paidAmount: Number(v) })} min={0} step="0.01" required error={errors.paidAmount} />
            )}
          </div>
          <FormTextarea label="Notes (Optional)" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Any notes..." />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingId ? 'Update Delivery' : 'Record & Send Slip'}</Button>
          </div>
        </form>
      </Modal>

      {/* Multi-Customer Bulk Delivery Modal */}
      <Modal 
        isOpen={isBulkModalOpen} 
        onClose={() => setIsBulkModalOpen(false)} 
        title="Multi-Customer Delivery (Bulk Selection)" 
        size="xl"
      >
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50/80 rounded-xl border border-gray-100">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Delivery Date</label>
              <input
                type="date"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Delivery Time</label>
              <input
                type="time"
                value={bulkTime}
                onChange={(e) => setBulkTime(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>

          {/* Bottle Quantity & Payment Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-sky-50/60 rounded-xl border border-sky-100">
            <div>
              <label className="block text-xs font-semibold text-sky-900 mb-1.5">Bottle Quantity Mode</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkQtyMode('default')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all ${
                    bulkQtyMode === 'default'
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Each Customer's Default
                </button>
                <button
                  type="button"
                  onClick={() => setBulkQtyMode('custom')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all ${
                    bulkQtyMode === 'custom'
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Same Qty for All
                </button>
              </div>
              {bulkQtyMode === 'custom' && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-600">Fixed bottles:</span>
                  <input
                    type="number"
                    min={1}
                    value={bulkCustomQty}
                    onChange={(e) => setBulkCustomQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-center"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-sky-900 mb-1.5">Payment Status</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkPaymentStatus('unpaid')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all ${
                    bulkPaymentStatus === 'unpaid'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Credit (Udhar)
                </button>
                <button
                  type="button"
                  onClick={() => setBulkPaymentStatus('paid')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all ${
                    bulkPaymentStatus === 'paid'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Paid Cash
                </button>
              </div>
            </div>
          </div>

          {/* Customer Selection Filter & Search */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
              <div className="flex-1">
                <SearchInput
                  value={bulkSearch}
                  onChange={setBulkSearch}
                  placeholder="Search customer by name, phone or area..."
                />
              </div>

              {areas.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setBulkAreaFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                      bulkAreaFilter === 'all' ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All Areas
                  </button>
                  {areas.map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setBulkAreaFilter(a)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                        bulkAreaFilter === a ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selection Toolbar */}
            <div className="flex items-center justify-between px-1 py-1 text-xs">
              <button
                type="button"
                onClick={selectAllBulkFiltered}
                className="font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1.5"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>
                  {bulkFilteredCustomers.length > 0 && bulkFilteredCustomers.every(c => bulkSelectedIds.includes(c.id))
                    ? 'Deselect All Filtered'
                    : `Select All Filtered (${bulkFilteredCustomers.length})`}
                </span>
              </button>

              {bulkSelectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setBulkSelectedIds([])}
                  className="text-gray-500 hover:text-gray-800 text-[11px] font-semibold flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Clear ({bulkSelectedIds.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Customer Scroll List */}
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
            {bulkFilteredCustomers.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">
                Koi customer nahi mila. Search ya area filter tabdeel karein.
              </div>
            ) : (
              bulkFilteredCustomers.map(c => {
                const isSelected = bulkSelectedIds.includes(c.id);
                const qty = bulkQtyMode === 'custom' ? bulkCustomQty : (c.quantity || 1);
                const price = c.pricePerUnit || settings.defaultWaterPrice || 30;

                return (
                  <div
                    key={c.id}
                    onClick={() => toggleBulkCustomer(c.id)}
                    className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-sky-50/70 hover:bg-sky-50' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center transition-all shrink-0 ${
                          isSelected
                            ? 'bg-sky-600 text-white'
                            : 'border-2 border-gray-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs text-gray-900 truncate">{c.name}</p>
                          {c.area && (
                            <span className="text-[10px] bg-sky-100 text-sky-700 font-semibold px-1.5 py-0.2 rounded">
                              {c.area}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 truncate">{c.phone}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-gray-800 block">
                        {qty} bottles
                      </span>
                      <span className="text-[11px] text-sky-600 font-semibold">
                        {fmt(qty * price)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Summary Banner */}
          <div className="p-3 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-100 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-500 font-medium">Selected: </span>
              <strong className="text-sky-900 font-bold">{bulkSummary.count} Customers</strong>
              <span className="text-gray-400 mx-1.5">•</span>
              <strong className="text-sky-900 font-bold">{bulkSummary.bottles} Bottles</strong>
            </div>
            <div className="text-right">
              <span className="text-gray-500 font-medium">Total: </span>
              <strong className="text-emerald-700 font-black text-sm">{fmt(bulkSummary.totalAmt)}</strong>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setIsBulkModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={bulkSelectedIds.length === 0}
              className="bg-sky-600 hover:bg-sky-700 text-white"
            >
              Deliver to ({bulkSelectedIds.length}) Selected Customers
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Delivery" message="Are you sure you want to delete this delivery? This cannot be undone." confirmText="Delete" variant="danger" />
    </div>
  );
}
