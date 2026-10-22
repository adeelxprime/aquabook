import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader, Card, Button, SearchInput, EmptyState } from '../components/ui';
import { 
  openWhatsAppDeliverySlip, openSmsDeliverySlip, getCustomerBalance 
} from '../services/dataService';
import type { Customer, Delivery } from '../types';
import { 
  Truck, CheckCircle2, Droplets, RotateCcw, MessageSquare, 
  Search, Calendar, Filter, Clock, Plus, Minus, MapPin, 
  Phone, Sparkles, Check, CheckSquare, Square, X, Users
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function QuickDelivery() {
  const { customers, deliveries, addDelivery, settings } = useApp();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');

  // Multi-Customer Selection State
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [bulkQtyMode, setBulkQtyMode] = useState<'default' | 'custom'>('default');
  const [bulkCustomQty, setBulkCustomQty] = useState(1);
  const [bulkPaymentStatus, setBulkPaymentStatus] = useState<'unpaid' | 'paid'>('unpaid');

  // Customer state for rapid entry (qty, empty cans, paid status)
  const [entries, setEntries] = useState<Record<string, {
    quantity: number;
    emptyReceived: number;
    paymentStatus: 'paid' | 'unpaid';
  }>>({});

  // Get distinct areas
  const areas = useMemo(() => {
    const set = new Set<string>();
    customers.forEach(c => {
      if (c.area) set.add(c.area);
    });
    return Array.from(set);
  }, [customers]);

  // Deliveries on selected date
  const todayDeliveriesMap = useMemo(() => {
    const map: Record<string, Delivery> = {};
    deliveries.filter(d => d.date === selectedDate).forEach(d => {
      map[d.customerId] = d;
    });
    return map;
  }, [deliveries, selectedDate]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (c.status !== 'active') return false;
      const matchSearch = 
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        (c.address && c.address.toLowerCase().includes(search.toLowerCase())) ||
        (c.area && c.area.toLowerCase().includes(search.toLowerCase()));

      const matchArea = areaFilter === 'all' || c.area === areaFilter;
      return matchSearch && matchArea;
    });
  }, [customers, search, areaFilter]);

  // Pending customers on route (not yet delivered today)
  const pendingCustomers = useMemo(() => {
    return filteredCustomers.filter(c => !todayDeliveriesMap[c.id]);
  }, [filteredCustomers, todayDeliveriesMap]);

  const toggleSelectCustomer = (id: string) => {
    setSelectedCustomerIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllPending = () => {
    if (selectedCustomerIds.length === pendingCustomers.length && pendingCustomers.length > 0) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(pendingCustomers.map(c => c.id));
    }
  };

  const handleBulkDeliver = () => {
    if (selectedCustomerIds.length === 0) {
      toast.error('Baraye meharbani pehle customers select karein.');
      return;
    }

    const nowTime = format(new Date(), 'HH:mm');
    let count = 0;

    selectedCustomerIds.forEach(id => {
      const customer = customers.find(c => c.id === id);
      if (!customer) return;

      const qty = bulkQtyMode === 'custom' ? Math.max(1, bulkCustomQty) : (customer.quantity || 1);
      const unitPrice = customer.pricePerUnit || settings.defaultWaterPrice || 30;
      const totalPrice = qty * unitPrice;

      addDelivery({
        customerId: customer.id,
        customerName: customer.name,
        date: selectedDate,
        time: nowTime,
        quantity: qty,
        emptyBottlesReceived: qty,
        waterType: customer.waterType || 'Regular Jar',
        pricePerUnit: unitPrice,
        totalPrice,
        paymentStatus: bulkPaymentStatus,
        paidAmount: bulkPaymentStatus === 'paid' ? totalPrice : 0,
        notes: `Multi-Customer Route Delivery`,
      });
      count++;
    });

    toast.success(`Mubarak! ${count} customers ko ek sath delivery record ho gayi!`);
    setSelectedCustomerIds([]);
  };

  // State getter with defaults
  const getEntry = (c: Customer) => {
    if (entries[c.id]) return entries[c.id];
    return {
      quantity: c.quantity || 1,
      emptyReceived: c.quantity || 1,
      paymentStatus: 'unpaid' as const,
    };
  };

  const updateEntry = (customerId: string, field: 'quantity' | 'emptyReceived' | 'paymentStatus', val: any) => {
    setEntries(prev => {
      const current = prev[customerId] || {
        quantity: customers.find(c => c.id === customerId)?.quantity || 1,
        emptyReceived: customers.find(c => c.id === customerId)?.quantity || 1,
        paymentStatus: 'unpaid',
      };
      return {
        ...prev,
        [customerId]: {
          ...current,
          [field]: val,
        },
      };
    });
  };

  // Deliver action
  const handleDeliver = (customer: Customer) => {
    const entry = getEntry(customer);
    const unitPrice = customer.pricePerUnit || settings.defaultWaterPrice || 30;
    const totalPrice = entry.quantity * unitPrice;
    const nowTime = format(new Date(), 'HH:mm');

    const newDelivery = addDelivery({
      customerId: customer.id,
      customerName: customer.name,
      date: selectedDate,
      time: nowTime,
      quantity: entry.quantity,
      emptyBottlesReceived: entry.emptyReceived,
      waterType: customer.waterType || 'Regular Jar',
      pricePerUnit: unitPrice,
      totalPrice,
      paymentStatus: entry.paymentStatus,
      paidAmount: entry.paymentStatus === 'paid' ? totalPrice : 0,
      notes: `Recorded via Quick Delivery Sheet`,
    });

    toast.success(`Delivered ${entry.quantity} bottles to ${customer.name}!`);

    // Ask if want to open WhatsApp slip
    const bal = getCustomerBalance(customer.id);
    if (settings.notificationsEnabled) {
      openWhatsAppDeliverySlip(newDelivery, customer, bal, settings);
    }
  };

  const handleSendSlip = (customer: Customer, delivery: Delivery) => {
    const bal = getCustomerBalance(customer.id);
    openWhatsAppDeliverySlip(delivery, customer, bal, settings);
    toast.success(`Opening WhatsApp slip for ${customer.name}`);
  };

  const handleSendSmsSlip = (customer: Customer, delivery: Delivery) => {
    const bal = getCustomerBalance(customer.id);
    openSmsDeliverySlip(delivery, customer, bal, settings);
    toast.success(`Opening SMS slip for ${customer.name}`);
  };

  // Stats for today
  const totalOnRoute = filteredCustomers.length;
  const deliveredCount = filteredCustomers.filter(c => !!todayDeliveriesMap[c.id]).length;
  const totalBottlesToday = filteredCustomers.reduce((sum, c) => {
    const del = todayDeliveriesMap[c.id];
    return sum + (del ? del.quantity : 0);
  }, 0);

  const sym = settings.currencySymbol || 'Rs.';

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <PageHeader
        title="Today's Delivery Khatta (Daily Register)"
        subtitle="VodaBook style daily route delivery sheet - 1-tap bottle delivery & empty can tracking"
        action={
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-gray-200 shadow-sm text-xs font-bold">
            <Calendar className="w-4 h-4 text-sky-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-gray-800 font-bold focus:outline-none"
            />
          </div>
        }
      />

      {/* Progress & Route Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-sky-50/60 border-sky-100">
          <span className="text-[11px] font-semibold text-sky-700 uppercase">Customers on Route</span>
          <p className="text-xl font-black text-sky-950 mt-0.5">{totalOnRoute}</p>
        </Card>

        <Card className="p-3.5 bg-emerald-50/60 border-emerald-100">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase">Completed Today</span>
          <p className="text-xl font-black text-emerald-600 mt-0.5">{deliveredCount} / {totalOnRoute}</p>
        </Card>

        <Card className="p-3.5 bg-blue-50/60 border-blue-100">
          <span className="text-[11px] font-semibold text-blue-700 uppercase">Bottles Delivered</span>
          <p className="text-xl font-black text-blue-900 mt-0.5">{totalBottlesToday} <span className="text-xs font-normal">bottles</span></p>
        </Card>

        <Card className="p-3.5 bg-purple-50/60 border-purple-100">
          <span className="text-[11px] font-semibold text-purple-700 uppercase">Progress</span>
          <div className="w-full bg-purple-200/50 rounded-full h-2.5 mt-2">
            <div 
              className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${totalOnRoute > 0 ? (deliveredCount / totalOnRoute) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[10px] text-purple-700 mt-1 font-bold">
            {totalOnRoute > 0 ? Math.round((deliveredCount / totalOnRoute) * 100) : 0}% completed
          </p>
        </Card>
      </div>

      {/* Route & Area Filter Bar */}
      <Card className="p-3.5">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search customer by name, mobile or street address..."
            />
          </div>

          {areas.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-semibold text-gray-500 whitespace-nowrap mr-1">Area / Route:</span>
              <button
                onClick={() => setAreaFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  areaFilter === 'all' ? 'bg-sky-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Areas
              </button>
              {areas.map(a => (
                <button
                  key={a}
                  onClick={() => setAreaFilter(a)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    areaFilter === a ? 'bg-sky-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Multi-Customer Selection Bar */}
      {pendingCustomers.length > 0 && (
        <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={selectAllPending}
              className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-sky-50 text-sky-700 text-xs font-bold rounded-xl border border-sky-200 transition-all shadow-xs"
            >
              {selectedCustomerIds.length === pendingCustomers.length && pendingCustomers.length > 0 ? (
                <>
                  <CheckSquare className="w-4 h-4 text-sky-600" />
                  <span>Deselect All Pending</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-sky-500" />
                  <span>Select All Pending ({pendingCustomers.length})</span>
                </>
              )}
            </button>

            {selectedCustomerIds.length > 0 && (
              <span className="text-xs font-bold text-sky-900 bg-sky-200/70 px-2.5 py-1 rounded-lg">
                {selectedCustomerIds.length} Selected for Delivery
              </span>
            )}
          </div>

          {selectedCustomerIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedCustomerIds([])}
              className="text-xs text-gray-500 hover:text-gray-800 font-semibold flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear selection</span>
            </button>
          )}
        </div>
      )}

      {/* Rapid Delivery List */}
      {filteredCustomers.length === 0 ? (
        <EmptyState
          icon={<Truck className="w-10 h-10 text-sky-400" />}
          title="No customers on route"
          description={search ? "Try searching for another name." : "Add active customers to view your daily delivery register."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCustomers.map(customer => {
            const delivery = todayDeliveriesMap[customer.id];
            const isDelivered = !!delivery;
            const entry = getEntry(customer);
            const balance = getCustomerBalance(customer.id);
            const unitPrice = customer.pricePerUnit || settings.defaultWaterPrice || 30;
            const isSelected = selectedCustomerIds.includes(customer.id);

            return (
              <Card 
                key={customer.id} 
                className={`p-4 transition-all border relative ${
                  isDelivered 
                    ? 'border-emerald-200 bg-emerald-50/20' 
                    : isSelected
                    ? 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-400/40 shadow-sm'
                    : 'border-gray-200/80 bg-white hover:border-sky-300'
                }`}
              >
                {/* Customer Info Header */}
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {!isDelivered && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectCustomer(customer.id);
                        }}
                        className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'border-2 border-gray-300 hover:border-sky-500 bg-white'
                        }`}
                        title={isSelected ? "Deselect customer" : "Select customer for multi-delivery"}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-base truncate">{customer.name}</h3>
                        {customer.area && (
                          <span className="text-[10px] bg-sky-100 text-sky-700 font-semibold px-2 py-0.5 rounded-md">
                            {customer.area}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>{customer.phone}</span>
                      </p>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{customer.address}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {isDelivered ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500 text-white rounded-full text-xs font-bold shadow-sm shadow-emerald-500/20 shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      Done
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[11px] font-semibold shrink-0">
                      <Clock className="w-3 h-3" />
                      Pending
                    </span>
                  )}
                </div>

                {/* Balances summary */}
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-gray-50/80 rounded-xl text-xs mb-3">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Baqiya Due:</span>
                    <span className={`font-black ${balance.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {sym}{balance.outstandingBalance.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Empty Cans Held:</span>
                    <span className="font-bold text-gray-800">
                      {balance.emptyBottlesHeld} cans
                    </span>
                  </div>
                </div>

                {/* IF DELIVERED TODAY */}
                {isDelivered ? (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-900 flex justify-between items-center">
                      <div>
                        <span className="font-bold">{delivery.quantity} filled bottles</span> delivered at {delivery.time}
                        {delivery.emptyBottlesReceived ? (
                          <span className="block text-[11px] text-emerald-700">({delivery.emptyBottlesReceived} empty returned)</span>
                        ) : null}
                      </div>
                      <span className="font-black text-sm">{sym}{delivery.totalPrice}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleSendSlip(customer, delivery)}
                        className="py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp Slip</span>
                      </button>
                      <button
                        onClick={() => handleSendSmsSlip(customer, delivery)}
                        className="py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Mobile SMS</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* IF PENDING DELIVERY: QUICK ENTRY CONTROLS */
                  <div className="space-y-3">
                    {/* Bottle count & Empty count counter controls */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Filled Bottles */}
                      <div className="p-2 bg-sky-50/50 border border-sky-100 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-sky-800 uppercase block mb-1">
                          Filled Bottles
                        </span>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateEntry(customer.id, 'quantity', Math.max(1, entry.quantity - 1))}
                            className="w-7 h-7 bg-white hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg font-bold flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-base font-black text-sky-950 w-6">
                            {entry.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateEntry(customer.id, 'quantity', entry.quantity + 1)}
                            className="w-7 h-7 bg-white hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg font-bold flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Empty Bottles Received */}
                      <div className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-gray-700 uppercase block mb-1">
                          Empty Returned
                        </span>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateEntry(customer.id, 'emptyReceived', Math.max(0, entry.emptyReceived - 1))}
                            className="w-7 h-7 bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-lg font-bold flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-base font-black text-gray-900 w-6">
                            {entry.emptyReceived}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateEntry(customer.id, 'emptyReceived', entry.emptyReceived + 1)}
                            className="w-7 h-7 bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-lg font-bold flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Payment status quick toggle */}
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-gray-500 font-medium">Total: <strong className="text-gray-900">{sym}{entry.quantity * unitPrice}</strong></span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateEntry(customer.id, 'paymentStatus', 'unpaid')}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            entry.paymentStatus === 'unpaid' 
                              ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                              : 'text-gray-400 hover:text-gray-700'
                          }`}
                        >
                          Credit (Udhar)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateEntry(customer.id, 'paymentStatus', 'paid')}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            entry.paymentStatus === 'paid' 
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                              : 'text-gray-400 hover:text-gray-700'
                          }`}
                        >
                          Paid Cash
                        </button>
                      </div>
                    </div>

                    {/* Master Deliver Button */}
                    <button
                      onClick={() => handleDeliver(customer)}
                      className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 transition-all"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Deliver {entry.quantity} Bottles</span>
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Floating Bulk Delivery Action Bar */}
      {selectedCustomerIds.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-72 md:right-8 z-40">
          <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-blue-900 text-white p-4 rounded-2xl shadow-2xl border border-sky-700/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/30 border border-sky-400/40 flex items-center justify-center font-black text-sky-200 shrink-0">
                {selectedCustomerIds.length}
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">
                  {selectedCustomerIds.length} Customer{selectedCustomerIds.length > 1 ? 's' : ''} Selected
                </h4>
                <p className="text-xs text-sky-200/80">
                  Multiple customers ko ek sath deliver karein
                </p>
              </div>
            </div>

            {/* Quick Bulk Settings */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Qty mode */}
              <div className="flex items-center bg-sky-950/60 rounded-xl p-1 border border-sky-700/50">
                <button
                  type="button"
                  onClick={() => setBulkQtyMode('default')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    bulkQtyMode === 'default' ? 'bg-sky-500 text-white' : 'text-sky-200 hover:text-white'
                  }`}
                >
                  Customer Default Qty
                </button>
                <button
                  type="button"
                  onClick={() => setBulkQtyMode('custom')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    bulkQtyMode === 'custom' ? 'bg-sky-500 text-white' : 'text-sky-200 hover:text-white'
                  }`}
                >
                  Fixed Qty
                </button>
              </div>

              {bulkQtyMode === 'custom' && (
                <div className="flex items-center gap-1.5 bg-sky-950/60 px-2 py-1 rounded-xl border border-sky-700/50">
                  <span className="text-[11px] text-sky-200 font-medium">Bottles:</span>
                  <input
                    type="number"
                    min={1}
                    value={bulkCustomQty}
                    onChange={(e) => setBulkCustomQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 bg-white text-gray-900 text-center font-bold rounded px-1 py-0.5 text-xs"
                  />
                </div>
              )}

              {/* Payment Status */}
              <div className="flex items-center bg-sky-950/60 rounded-xl p-1 border border-sky-700/50">
                <button
                  type="button"
                  onClick={() => setBulkPaymentStatus('unpaid')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    bulkPaymentStatus === 'unpaid' ? 'bg-rose-500 text-white' : 'text-sky-200 hover:text-white'
                  }`}
                >
                  Udhar (Credit)
                </button>
                <button
                  type="button"
                  onClick={() => setBulkPaymentStatus('paid')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    bulkPaymentStatus === 'paid' ? 'bg-emerald-500 text-white' : 'text-sky-200 hover:text-white'
                  }`}
                >
                  Paid Cash
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCustomerIds([])}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDeliver}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-500/30 flex items-center gap-1.5 transition-all"
              >
                <Truck className="w-4 h-4" />
                <span>Deliver to ({selectedCustomerIds.length}) Selected</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
