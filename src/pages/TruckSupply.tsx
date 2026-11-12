import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  PageHeader, Card, Button, SearchInput, Modal, ConfirmDialog, 
  FormInput, FormSelect, FormTextarea, EmptyState, SearchableSelect 
} from '../components/ui';
import type { TruckSupply } from '../types';
import { 
  Truck, Plus, Calendar, Check, X, Clock, MessageSquare, 
  Phone, MapPin, Edit, Trash2, Droplets, Filter, RotateCcw, 
  AlertCircle, Fuel, Users
} from 'lucide-react';
import { format } from 'date-fns';
import { openWhatsAppTruckSlip } from '../services/dataService';
import toast from 'react-hot-toast';

export default function TruckSupply() {
  const { 
    truckSupplies, addTruckSupply, updateTruckSupply, deleteTruckSupply, 
    deliveryBoys, customers, settings 
  } = useApp();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'skipped' | 'in_transit'>('all');
  const [supplyTypeFilter, setSupplyTypeFilter] = useState<'all' | 'tanker_water' | 'bulk_containers'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TruckSupply | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Skip / Crossmark Modal State
  const [skipModalTrip, setSkipModalTrip] = useState<TruckSupply | null>(null);
  const [skipReason, setSkipReason] = useState('Site Closed / Band Tha');
  const [skipNotes, setSkipNotes] = useState('');

  const sym = settings.currencySymbol || 'Rs.';

  // Form State
  const [form, setForm] = useState({
    vehicleNumber: '',
    vehicleType: 'tanker' as TruckSupply['vehicleType'],
    capacityLiters: 5000,
    capacityContainers: 100,
    driverName: '',
    driverPhone: '',
    deliveryBoyId: '',
    clientName: '',
    clientPhone: '',
    destinationAddress: '',
    date: todayStr,
    time: format(new Date(), 'HH:mm'),
    supplyType: 'tanker_water' as TruckSupply['supplyType'],
    quantitySupplied: 5000,
    extraQuantity: 0,
    unitPrice: 1.5, // e.g. 1.5 per liter or 80 per container
    totalAmount: 7500,
    paymentStatus: 'paid' as TruckSupply['paymentStatus'],
    paidAmount: 7500,
    status: 'delivered' as TruckSupply['status'],
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Recalculate total amount when quantity or extra changes
  const handleQtyPriceChange = (qty: number, extra: number, price: number) => {
    const totalQty = qty + extra;
    const total = totalQty * price;
    setForm(prev => ({
      ...prev,
      quantitySupplied: qty,
      extraQuantity: extra,
      unitPrice: price,
      totalAmount: total,
      paidAmount: prev.paymentStatus === 'paid' ? total : prev.paymentStatus === 'unpaid' ? 0 : prev.paidAmount,
    }));
  };

  const handleOpenAdd = () => {
    setEditingTrip(null);
    const nowTime = format(new Date(), 'HH:mm');
    setForm({
      vehicleNumber: '',
      vehicleType: 'tanker',
      capacityLiters: 5000,
      capacityContainers: 100,
      driverName: deliveryBoys.length > 0 ? deliveryBoys[0].name : '',
      driverPhone: deliveryBoys.length > 0 ? deliveryBoys[0].phone : '',
      deliveryBoyId: deliveryBoys.length > 0 ? deliveryBoys[0].id : '',
      clientName: '',
      clientPhone: '',
      destinationAddress: '',
      date: selectedDate,
      time: nowTime,
      supplyType: 'tanker_water',
      quantitySupplied: 5000,
      extraQuantity: 0,
      unitPrice: 1.5,
      totalAmount: 7500,
      paymentStatus: 'paid',
      paidAmount: 7500,
      status: 'delivered',
      notes: '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (trip: TruckSupply) => {
    setEditingTrip(trip);
    setForm({
      vehicleNumber: trip.vehicleNumber,
      vehicleType: trip.vehicleType,
      capacityLiters: trip.capacityLiters || 5000,
      capacityContainers: trip.capacityContainers || 100,
      driverName: trip.driverName,
      driverPhone: trip.driverPhone || '',
      deliveryBoyId: trip.deliveryBoyId || '',
      clientName: trip.clientName,
      clientPhone: trip.clientPhone || '',
      destinationAddress: trip.destinationAddress,
      date: trip.date,
      time: trip.time,
      supplyType: trip.supplyType,
      quantitySupplied: trip.quantitySupplied,
      extraQuantity: trip.extraQuantity || 0,
      unitPrice: trip.unitPrice,
      totalAmount: trip.totalAmount,
      paymentStatus: trip.paymentStatus,
      paidAmount: trip.paidAmount,
      status: trip.status,
      notes: trip.notes || '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDriverSelect = (boyId: string) => {
    const boy = deliveryBoys.find(b => b.id === boyId);
    if (boy) {
      setForm(prev => ({
        ...prev,
        deliveryBoyId: boy.id,
        driverName: boy.name,
        driverPhone: boy.phone,
        vehicleNumber: boy.vehicleNumber || prev.vehicleNumber,
      }));
    } else {
      setForm(prev => ({ ...prev, deliveryBoyId: '', driverName: '' }));
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    const c = customers.find(x => x.id === customerId);
    if (c) {
      setForm(prev => ({
        ...prev,
        clientName: c.name,
        clientPhone: c.phone,
        destinationAddress: c.address || '',
      }));
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.vehicleNumber.trim()) errs.vehicleNumber = 'Vehicle/Truck number is required';
    if (!form.driverName.trim()) errs.driverName = 'Driver / Staff name is required';
    if (!form.clientName.trim()) errs.clientName = 'Client / Site name is required';
    if (form.quantitySupplied <= 0) errs.quantitySupplied = 'Quantity must be greater than 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (editingTrip) {
      updateTruckSupply(editingTrip.id, {
        vehicleNumber: form.vehicleNumber.trim(),
        vehicleType: form.vehicleType,
        capacityLiters: Number(form.capacityLiters) || 0,
        capacityContainers: Number(form.capacityContainers) || 0,
        driverName: form.driverName.trim(),
        driverPhone: form.driverPhone.trim(),
        deliveryBoyId: form.deliveryBoyId,
        clientName: form.clientName.trim(),
        clientPhone: form.clientPhone.trim(),
        destinationAddress: form.destinationAddress.trim(),
        date: form.date,
        time: form.time,
        supplyType: form.supplyType,
        quantitySupplied: Number(form.quantitySupplied),
        extraQuantity: Number(form.extraQuantity) || 0,
        unitPrice: Number(form.unitPrice),
        totalAmount: Number(form.totalAmount),
        paymentStatus: form.paymentStatus,
        paidAmount: Number(form.paidAmount),
        status: form.status,
        notes: form.notes.trim(),
      });
      toast.success('Truck / Bulk supply trip updated!');
    } else {
      addTruckSupply({
        vehicleNumber: form.vehicleNumber.trim(),
        vehicleType: form.vehicleType,
        capacityLiters: Number(form.capacityLiters) || 0,
        capacityContainers: Number(form.capacityContainers) || 0,
        driverName: form.driverName.trim(),
        driverPhone: form.driverPhone.trim(),
        deliveryBoyId: form.deliveryBoyId,
        clientName: form.clientName.trim(),
        clientPhone: form.clientPhone.trim(),
        destinationAddress: form.destinationAddress.trim(),
        date: form.date,
        time: form.time,
        supplyType: form.supplyType,
        quantitySupplied: Number(form.quantitySupplied),
        extraQuantity: Number(form.extraQuantity) || 0,
        unitPrice: Number(form.unitPrice),
        totalAmount: Number(form.totalAmount),
        paymentStatus: form.paymentStatus,
        paidAmount: Number(form.paidAmount),
        status: form.status,
        notes: form.notes.trim(),
      });
      toast.success('New Truck / Tanker trip dispatched!');
    }

    setIsModalOpen(false);
  };

  // 1-Tap Quick Mark Delivered (Tick Mark)
  const handleMarkDelivered = (trip: TruckSupply) => {
    updateTruckSupply(trip.id, {
      status: 'delivered',
      skipReason: undefined,
    });
    toast.success(`Trip ${trip.tripNumber || trip.vehicleNumber} marked as Delivered (✅)!`);
  };

  // Open Skip / Cancel Crossmark Modal
  const handleOpenSkipModal = (trip: TruckSupply) => {
    setSkipModalTrip(trip);
    setSkipReason('Site Closed / Band Tha');
    setSkipNotes('');
  };

  const handleConfirmSkip = () => {
    if (!skipModalTrip) return;
    updateTruckSupply(skipModalTrip.id, {
      status: 'skipped',
      skipReason: skipNotes ? `${skipReason}: ${skipNotes}` : skipReason,
    });
    toast.error(`Trip marked as Not Supplied (❌ Cross): ${skipReason}`);
    setSkipModalTrip(null);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteTruckSupply(deleteId);
    toast.success('Trip record deleted.');
    setDeleteId(null);
  };

  // Filtered trips for selected date
  const filteredTrips = useMemo(() => {
    return truckSupplies.filter(trip => {
      const matchDate = trip.date === selectedDate;
      const matchSearch = 
        trip.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
        trip.driverName.toLowerCase().includes(search.toLowerCase()) ||
        trip.clientName.toLowerCase().includes(search.toLowerCase()) ||
        (trip.destinationAddress && trip.destinationAddress.toLowerCase().includes(search.toLowerCase())) ||
        (trip.tripNumber && trip.tripNumber.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === 'all' || trip.status === statusFilter;
      const matchSupplyType = supplyTypeFilter === 'all' || trip.supplyType === supplyTypeFilter;

      return matchDate && matchSearch && matchStatus && matchSupplyType;
    });
  }, [truckSupplies, selectedDate, search, statusFilter, supplyTypeFilter]);

  // Daily statistics for selected date
  const dayStats = useMemo(() => {
    const list = truckSupplies.filter(t => t.date === selectedDate);
    const delivered = list.filter(t => t.status === 'delivered');
    const skipped = list.filter(t => t.status === 'skipped');
    const inTransit = list.filter(t => t.status === 'in_transit');

    const totalLiters = delivered
      .filter(t => t.supplyType === 'tanker_water')
      .reduce((sum, t) => sum + t.quantitySupplied + (t.extraQuantity || 0), 0);

    const totalContainers = delivered
      .filter(t => t.supplyType === 'bulk_containers')
      .reduce((sum, t) => sum + t.quantitySupplied + (t.extraQuantity || 0), 0);

    const totalRevenue = delivered.reduce((sum, t) => sum + t.totalAmount, 0);
    const cashCollected = delivered.reduce((sum, t) => sum + t.paidAmount, 0);

    return {
      totalTrips: list.length,
      deliveredTrips: delivered.length,
      skippedTrips: skipped.length,
      inTransitTrips: inTransit.length,
      totalLiters,
      totalContainers,
      totalRevenue,
      cashCollected,
    };
  }, [truckSupplies, selectedDate]);

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <PageHeader
        title="Truck & Container Bulk Supply"
        subtitle="Manage water tankers, mini-truck bulk supply & live delivery tracking (Tick ✅ / Cross ❌)"
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-gray-200 shadow-xs text-xs font-bold">
              <Calendar className="w-4 h-4 text-sky-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-gray-800 font-bold focus:outline-none"
              />
            </div>
            <Button onClick={handleOpenAdd} icon={<Plus className="w-4 h-4" />}>
              Dispatch Truck
            </Button>
          </div>
        }
      />

      {/* Top Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3.5 bg-sky-50/70 border-sky-100">
          <span className="text-[11px] font-semibold text-sky-700 uppercase">Total Trips Today</span>
          <p className="text-2xl font-black text-sky-950 mt-0.5">{dayStats.totalTrips}</p>
          <span className="text-[10px] text-sky-600 font-semibold">{dayStats.inTransitTrips} In Transit (⏳)</span>
        </Card>

        <Card className="p-3.5 bg-emerald-50/70 border-emerald-100">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase">Supplied (✅ Tick)</span>
          <p className="text-2xl font-black text-emerald-600 mt-0.5">{dayStats.deliveredTrips}</p>
          <span className="text-[10px] text-emerald-700 font-semibold">
            {dayStats.totalLiters > 0 ? `${dayStats.totalLiters.toLocaleString()}L ` : ''}
            {dayStats.totalContainers > 0 ? `+ ${dayStats.totalContainers} Cans` : ''}
          </span>
        </Card>

        <Card className="p-3.5 bg-rose-50/70 border-rose-100">
          <span className="text-[11px] font-semibold text-rose-700 uppercase">Failed / Cancelled (❌)</span>
          <p className="text-2xl font-black text-rose-600 mt-0.5">{dayStats.skippedTrips}</p>
          <span className="text-[10px] text-rose-700 font-semibold">Pani nahi gya</span>
        </Card>

        <Card className="p-3.5 bg-indigo-50/70 border-indigo-100">
          <span className="text-[11px] font-semibold text-indigo-700 uppercase">Bulk Revenue</span>
          <p className="text-2xl font-black text-indigo-900 mt-0.5">{sym}{dayStats.totalRevenue.toLocaleString()}</p>
          <span className="text-[10px] text-indigo-700 font-semibold">Today's billing</span>
        </Card>

        <Card className="p-3.5 bg-amber-50/70 border-amber-100 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-amber-700 uppercase">Cash Collected</span>
          <p className="text-2xl font-black text-amber-800 mt-0.5">{sym}{dayStats.cashCollected.toLocaleString()}</p>
          <span className="text-[10px] text-amber-700 font-semibold">
            Udhar: {sym}{(dayStats.totalRevenue - dayStats.cashCollected).toLocaleString()}
          </span>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-3.5">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by truck no, driver name, site/client name, or trip #..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'all' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('delivered')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  statusFilter === 'delivered' ? 'bg-emerald-500 text-white shadow-2xs' : 'text-gray-600'
                }`}
              >
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Done</span>
              </button>
              <button
                onClick={() => setStatusFilter('skipped')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  statusFilter === 'skipped' ? 'bg-rose-500 text-white shadow-2xs' : 'text-gray-600'
                }`}
              >
                <X className="w-3 h-3 stroke-[3]" />
                <span>Failed</span>
              </button>
              <button
                onClick={() => setStatusFilter('in_transit')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  statusFilter === 'in_transit' ? 'bg-sky-500 text-white shadow-2xs' : 'text-gray-600'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>In Transit</span>
              </button>
            </div>

            {/* Supply Type Filter */}
            <select
              value={supplyTypeFilter}
              onChange={e => setSupplyTypeFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none"
            >
              <option value="all">All Vehicle Supplies</option>
              <option value="tanker_water">Water Tankers Only</option>
              <option value="bulk_containers">Bulk Containers Only</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Trips Cards / List */}
      {filteredTrips.length === 0 ? (
        <EmptyState
          icon={<Truck className="w-10 h-10 text-sky-400" />}
          title="No Truck Dispatches for this Date"
          description={
            truckSupplies.length === 0
              ? 'Click "Dispatch Truck" to schedule or record water tanker trips or bulk container shipments.'
              : 'No truck dispatches match your selected filters.'
          }
          action={{ label: 'Dispatch Truck / Container', onClick: handleOpenAdd }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTrips.map(trip => {
            const isDone = trip.status === 'delivered';
            const isSkipped = trip.status === 'skipped';
            const isTransit = trip.status === 'in_transit';

            const qtyUnit = trip.supplyType === 'tanker_water' ? 'Liters' : 'Cans';
            const totalQty = trip.quantitySupplied + (trip.extraQuantity || 0);

            return (
              <Card
                key={trip.id}
                className={`p-4 border transition-all relative flex flex-col justify-between ${
                  isDone
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : isSkipped
                    ? 'border-rose-200 bg-rose-50/20'
                    : 'border-sky-300 bg-white ring-1 ring-sky-300/40 shadow-xs'
                }`}
              >
                <div>
                  {/* Trip Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isDone ? 'bg-emerald-100 text-emerald-700' : isSkipped ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'
                      }`}>
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-gray-900 text-base">{trip.vehicleNumber}</span>
                          <span className="text-[10px] bg-gray-100 text-gray-700 font-bold px-1.5 py-0.2 rounded uppercase">
                            {trip.vehicleType}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <Users className="w-3 h-3 text-gray-400" />
                          <span>Driver: <strong className="text-gray-800">{trip.driverName}</strong></span>
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isDone && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500 text-white rounded-full text-xs font-bold shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Delivered</span>
                        </span>
                      )}
                      {isSkipped && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600 text-white rounded-full text-xs font-bold shadow-xs">
                          <X className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Pani Nahi Gya</span>
                        </span>
                      )}
                      {isTransit && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-500 text-white rounded-full text-xs font-bold shadow-xs">
                          <Clock className="w-3 h-3" />
                          <span>In Transit</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Destination & Client Info */}
                  <div className="p-2.5 bg-gray-50 rounded-xl mb-3 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-800">{trip.clientName}</span>
                      {trip.clientPhone && (
                        <span className="text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {trip.clientPhone}
                        </span>
                      )}
                    </div>
                    {trip.destinationAddress && (
                      <p className="text-[11px] text-gray-500 flex items-start gap-1">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                        <span className="truncate">{trip.destinationAddress}</span>
                      </p>
                    )}
                  </div>

                  {/* If Skipped: Reason Notice */}
                  {isSkipped && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200/80 rounded-xl mb-3 text-xs text-rose-900">
                      <span className="font-bold flex items-center gap-1 text-rose-700">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        Wajah (Reason):
                      </span>
                      <p className="mt-0.5 font-semibold">{trip.skipReason || 'Site unaccessible / cancelled'}</p>
                    </div>
                  )}

                  {/* Supply Quantity & Billing Grid */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-white border border-gray-100 rounded-xl mb-3 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Supply Volume:</span>
                      <span className="font-black text-gray-900 text-sm">
                        {totalQty.toLocaleString()} {qtyUnit}
                      </span>
                      {trip.extraQuantity && trip.extraQuantity > 0 ? (
                        <span className="text-[10px] font-bold text-amber-600 block">
                          (+{trip.extraQuantity} Extra)
                        </span>
                      ) : null}
                    </div>

                    <div className="text-right">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Bill & Payment:</span>
                      <span className="font-black text-gray-900 text-sm">
                        {sym}{trip.totalAmount.toLocaleString()}
                      </span>
                      <span className={`block text-[10px] font-bold uppercase ${
                        trip.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {trip.paymentStatus} ({sym}{trip.paidAmount} Paid)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  {/* Live Status Switcher (Tick Mark / Cross Mark) */}
                  <div className="grid grid-cols-2 gap-2">
                    {!isDone ? (
                      <button
                        onClick={() => handleMarkDelivered(trip)}
                        className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Deliver (Tick ✅)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenSkipModal(trip)}
                        className="py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                      >
                        <X className="w-4 h-4 stroke-[3]" />
                        <span>Change to Cross ❌</span>
                      </button>
                    )}

                    {!isSkipped ? (
                      <button
                        onClick={() => handleOpenSkipModal(trip)}
                        className="py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                      >
                        <X className="w-4 h-4 stroke-[3]" />
                        <span>Skip (Cross ❌)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMarkDelivered(trip)}
                        className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Deliver Abhi (✅)</span>
                      </button>
                    )}
                  </div>

                  {/* Secondary buttons: WhatsApp Slip, Edit, Delete */}
                  <div className="flex items-center justify-between gap-1 pt-1">
                    <button
                      onClick={() => openWhatsAppTruckSlip(trip, settings)}
                      className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Challan</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(trip)}
                      className="p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                      title="Edit Trip"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeleteId(trip.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Trip"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dispatch Truck / Container Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTrip ? 'Edit Truck / Bulk Dispatch' : 'Dispatch Water Truck / Container'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Top Row: Vehicle & Driver */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormInput
              label="Truck / Vehicle Number Plate"
              value={form.vehicleNumber}
              onChange={val => setForm(prev => ({ ...prev, vehicleNumber: val }))}
              placeholder="e.g. TKR-9012, LEB-5534"
              required
              error={errors.vehicleNumber}
            />

            <FormSelect
              label="Vehicle Type"
              value={form.vehicleType}
              onChange={val => setForm(prev => ({ ...prev, vehicleType: val as any }))}
              options={[
                { value: 'tanker', label: 'Water Tanker / Bowser (Liters)' },
                { value: 'container_truck', label: 'Container Carrier (Cans)' },
                { value: 'bulk_van', label: 'Suzuki / Delivery Van' },
                { value: 'other', label: 'Other Commercial Vehicle' },
              ]}
            />
          </div>

          {/* Driver & Delivery Boy Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Assign Driver / Delivery Boy
              </label>
              {deliveryBoys.length > 0 ? (
                <select
                  value={form.deliveryBoyId}
                  onChange={e => handleDriverSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none"
                >
                  <option value="">-- Choose Registered Rider / Driver --</option>
                  {deliveryBoys.map(boy => (
                    <option key={boy.id} value={boy.id}>
                      {boy.name} ({boy.phone})
                    </option>
                  ))}
                </select>
              ) : null}
              <div className="mt-1.5">
                <input
                  type="text"
                  value={form.driverName}
                  onChange={e => setForm(prev => ({ ...prev, driverName: e.target.value }))}
                  placeholder="Or enter custom driver name..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <FormInput
                label="Driver Phone Number"
                value={form.driverPhone}
                onChange={val => setForm(prev => ({ ...prev, driverPhone: val }))}
                placeholder="e.g. 03001234567"
              />
            </div>
          </div>

          {/* Client & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Commercial Client / Site
              </label>
              {customers.length > 0 && (
                <select
                  onChange={e => handleCustomerSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 mb-1.5"
                >
                  <option value="">-- Select from Existing Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.area ? `(${c.area})` : ''}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="text"
                value={form.clientName}
                onChange={e => setForm(prev => ({ ...prev, clientName: e.target.value }))}
                placeholder="Client / Company / Colony Name"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                required
              />
            </div>

            <div>
              <FormInput
                label="Client Phone / WhatsApp"
                value={form.clientPhone}
                onChange={val => setForm(prev => ({ ...prev, clientPhone: val }))}
                placeholder="e.g. 03211234567 (for WhatsApp slip)"
              />
            </div>
          </div>

          <FormInput
            label="Destination Site Address"
            value={form.destinationAddress}
            onChange={val => setForm(prev => ({ ...prev, destinationAddress: val }))}
            placeholder="Plot #, Street, Commercial Site or Plaza..."
          />

          {/* Supply Type & Quantities */}
          <div className="p-3 bg-sky-50/60 border border-sky-100 rounded-2xl space-y-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="supplyType"
                  value="tanker_water"
                  checked={form.supplyType === 'tanker_water'}
                  onChange={() => {
                    setForm(prev => ({ ...prev, supplyType: 'tanker_water', unitPrice: 1.5, quantitySupplied: 5000 }));
                    handleQtyPriceChange(5000, form.extraQuantity, 1.5);
                  }}
                  className="w-4 h-4 text-sky-600"
                />
                <span className="text-xs font-bold text-gray-800">Water Tanker (Liters)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="supplyType"
                  value="bulk_containers"
                  checked={form.supplyType === 'bulk_containers'}
                  onChange={() => {
                    setForm(prev => ({ ...prev, supplyType: 'bulk_containers', unitPrice: 80, quantitySupplied: 50 }));
                    handleQtyPriceChange(50, form.extraQuantity, 80);
                  }}
                  className="w-4 h-4 text-sky-600"
                />
                <span className="text-xs font-bold text-gray-800">Bulk Containers (Cans / Jars)</span>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  {form.supplyType === 'tanker_water' ? 'Liters Supplied' : 'Cans Supplied'}
                </label>
                <input
                  type="number"
                  value={form.quantitySupplied}
                  onChange={e => handleQtyPriceChange(Number(e.target.value), form.extraQuantity, form.unitPrice)}
                  min="1"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-700 uppercase mb-1">
                  Extra Quantity (+)
                </label>
                <input
                  type="number"
                  value={form.extraQuantity}
                  onChange={e => handleQtyPriceChange(form.quantitySupplied, Number(e.target.value), form.unitPrice)}
                  min="0"
                  className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-sm font-black text-amber-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  Rate / Unit ({sym})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.unitPrice}
                  onChange={e => handleQtyPriceChange(form.quantitySupplied, form.extraQuantity, Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-black"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-sky-100">
              <span className="text-sky-900 font-semibold">
                Total Supply: <strong>{(form.quantitySupplied + form.extraQuantity).toLocaleString()} {form.supplyType === 'tanker_water' ? 'Liters' : 'Cans'}</strong>
              </span>
              <span className="text-sky-950 font-black text-sm">
                Total Bill: {sym}{form.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Payment Status & Amount */}
          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="Payment Status"
              value={form.paymentStatus}
              onChange={val => {
                const s = val as any;
                setForm(prev => ({
                  ...prev,
                  paymentStatus: s,
                  paidAmount: s === 'paid' ? prev.totalAmount : s === 'unpaid' ? 0 : prev.paidAmount,
                }));
              }}
              options={[
                { value: 'paid', label: 'Full Paid (Cash/Bank)' },
                { value: 'partial', label: 'Partial Payment' },
                { value: 'unpaid', label: 'Credit / Udhar (Unpaid)' },
              ]}
            />

            <FormInput
              label={`Paid Amount (${sym})`}
              type="number"
              value={form.paidAmount}
              onChange={val => setForm(prev => ({ ...prev, paidAmount: Number(val) }))}
              max={form.totalAmount}
            />
          </div>

          {/* Date, Time & Dispatch Status */}
          <div className="grid grid-cols-3 gap-3">
            <FormInput
              label="Date"
              type="date"
              value={form.date}
              onChange={val => setForm(prev => ({ ...prev, date: val }))}
            />

            <FormInput
              label="Time"
              type="time"
              value={form.time}
              onChange={val => setForm(prev => ({ ...prev, time: val }))}
            />

            <FormSelect
              label="Dispatch Status"
              value={form.status}
              onChange={val => setForm(prev => ({ ...prev, status: val as any }))}
              options={[
                { value: 'delivered', label: '✅ Delivered (Done)' },
                { value: 'in_transit', label: '⏳ In Transit (On Route)' },
                { value: 'skipped', label: '❌ Failed / Cancelled' },
              ]}
            />
          </div>

          <FormTextarea
            label="Trip Notes / Special Instructions"
            value={form.notes}
            onChange={val => setForm(prev => ({ ...prev, notes: val }))}
            placeholder="Driver notes, route details, gate entry pass info..."
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingTrip ? 'Update Dispatch' : 'Confirm Dispatch'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Skip / Crossmark Reason Modal */}
      <Modal
        isOpen={!!skipModalTrip}
        onClose={() => setSkipModalTrip(null)}
        title="Mark as Failed / Not Supplied (Cross ❌)"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Record why water was not supplied for trip <strong>{skipModalTrip?.vehicleNumber}</strong> to <strong>{skipModalTrip?.clientName}</strong>:
          </p>

          <div className="space-y-2">
            {[
              'Site Closed / Gate Locked',
              'Client Cancelled Order / Mana Kiya',
              'Underground Tank Full / Zaroorat Nahi Thi',
              'Vehicle Breakdown / Mechanical Issue',
              'Road Block / Tanker Could Not Enter',
            ].map(reason => (
              <button
                key={reason}
                type="button"
                onClick={() => setSkipReason(reason)}
                className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold transition-all border ${
                  skipReason === reason
                    ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {reason}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Additional Details (Optional)
            </label>
            <input
              type="text"
              value={skipNotes}
              onChange={e => setSkipNotes(e.target.value)}
              placeholder="e.g. Call attempt at 11am, site guard refused..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setSkipModalTrip(null)}>
              Cancel
            </Button>
            <button
              type="button"
              onClick={handleConfirmSkip}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              Mark Not Supplied (❌)
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Bulk Supply Trip"
        message="Are you sure you want to permanently delete this trip record?"
        confirmText="Delete Trip"
        variant="danger"
      />
    </div>
  );
}
