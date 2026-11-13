import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  PageHeader, Card, Button, SearchInput, Modal, ConfirmDialog, 
  FormInput, FormSelect, FormTextarea, EmptyState 
} from '../components/ui';
import type { DeliveryBoy } from '../types';
import { 
  Users, UserPlus, Phone, Bike, Truck, Check, X, Clock, 
  MessageSquare, Edit, Trash2, MapPin, Target, Droplets, 
  DollarSign, AlertCircle, ExternalLink, ShieldCheck, Building2, RefreshCw,
  Send, Bell, CheckCircle2, Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function DeliveryBoys() {
  const navigate = useNavigate();
  const { 
    deliveryBoys, addDeliveryBoy, updateDeliveryBoy, deleteDeliveryBoy, 
    dispatchRouteToRider,
    customers, deliveries, settings, syncFromCloud, isSyncing
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBoy, setEditingBoy] = useState<DeliveryBoy | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const sym = settings.currencySymbol || 'Rs.';

  // Form State
  const [form, setForm] = useState({
    name: '',
    phone: '',
    username: '',
    password: '',
    vehicleType: 'bike' as DeliveryBoy['vehicleType'],
    vehicleNumber: '',
    assignedAreas: [] as string[],
    assignedBlocks: [] as string[],
    status: 'active' as 'active' | 'inactive',
    dailyTarget: 50,
    notes: '',
  });
  const [areaInput, setAreaInput] = useState('');
  const [blockInput, setBlockInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Collect all unique blocks from active customers
  const availableBlocks = useMemo(() => {
    const set = new Set<string>();
    customers.forEach(c => {
      if (c.block && c.block.trim()) set.add(c.block.trim());
    });
    return Array.from(set);
  }, [customers]);

  // Collect all unique areas from active customers
  const availableAreas = useMemo(() => {
    const set = new Set<string>();
    customers.forEach(c => {
      if (c.area && c.area.trim()) set.add(c.area.trim());
    });
    return Array.from(set);
  }, [customers]);

  // Route Dispatch & Notification State
  const currentDayName = format(new Date(), 'EEE');
  const [selectedDispatchDay, setSelectedDispatchDay] = useState<string>(currentDayName);
  const [dispatchBoy, setDispatchBoy] = useState<DeliveryBoy | null>(null);
  const [selectedRouteTarget, setSelectedRouteTarget] = useState<string>('all_assigned');
  const [customRouteNote, setCustomRouteNote] = useState<string>('Jaldi se water deliver kar ke register update karein!');

  const handleOpenDispatch = (boy: DeliveryBoy) => {
    setDispatchBoy(boy);
    setSelectedDispatchDay(currentDayName);
    const defaultTarget = boy.assignedBlocks?.[0] || boy.assignedAreas?.[0] || 'all_assigned';
    setSelectedRouteTarget(defaultTarget);
    setCustomRouteNote('Jaldi se water deliver kar ke register update karein!');
  };

  const dispatchRouteMetrics = useMemo(() => {
    if (!dispatchBoy) return { count: 0, bottles: 0, routeLabel: '' };

    const isAllAssigned = selectedRouteTarget === 'all_assigned';
    const assignedBlocks = dispatchBoy.assignedBlocks || [];
    const assignedAreas = dispatchBoy.assignedAreas || [];

    const matchedCustomers = customers.filter(c => {
      if (c.status !== 'active') return false;

      // Strict Day schedule filter
      const matchesDay = selectedDispatchDay === 'all'
        ? true
        : Boolean(c.deliveryDays && c.deliveryDays.includes(selectedDispatchDay));
      if (!matchesDay) return false;

      if (isAllAssigned) {
        if (c.assignedDeliveryBoyId === dispatchBoy.id) return true;
        if (c.assignedDeliveryBoyId && c.assignedDeliveryBoyId !== dispatchBoy.id) return false;
        if (c.block && assignedBlocks.includes(c.block)) return true;
        if (c.area && assignedAreas.includes(c.area)) return true;
        return false;
      } else {
        const matchesTarget = (c.block && c.block === selectedRouteTarget) || (c.area && c.area === selectedRouteTarget);
        if (!matchesTarget) return false;
        if (c.assignedDeliveryBoyId && c.assignedDeliveryBoyId !== dispatchBoy.id) return false;
        return true;
      }
    });

    const count = matchedCustomers.length;
    const bottles = matchedCustomers.reduce((sum, c) => sum + (c.quantity || 1), 0);
    const routeLabel = isAllAssigned
      ? (assignedBlocks.join(', ') || assignedAreas.join(', ') || 'All Assigned Areas')
      : selectedRouteTarget;

    return { count, bottles, routeLabel };
  }, [dispatchBoy, selectedRouteTarget, customers, selectedDispatchDay]);

  const handleSendWhatsAppNotification = () => {
    if (!dispatchBoy) return;
    const { count, bottles, routeLabel } = dispatchRouteMetrics;

    dispatchRouteToRider({
      riderId: dispatchBoy.id,
      riderName: dispatchBoy.name,
      riderPhone: dispatchBoy.phone,
      areaOrBlock: `${routeLabel || 'Assigned Route'} (${selectedDispatchDay === 'all' ? 'All Days' : selectedDispatchDay})`,
      customerCount: count,
      bottleCount: bottles,
      message: customRouteNote.trim(),
    });

    const cleanPhone = dispatchBoy.phone.replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.substring(1) : cleanPhone;

    const dayText = selectedDispatchDay === 'all' ? '' : ` [${selectedDispatchDay} Schedule]`;
    const textMsg = `Salam ${dispatchBoy.name} bhai! Aapka route "${routeLabel || 'Today Route'}"${dayText} assign ho gaya hai (${count} Customers, ~${bottles} Bottles).${customRouteNote.trim() ? ' Hidayat: ' + customRouteNote.trim() + '.' : ''} Apne mobile pe login kar ke deliver karein. - AquaBook`;

    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(textMsg)}`, '_blank');
    toast.success(`✅ ${dispatchBoy.name} ko WhatsApp route alert bhej diya gaya hai!`);
    setDispatchBoy(null);
  };

  const handleSendSmsNotification = () => {
    if (!dispatchBoy) return;
    const { count, bottles, routeLabel } = dispatchRouteMetrics;

    dispatchRouteToRider({
      riderId: dispatchBoy.id,
      riderName: dispatchBoy.name,
      riderPhone: dispatchBoy.phone,
      areaOrBlock: `${routeLabel || 'Assigned Route'} (${selectedDispatchDay === 'all' ? 'All Days' : selectedDispatchDay})`,
      customerCount: count,
      bottleCount: bottles,
      message: customRouteNote.trim(),
    });

    const dayText = selectedDispatchDay === 'all' ? '' : ` [${selectedDispatchDay} Schedule]`;
    const textMsg = `Salam ${dispatchBoy.name}! Route "${routeLabel}"${dayText} assign ho gaya (${count} Customers, ~${bottles} Bottles).${customRouteNote.trim() ? ' ' + customRouteNote.trim() : ''} Login kar ke delivery shuru karein. - AquaBook`;

    window.open(`sms:${dispatchBoy.phone}?body=${encodeURIComponent(textMsg)}`, '_self');
    toast.success(`✅ ${dispatchBoy.name} ke liye SMS route alert open ho gaya!`);
    setDispatchBoy(null);
  };

  const handleSaveInAppNotification = () => {
    if (!dispatchBoy) return;
    const { count, bottles, routeLabel } = dispatchRouteMetrics;

    dispatchRouteToRider({
      riderId: dispatchBoy.id,
      riderName: dispatchBoy.name,
      riderPhone: dispatchBoy.phone,
      areaOrBlock: `${routeLabel || 'Assigned Route'} (${selectedDispatchDay === 'all' ? 'All Days' : selectedDispatchDay})`,
      customerCount: count,
      bottleCount: bottles,
      message: customRouteNote.trim(),
    });

    toast.success(`✅ Route notify ho gaya! ${dispatchBoy.name} ke mobile login par alert show hoga.`);
    setDispatchBoy(null);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingBoy(null);
    setForm({
      name: '',
      phone: '',
      username: '',
      password: '',
      vehicleType: 'bike',
      vehicleNumber: '',
      assignedAreas: [],
      assignedBlocks: [],
      status: 'active',
      dailyTarget: 50,
      notes: '',
    });
    setAreaInput('');
    setBlockInput('');
    setErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (boy: DeliveryBoy) => {
    setEditingBoy(boy);
    setForm({
      name: boy.name,
      phone: boy.phone,
      username: boy.username || boy.phone.replace(/[^0-9]/g, ''),
      password: boy.password || '1234',
      vehicleType: boy.vehicleType || 'bike',
      vehicleNumber: boy.vehicleNumber || '',
      assignedAreas: boy.assignedAreas || [],
      assignedBlocks: boy.assignedBlocks || [],
      status: boy.status,
      dailyTarget: boy.dailyTarget || 50,
      notes: boy.notes || '',
    });
    setAreaInput('');
    setBlockInput('');
    setErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Delivery boy name is required';
    if (!form.phone.trim()) errs.phone = 'Mobile number is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const riderData = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      username: (form.username.trim() || form.phone.replace(/[^0-9]/g, '') || form.name.toLowerCase().replace(/\s+/g, '_')).toLowerCase(),
      password: form.password.trim() || '1234',
      vehicleType: form.vehicleType,
      vehicleNumber: form.vehicleNumber.trim(),
      assignedAreas: form.assignedAreas,
      assignedBlocks: form.assignedBlocks,
      status: form.status,
      dailyTarget: Number(form.dailyTarget) || 0,
      notes: form.notes.trim(),
    };

    if (editingBoy) {
      updateDeliveryBoy(editingBoy.id, riderData);
      toast.success(`${form.name} updated successfully!`);
    } else {
      addDeliveryBoy(riderData);
      toast.success(`Delivery boy ${form.name} added successfully! (PIN: ${riderData.password})`);
    }

    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteDeliveryBoy(deleteId);
    toast.success('Delivery boy removed.');
    setDeleteId(null);
  };

  const toggleAreaAssignment = (area: string) => {
    setForm(prev => {
      const exists = prev.assignedAreas.includes(area);
      return {
        ...prev,
        assignedAreas: exists ? prev.assignedAreas.filter(a => a !== area) : [...prev.assignedAreas, area],
      };
    });
  };

  const handleAddCustomArea = () => {
    const trimmed = areaInput.trim();
    if (!trimmed) return;
    if (!form.assignedAreas.includes(trimmed)) {
      setForm(prev => ({
        ...prev,
        assignedAreas: [...prev.assignedAreas, trimmed],
      }));
    }
    setAreaInput('');
  };

  const toggleBlockAssignment = (block: string) => {
    setForm(prev => {
      const current = prev.assignedBlocks || [];
      const exists = current.includes(block);
      return {
        ...prev,
        assignedBlocks: exists ? current.filter(b => b !== block) : [...current, block],
      };
    });
  };

  const handleAddCustomBlock = () => {
    const trimmed = blockInput.trim();
    if (!trimmed) return;
    setForm(prev => {
      const current = prev.assignedBlocks || [];
      if (!current.includes(trimmed)) {
        return {
          ...prev,
          assignedBlocks: [...current, trimmed],
        };
      }
      return prev;
    });
    setBlockInput('');
  };

  // Performance calculations for each delivery boy today
  const riderTodayStats = useMemo(() => {
    const map: Record<string, {
      deliveredCount: number;
      skippedCount: number;
      bottlesDelivered: number;
      extraBottles: number;
      cashCollected: number;
      pendingCustomers: number;
    }> = {};

    const todayDeliveries = deliveries.filter(d => d.date === todayStr);

    deliveryBoys.forEach(boy => {
      // Deliveries tagged to this boy
      const boyDeliveries = todayDeliveries.filter(d => 
        d.deliveryBoyId === boy.id || 
        (d.deliveryBoyName && d.deliveryBoyName.toLowerCase() === boy.name.toLowerCase())
      );

      const delivered = boyDeliveries.filter(d => d.status !== 'skipped');
      const skipped = boyDeliveries.filter(d => d.status === 'skipped');
      const bottles = delivered.reduce((sum, d) => sum + d.quantity, 0);
      const extra = delivered.reduce((sum, d) => sum + (d.extraBottles || 0), 0);
      const cash = delivered.reduce((sum, d) => sum + d.paidAmount, 0);

      // Estimated pending customers in this rider's assigned areas
      const assignedAreasSet = new Set(boy.assignedAreas || []);
      const boyCustomers = customers.filter(c => 
        c.status === 'active' && 
        ((c.assignedDeliveryBoyId && c.assignedDeliveryBoyId === boy.id) || (c.area && assignedAreasSet.has(c.area)))
      );
      const addressedCustomerIds = new Set(boyDeliveries.map(d => d.customerId));
      const pending = boyCustomers.filter(c => !addressedCustomerIds.has(c.id)).length;

      map[boy.id] = {
        deliveredCount: delivered.length,
        skippedCount: skipped.length,
        bottlesDelivered: bottles,
        extraBottles: extra,
        cashCollected: cash,
        pendingCustomers: pending,
      };
    });

    return map;
  }, [deliveryBoys, deliveries, customers, todayStr]);

  // Overall stats
  const totalRiders = deliveryBoys.length;
  const activeRiders = deliveryBoys.filter(b => b.status === 'active').length;
  const totalRiderBottlesToday = Object.values(riderTodayStats).reduce((sum, s) => sum + s.bottlesDelivered, 0);
  const totalRiderSkippedToday = Object.values(riderTodayStats).reduce((sum, s) => sum + s.skippedCount, 0);
  const totalRiderCashToday = Object.values(riderTodayStats).reduce((sum, s) => sum + s.cashCollected, 0);

  // Filtered riders
  const filteredBoys = useMemo(() => {
    return deliveryBoys.filter(boy => {
      const matchSearch = 
        boy.name.toLowerCase().includes(search.toLowerCase()) ||
        boy.phone.includes(search) ||
        (boy.vehicleNumber && boy.vehicleNumber.toLowerCase().includes(search.toLowerCase())) ||
        (boy.assignedAreas && boy.assignedAreas.some(a => a.toLowerCase().includes(search.toLowerCase())));
      
      const matchStatus = filterStatus === 'all' || boy.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [deliveryBoys, search, filterStatus]);

  const getVehicleIcon = (type: DeliveryBoy['vehicleType']) => {
    switch (type) {
      case 'loader_rickshaw':
      case 'bike':
        return <Bike className="w-5 h-5 text-sky-600" />;
      case 'van':
      case 'truck':
      case 'container_truck':
        return <Truck className="w-5 h-5 text-indigo-600" />;
      default:
        return <Bike className="w-5 h-5 text-sky-600" />;
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <PageHeader
        title="Delivery Boys & Route Staff"
        subtitle="Manage water delivery riders, assign route areas & monitor real-time deliveries (Tick/Cross)"
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
            <Button onClick={handleOpenAdd} icon={<UserPlus className="w-4 h-4" />}>
              Add Delivery Boy
            </Button>
          </div>
        }
      />

      {/* Top Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3.5 bg-sky-50/70 border-sky-100">
          <span className="text-[11px] font-semibold text-sky-700 uppercase">Total Riders</span>
          <p className="text-2xl font-black text-sky-950 mt-0.5">{totalRiders}</p>
          <span className="text-[10px] text-sky-600 font-semibold">{activeRiders} Active</span>
        </Card>

        <Card className="p-3.5 bg-emerald-50/70 border-emerald-100">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase">Delivered Today (✅)</span>
          <p className="text-2xl font-black text-emerald-600 mt-0.5">{totalRiderBottlesToday} <span className="text-xs font-normal">jars</span></p>
          <span className="text-[10px] text-emerald-700 font-semibold">Via delivery boys</span>
        </Card>

        <Card className="p-3.5 bg-rose-50/70 border-rose-100">
          <span className="text-[11px] font-semibold text-rose-700 uppercase">Missed / Skipped (❌)</span>
          <p className="text-2xl font-black text-rose-600 mt-0.5">{totalRiderSkippedToday} <span className="text-xs font-normal">stops</span></p>
          <span className="text-[10px] text-rose-700 font-semibold">Pani nahi gya</span>
        </Card>

        <Card className="p-3.5 bg-amber-50/70 border-amber-100">
          <span className="text-[11px] font-semibold text-amber-700 uppercase">Cash Collected</span>
          <p className="text-2xl font-black text-amber-900 mt-0.5">{sym}{totalRiderCashToday.toLocaleString()}</p>
          <span className="text-[10px] text-amber-700 font-semibold">Today's collection</span>
        </Card>

        <Card className="p-3.5 bg-indigo-50/70 border-indigo-100 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-indigo-700 uppercase">Live Route Link</span>
          <button
            onClick={() => navigate('/quick-delivery')}
            className="mt-2 w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-xs"
          >
            <span>Open Route</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-3.5">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search rider by name, phone, vehicle number, or assigned area..."
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatus === 'all' ? 'bg-sky-500 text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({deliveryBoys.length})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatus === 'active' ? 'bg-emerald-500 text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Active ({activeRiders})
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatus === 'inactive' ? 'bg-gray-700 text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Inactive ({totalRiders - activeRiders})
            </button>
          </div>
        </div>
      </Card>

      {/* Riders List */}
      {filteredBoys.length === 0 ? (
        <EmptyState
          icon={<Users className="w-10 h-10 text-sky-400" />}
          title="No Delivery Boys Found"
          description={
            deliveryBoys.length === 0
              ? 'Add your delivery boys/riders so you can assign routes and track who delivers water and who gets skipped!'
              : 'No delivery boys match your search filter.'
          }
          action={
            deliveryBoys.length === 0
              ? { label: 'Add First Delivery Boy', onClick: handleOpenAdd }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBoys.map(boy => {
            const stats = riderTodayStats[boy.id] || {
              deliveredCount: 0,
              skippedCount: 0,
              bottlesDelivered: 0,
              extraBottles: 0,
              cashCollected: 0,
              pendingCustomers: 0,
            };

            const target = boy.dailyTarget || 50;
            const progress = target > 0 ? Math.min(100, Math.round((stats.bottlesDelivered / target) * 100)) : 0;

            return (
              <Card 
                key={boy.id} 
                className={`p-4 transition-all border relative flex flex-col justify-between ${
                  boy.status === 'active' 
                    ? 'border-gray-200 bg-white hover:border-sky-300 hover:shadow-md' 
                    : 'border-gray-200 bg-gray-50/80 opacity-80'
                }`}
              >
                <div>
                  {/* Top Row: Name, Vehicle, Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                        {getVehicleIcon(boy.vehicleType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 text-base">{boy.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            boy.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {boy.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span>{boy.phone}</span>
                          {boy.vehicleNumber && (
                            <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.2 rounded">
                              {boy.vehicleNumber}
                            </span>
                          )}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" /> ID: {boy.username || boy.phone}
                          </span>
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-mono font-bold">
                            PIN: {boy.password || '1234'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(boy)}
                        className="p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                        title="Edit Delivery Boy"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(boy.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Delivery Boy"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Assigned Blocks & Areas Badges */}
                  <div className="space-y-2 mb-3">
                    {/* Blocks */}
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                        <Building2 className="w-3 h-3 text-sky-600" />
                        <span>Assigned Blocks (Route):</span>
                      </span>
                      {boy.assignedBlocks && boy.assignedBlocks.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {boy.assignedBlocks.map(block => (
                            <span 
                              key={block}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded-md text-[11px] font-bold"
                            >
                              🏢 {block}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">No specific block (All Blocks)</span>
                      )}
                    </div>

                    {/* Areas */}
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        <span>Assigned Areas:</span>
                      </span>
                      {boy.assignedAreas && boy.assignedAreas.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {boy.assignedAreas.map(area => (
                            <span 
                              key={area}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200/60 rounded-md text-[11px] font-semibold"
                            >
                              <MapPin className="w-2.5 h-2.5 text-sky-500" />
                              {area}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">All Areas</span>
                      )}
                    </div>
                  </div>

                  {/* Today's Live Performance Tracker */}
                  <div className="p-3 bg-gray-50/90 border border-gray-200/70 rounded-xl space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                      <span>Today's Delivery Score</span>
                      <span className="text-[11px] text-gray-500">Target: {target} Jars</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {/* 3 Metric Pills: Delivered (✅), Skipped (❌), Cash Collected */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                      <div className="bg-white p-1.5 rounded-lg border border-gray-100 shadow-2xs">
                        <span className="text-[10px] font-semibold text-emerald-700 flex items-center justify-center gap-0.5">
                          <Check className="w-3 h-3 stroke-[3]" /> Delivered
                        </span>
                        <p className="font-black text-sm text-emerald-600 mt-0.5">
                          {stats.bottlesDelivered} <span className="text-[10px] font-normal text-gray-500">bottles</span>
                        </p>
                        {stats.extraBottles > 0 && (
                          <span className="text-[9px] font-bold text-amber-600 block">
                            +{stats.extraBottles} Extra
                          </span>
                        )}
                      </div>

                      <div className="bg-white p-1.5 rounded-lg border border-gray-100 shadow-2xs">
                        <span className="text-[10px] font-semibold text-rose-700 flex items-center justify-center gap-0.5">
                          <X className="w-3 h-3 stroke-[3]" /> Skipped
                        </span>
                        <p className="font-black text-sm text-rose-600 mt-0.5">
                          {stats.skippedCount} <span className="text-[10px] font-normal text-gray-500">stops</span>
                        </p>
                        <span className="text-[9px] font-bold text-rose-500 block">
                          Pani Nahi Gya
                        </span>
                      </div>

                      <div className="bg-white p-1.5 rounded-lg border border-gray-100 shadow-2xs">
                        <span className="text-[10px] font-semibold text-indigo-700 block">
                          Cash Collected
                        </span>
                        <p className="font-black text-xs text-indigo-900 mt-0.5">
                          {sym}{stats.cashCollected.toLocaleString()}
                        </p>
                        <span className="text-[9px] font-medium text-gray-400 block">
                          Today
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-2 border-t border-gray-100 grid grid-cols-3 gap-2">
                  <a
                    href={`tel:${boy.phone}`}
                    className="py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Call</span>
                  </a>

                  <a
                    href={`https://wa.me/${boy.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </a>

                  <button
                    onClick={() => handleOpenDispatch(boy)}
                    className="py-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95"
                    title="Assign Route & Notify Rider"
                  >
                    <Send className="w-3 h-3" />
                    <span>Route Bhejein</span>
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Delivery Boy Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBoy ? 'Edit Delivery Boy / Staff' : 'Add New Delivery Boy / Staff'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Delivery Boy Name"
            value={form.name}
            onChange={val => setForm(prev => ({ ...prev, name: val }))}
            placeholder="e.g. Ali Ahmed, Kashif Khan"
            required
            error={errors.name}
          />

          <FormInput
            label="Mobile / WhatsApp Number"
            value={form.phone}
            onChange={val => setForm(prev => ({ ...prev, phone: val }))}
            placeholder="e.g. 03001234567"
            required
            error={errors.phone}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="Vehicle Type"
              value={form.vehicleType}
              onChange={val => setForm(prev => ({ ...prev, vehicleType: val as any }))}
              options={[
                { value: 'bike', label: 'Motorcycle / Bike' },
                { value: 'loader_rickshaw', label: 'Loader Rickshaw (Qingqi)' },
                { value: 'van', label: 'Delivery Van / Suzuki' },
                { value: 'truck', label: 'Water Truck' },
                { value: 'container_truck', label: 'Container Carrier' },
                { value: 'other', label: 'Other' },
              ]}
            />

            <FormInput
              label="Vehicle Number Plate"
              value={form.vehicleNumber}
              onChange={val => setForm(prev => ({ ...prev, vehicleNumber: val }))}
              placeholder="e.g. LEB-4819"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Daily Target (Bottles)"
              type="number"
              value={form.dailyTarget}
              onChange={val => setForm(prev => ({ ...prev, dailyTarget: Number(val) || 0 }))}
              min={1}
            />

            <FormSelect
              label="Status"
              value={form.status}
              onChange={val => setForm(prev => ({ ...prev, status: val as any }))}
              options={[
                { value: 'active', label: 'Active (On Duty)' },
                { value: 'inactive', label: 'Inactive (Off Duty)' },
              ]}
            />
          </div>

          {/* Rider App Login Credentials */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-emerald-900 block">Rider App Login Access</span>
                <span className="text-[11px] text-emerald-700">Yeh username/PIN delivery boy ko den taake wo Login kar sake</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput
                label="Login Username / Mobile"
                value={form.username}
                onChange={val => setForm(prev => ({ ...prev, username: val }))}
                placeholder="e.g. 03001234567 or ali_rider"
              />

              <FormInput
                label="Login Password / PIN"
                value={form.password}
                onChange={val => setForm(prev => ({ ...prev, password: val }))}
                placeholder="e.g. 1234"
              />
            </div>
          </div>

          {/* 1. Block Assignments (Kis Block me delivery karni hai) */}
          <div className="p-3.5 bg-gradient-to-r from-indigo-50/70 to-blue-50/70 border border-indigo-200/80 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <label className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                Assign Delivery Blocks (Kis Block me delivery karni hai)
              </label>
            </div>
            <p className="text-[11px] text-indigo-700">
              Select karein ke yeh delivery boy kin blocks me pani supply karega (e.g. R-Block, B-Block):
            </p>

            {availableBlocks.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2 max-h-32 overflow-y-auto p-2 bg-white rounded-xl border border-indigo-100">
                {availableBlocks.map(block => {
                  const isSelected = form.assignedBlocks?.includes(block);
                  return (
                    <button
                      key={block}
                      type="button"
                      onClick={() => toggleBlockAssignment(block)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      {isSelected ? <Check className="w-3 h-3 stroke-[3]" /> : <Building2 className="w-3 h-3 text-gray-400" />}
                      <span>🏢 {block}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom Block Add */}
            <div className="flex gap-2">
              <input
                type="text"
                value={blockInput}
                onChange={e => setBlockInput(e.target.value)}
                placeholder="Type block name, e.g. R-Block, Block B..."
                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomBlock();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddCustomBlock}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                + Add Block
              </button>
            </div>
          </div>

          {/* 2. Area Assignments (Kis Area / Society me delivery karni hai) */}
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Assign Delivery Areas / Societies (Kis Area me delivery karni hai)
              </label>
            </div>
            <p className="text-[11px] text-gray-500">
              Society ya Sector select karein (e.g. Gulberg, Bahria Town):
            </p>

            {availableAreas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2 max-h-32 overflow-y-auto p-2 bg-white rounded-xl border border-gray-200">
                {availableAreas.map(area => {
                  const isSelected = form.assignedAreas.includes(area);
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleAreaAssignment(area)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-white text-gray-700 border border-gray-200 hover:border-sky-300'
                      }`}
                    >
                      {isSelected ? <Check className="w-3 h-3 stroke-[3]" /> : <MapPin className="w-3 h-3 text-gray-400" />}
                      <span>{area}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom Area Add */}
            <div className="flex gap-2">
              <input
                type="text"
                value={areaInput}
                onChange={e => setAreaInput(e.target.value)}
                placeholder="Or type area / sector name..."
                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomArea();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddCustomArea}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold"
              >
                + Add Area
              </button>
            </div>
          </div>

          <FormTextarea
            label="Notes / Address"
            value={form.notes}
            onChange={val => setForm(prev => ({ ...prev, notes: val }))}
            placeholder="Emergency contact, residential address, or notes..."
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingBoy ? 'Update Delivery Boy' : 'Save Delivery Boy'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Remove Delivery Boy"
        message="Are you sure you want to remove this delivery boy? Historical delivery records will not be deleted."
        confirmText="Remove"
        variant="danger"
      />

      {/* Route Dispatch & Rider Notification Modal */}
      {dispatchBoy && (
        <Modal
          isOpen={!!dispatchBoy}
          onClose={() => setDispatchBoy(null)}
          title={`🚀 Assign Route & Notify: ${dispatchBoy.name}`}
          size="md"
        >
          <div className="space-y-4">
            {/* Rider Info Card */}
            <div className="p-3 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border border-sky-100 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{dispatchBoy.name}</h4>
                  <p className="text-xs text-gray-600 font-medium flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-sky-600" />
                    <span>{dispatchBoy.phone}</span>
                    {dispatchBoy.vehicleNumber && <span>• {dispatchBoy.vehicleNumber}</span>}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-sky-700 block">Rider Target</span>
                <span className="text-xs font-black text-sky-900">{dispatchBoy.dailyTarget || 50} Bottles</span>
              </div>
            </div>

            {/* Select Target Route (Area / Block) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Konse Area ya Block me deliver karne bhejna hai?
              </label>
              <select
                value={selectedRouteTarget}
                onChange={e => setSelectedRouteTarget(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
              >
                <option value="all_assigned">
                  📍 Sab Assigned Areas & Blocks ({dispatchBoy.assignedBlocks?.join(', ') || dispatchBoy.assignedAreas?.join(', ') || 'All Routes'})
                </option>
                
                {/* Rider's specifically assigned blocks */}
                {dispatchBoy.assignedBlocks && dispatchBoy.assignedBlocks.length > 0 && (
                  <optgroup label="🏢 Rider's Assigned Blocks">
                    {dispatchBoy.assignedBlocks.map(b => (
                      <option key={`blk_${b}`} value={b}>🏢 Block: {b}</option>
                    ))}
                  </optgroup>
                )}

                {/* Rider's specifically assigned areas */}
                {dispatchBoy.assignedAreas && dispatchBoy.assignedAreas.length > 0 && (
                  <optgroup label="📍 Rider's Assigned Areas">
                    {dispatchBoy.assignedAreas.map(a => (
                      <option key={`area_${a}`} value={a}>📍 Area: {a}</option>
                    ))}
                  </optgroup>
                )}

                {/* Other Available Blocks in system */}
                <optgroup label="🌐 Other Plant Blocks">
                  {availableBlocks
                    .filter(b => !dispatchBoy.assignedBlocks?.includes(b))
                    .map(b => (
                      <option key={`other_blk_${b}`} value={b}>🏢 Block: {b}</option>
                    ))}
                </optgroup>

                {/* Other Available Areas in system */}
                <optgroup label="🌐 Other Plant Areas">
                  {availableAreas
                    .filter(a => !dispatchBoy.assignedAreas?.includes(a))
                    .map(a => (
                      <option key={`other_area_${a}`} value={a}>📍 Area: {a}</option>
                    ))}
                </optgroup>
              </select>
            </div>

            {/* Day Schedule Selection (Mon - Sun) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                <span>Delivery Din (Day Schedule Filter):</span>
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDispatchDay(day)}
                    className={`py-1.5 px-1 rounded-xl text-xs font-bold transition-all text-center ${
                      selectedDispatchDay === day
                        ? 'bg-sky-600 text-white shadow-xs'
                        : currentDayName === day
                        ? 'bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedDispatchDay('all')}
                  className={`py-1.5 px-1 rounded-xl text-xs font-bold transition-all text-center ${
                    selectedDispatchDay === 'all'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {selectedDispatchDay === 'all'
                  ? 'Sab dinon ke customers count honge.'
                  : `Sirf wahi customers samne aayenge jinki delivery ${selectedDispatchDay} ko schedule hai.`}
              </p>
            </div>

            {/* Route Stats Summary Box */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center justify-around text-center">
              <div>
                <span className="text-[10px] font-bold text-amber-700 block uppercase">Kul Customers</span>
                <span className="text-base font-black text-amber-950">{dispatchRouteMetrics.count}</span>
              </div>
              <div className="w-px h-8 bg-amber-200" />
              <div>
                <span className="text-[10px] font-bold text-amber-700 block uppercase">Estimated Bottles</span>
                <span className="text-base font-black text-amber-950">~{dispatchRouteMetrics.bottles}</span>
              </div>
              <div className="w-px h-8 bg-amber-200" />
              <div>
                <span className="text-[10px] font-bold text-amber-700 block uppercase">Selected Target</span>
                <span className="text-xs font-bold text-amber-900 truncate max-w-[120px] block">
                  {dispatchRouteMetrics.routeLabel || 'Route'}
                </span>
              </div>
            </div>

            {/* Instruction Message */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Rider ke liye Hidayat / Custom Message (Optional):
              </label>
              <textarea
                value={customRouteNote}
                onChange={e => setCustomRouteNote(e.target.value)}
                placeholder="e.g. Jaldi se water deliver kar ke register update karein!"
                rows={2}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="text-[11px] font-bold text-gray-500 mb-1">
                Rider ko notification bhejain:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* 1. WhatsApp Notification */}
                <button
                  type="button"
                  onClick={handleSendWhatsAppNotification}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send WhatsApp Alert</span>
                </button>

                {/* 2. SMS Notification */}
                <button
                  type="button"
                  onClick={handleSendSmsNotification}
                  className="w-full py-2.5 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Send SMS Alert</span>
                </button>
              </div>

              {/* 3. In-App Notification (without opening WA/SMS) */}
              <button
                type="button"
                onClick={handleSaveInAppNotification}
                className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Bell className="w-3.5 h-3.5 text-indigo-600" />
                <span>Save In-App Route Notification (Rider App Alert)</span>
              </button>

              {/* Secondary link: If owner wants to view route themselves */}
              <div className="pt-2 flex items-center justify-between text-xs text-gray-500">
                <button
                  type="button"
                  onClick={() => setDispatchBoy(null)}
                  className="text-gray-500 hover:text-gray-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const boy = dispatchBoy;
                    setDispatchBoy(null);
                    let url = `/quick-delivery?rider=${boy.id}`;
                    if (selectedRouteTarget !== 'all_assigned') {
                      url += `&block=${encodeURIComponent(selectedRouteTarget)}`;
                    }
                    navigate(url);
                  }}
                  className="text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1"
                >
                  <span>Open Route View Screen</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
