import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader, Card, Button, SearchInput, EmptyState, Modal } from '../components/ui';
import { 
  openWhatsAppDeliverySlip, openSmsDeliverySlip, getCustomerBalance 
} from '../services/dataService';
import { getAuth } from '../services/adminService';
import type { Customer, Delivery } from '../types';
import { 
  Truck, CheckCircle2, Droplets, RotateCcw, MessageSquare, 
  Search, Calendar, Filter, Clock, Plus, Minus, MapPin, 
  Phone, Sparkles, Check, CheckSquare, Square, X, Users,
  Bike, AlertCircle, RefreshCw, Building2, ShieldCheck, Bell, Zap
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function QuickDelivery() {
  const [searchParams] = useSearchParams();
  const riderParam = searchParams.get('rider');
  const blockParam = searchParams.get('block');
  const areaParam = searchParams.get('area');

  const { 
    customers, deliveries, addDelivery, updateDelivery, 
    recordSkippedDelivery, deliveryBoys, settings,
    getActiveRouteForRider, acknowledgeRouteDispatch
  } = useApp();

  const auth = getAuth();
  const isRiderLoggedIn = auth.userType === 'delivery_boy';
  const loggedInRiderId = auth.deliveryBoyId || '';

  const activeRouteNotification = useMemo(() => {
    if (!isRiderLoggedIn || !loggedInRiderId) return null;
    return getActiveRouteForRider(loggedInRiderId);
  }, [isRiderLoggedIn, loggedInRiderId, getActiveRouteForRider]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState(areaParam || 'all');
  const [blockFilter, setBlockFilter] = useState(blockParam || 'all');
  const [statusTab, setStatusTab] = useState<'all' | 'delivered' | 'skipped' | 'pending'>('all');
  const [selectedRiderId, setSelectedRiderId] = useState<string>(
    isRiderLoggedIn && loggedInRiderId ? loggedInRiderId : (riderParam || 'all')
  );

  useEffect(() => {
    if (blockParam) setBlockFilter(blockParam);
    if (areaParam) setAreaFilter(areaParam);
  }, [blockParam, areaParam]);

  useEffect(() => {
    if (isRiderLoggedIn && loggedInRiderId) {
      setSelectedRiderId(loggedInRiderId);
      const riderObj = deliveryBoys.find(b => b.id === loggedInRiderId);
      if (riderObj?.assignedBlocks && riderObj.assignedBlocks.length > 0 && blockFilter === 'all' && !blockParam) {
        setBlockFilter(riderObj.assignedBlocks[0]);
      }
      if (riderObj?.assignedAreas && riderObj.assignedAreas.length > 0 && areaFilter === 'all' && !areaParam) {
        setAreaFilter(riderObj.assignedAreas[0]);
      }
    } else if (riderParam) {
      setSelectedRiderId(riderParam);
    }
  }, [riderParam, isRiderLoggedIn, loggedInRiderId, deliveryBoys, blockParam, areaParam]);

  // Multi-Customer Selection State
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [bulkQtyMode, setBulkQtyMode] = useState<'default' | 'custom'>('default');
  const [bulkCustomQty, setBulkCustomQty] = useState(1);
  const [bulkPaymentStatus, setBulkPaymentStatus] = useState<'unpaid' | 'paid'>('unpaid');
  const [bulkRiderId, setBulkRiderId] = useState<string>(isRiderLoggedIn ? loggedInRiderId : '');

  // Customer state for rapid entry (qty, extraBottles, emptyReceived, emptyReturned, paymentStatus, riderId)
  const [entries, setEntries] = useState<Record<string, {
    quantity: number;
    extraBottles: number;
    emptyReceived: number;
    emptyReturned: boolean;
    paymentStatus: 'paid' | 'unpaid';
    riderId: string;
  }>>({});

  // Skip / Crossmark Modal State
  const [skipCustomer, setSkipCustomer] = useState<Customer | null>(null);
  const [skipReasonPreset, setSkipReasonPreset] = useState('Ghar Band Tha (Door Locked)');
  const [customSkipReason, setCustomSkipReason] = useState('');

  // Bulk Skip / Multi-Customer Crossmark State
  const [isBulkSkipModalOpen, setIsBulkSkipModalOpen] = useState(false);
  const [bulkSkipReasonPreset, setBulkSkipReasonPreset] = useState('Customer Ny Mana Kiya (Refused / Aaj Nahi Chahiye)');
  const [bulkCustomSkipReason, setBulkCustomSkipReason] = useState('');

  // Extra Bottle Modal State (for already delivered customers)
  const [extraModalData, setExtraModalData] = useState<{
    customer: Customer;
    delivery: Delivery;
  } | null>(null);
  const [extraCountToAdd, setExtraCountToAdd] = useState<number>(1);
  const [extraEmptyReturned, setExtraEmptyReturned] = useState<boolean>(true);
  const [extraPaymentReceived, setExtraPaymentReceived] = useState<boolean>(false);
  const [extraRiderId, setExtraRiderId] = useState<string>('');
  const [extraCustomNote, setExtraCustomNote] = useState<string>('');

  // Get distinct areas
  const areas = useMemo(() => {
    if (isRiderLoggedIn && selectedRider) {
      const set = new Set<string>();
      if (selectedRider.assignedAreas) {
        selectedRider.assignedAreas.forEach(a => a.trim() && set.add(a.trim()));
      }
      customers.forEach(c => {
        if (
          (c.assignedDeliveryBoyId === loggedInRiderId || (!c.assignedDeliveryBoyId && selectedRider.assignedAreas?.includes(c.area))) &&
          c.area?.trim()
        ) {
          set.add(c.area.trim());
        }
      });
      return Array.from(set);
    }
    const set = new Set<string>();
    customers.forEach(c => {
      if (c.area && c.area.trim()) set.add(c.area.trim());
    });
    return Array.from(set);
  }, [customers, isRiderLoggedIn, selectedRider, loggedInRiderId]);

  // Get distinct blocks
  const distinctBlocks = useMemo(() => {
    if (isRiderLoggedIn && selectedRider) {
      const set = new Set<string>();
      if (selectedRider.assignedBlocks) {
        selectedRider.assignedBlocks.forEach(b => b.trim() && set.add(b.trim()));
      }
      customers.forEach(c => {
        if (
          (c.assignedDeliveryBoyId === loggedInRiderId || (!c.assignedDeliveryBoyId && selectedRider.assignedBlocks?.includes(c.block))) &&
          c.block?.trim()
        ) {
          set.add(c.block.trim());
        }
      });
      return Array.from(set);
    }
    const set = new Set<string>();
    customers.forEach(c => {
      if (c.block && c.block.trim()) set.add(c.block.trim());
      else if (c.area && c.area.trim()) set.add(c.area.trim());
    });
    return Array.from(set);
  }, [customers, isRiderLoggedIn, selectedRider, loggedInRiderId]);

  // Deliveries on selected date
  const todayDeliveriesMap = useMemo(() => {
    const map: Record<string, Delivery> = {};
    deliveries.filter(d => d.date === selectedDate).forEach(d => {
      map[d.customerId] = d;
    });
    return map;
  }, [deliveries, selectedDate]);

  // Active delivery boy info
  const selectedRider = useMemo(() => {
    if (selectedRiderId === 'all') return null;
    return deliveryBoys.find(b => b.id === selectedRiderId) || null;
  }, [deliveryBoys, selectedRiderId]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    const list = customers.filter(c => {
      if (c.status !== 'active') return false;

      // Rider filter
      if (isRiderLoggedIn) {
        // Strict Isolation: A logged-in rider (e.g. Ali) can ONLY see their own route and customers
        const assignedAreas = selectedRider?.assignedAreas || [];
        const assignedBlocks = selectedRider?.assignedBlocks || [];
        const hasDeliveredByThisRider = todayDeliveriesMap[c.id]?.deliveryBoyId === loggedInRiderId;
        const isDirectlyAssigned = c.assignedDeliveryBoyId === loggedInRiderId;

        // If customer is explicitly assigned to another rider, completely exclude
        if (c.assignedDeliveryBoyId && c.assignedDeliveryBoyId !== loggedInRiderId && !hasDeliveredByThisRider) {
          return false;
        }

        // If rider has assigned blocks or areas, customer must match them unless directly assigned or already delivered
        if (assignedAreas.length > 0 || assignedBlocks.length > 0) {
          const matchArea = c.area && assignedAreas.includes(c.area);
          const matchBlock = c.block && assignedBlocks.includes(c.block);
          if (!matchArea && !matchBlock && !isDirectlyAssigned && !hasDeliveredByThisRider) {
            return false;
          }
        }
      } else if (selectedRiderId !== 'all') {
        const assignedAreas = selectedRider?.assignedAreas || [];
        const assignedBlocks = selectedRider?.assignedBlocks || [];
        const hasSpecificRestrictions = assignedAreas.length > 0 || assignedBlocks.length > 0;

        // If customer is explicitly assigned to ANOTHER rider, exclude from this rider's default route unless searched
        const assignedToOtherRider = c.assignedDeliveryBoyId && c.assignedDeliveryBoyId !== selectedRiderId;
        const hasDeliveredByThisRider = todayDeliveriesMap[c.id]?.deliveryBoyId === selectedRiderId;

        if (assignedToOtherRider && !hasDeliveredByThisRider && !search.trim()) {
          return false;
        }

        // If rider has specific area or block constraints set by owner, respect them unless searching
        if (hasSpecificRestrictions && !search.trim()) {
          const matchArea = c.area && assignedAreas.includes(c.area);
          const matchBlock = c.block && assignedBlocks.includes(c.block);
          const isDirectlyAssigned = c.assignedDeliveryBoyId === selectedRiderId;
          if (!matchArea && !matchBlock && !isDirectlyAssigned && !hasDeliveredByThisRider) {
            return false;
          }
        }
      }

      // Search filter (name, phone number, address, block, building, houseNo)
      const cleanSearch = search.trim().toLowerCase();
      const cleanNum = search.replace(/[^0-9]/g, '');
      const custPhoneClean = (c.phone || '').replace(/[^0-9]/g, '');

      const matchSearch = !cleanSearch ||
        (c.name && c.name.toLowerCase().includes(cleanSearch)) ||
        (cleanNum.length >= 3 && custPhoneClean.includes(cleanNum)) ||
        (c.phone && c.phone.toLowerCase().includes(cleanSearch)) ||
        (c.address && c.address.toLowerCase().includes(cleanSearch)) ||
        (c.area && c.area.toLowerCase().includes(cleanSearch)) ||
        (c.block && c.block.toLowerCase().includes(cleanSearch)) ||
        (c.building && c.building.toLowerCase().includes(cleanSearch)) ||
        (c.houseNo && c.houseNo.toLowerCase().includes(cleanSearch));

      // Area filter
      const matchArea = areaFilter === 'all' || c.area === areaFilter;

      // Block filter
      const matchBlock = blockFilter === 'all' || c.block === blockFilter || (!c.block && c.area === blockFilter);

      // Status Tab filter
      const delivery = todayDeliveriesMap[c.id];
      const isDelivered = delivery && delivery.status !== 'skipped';
      const isSkipped = delivery && delivery.status === 'skipped';
      const isPending = !delivery;

      let matchTab = true;
      if (statusTab === 'delivered') matchTab = isDelivered;
      else if (statusTab === 'skipped') matchTab = isSkipped;
      else if (statusTab === 'pending') matchTab = isPending;

      return matchSearch && matchArea && matchBlock && matchTab;
    });

    // Sequence houses logically by Building -> Floor -> House No
    list.sort((a, b) => {
      const blkA = (a.block || a.area || '').localeCompare(b.block || b.area || '');
      if (blkA !== 0 && blockFilter === 'all') return blkA;
      const bldA = (a.building || '').localeCompare(b.building || '');
      if (bldA !== 0) return bldA;
      const flrA = (a.floor || '').localeCompare(b.floor || '');
      if (flrA !== 0) return flrA;
      const hseA = (a.houseNo || a.address || '').localeCompare(b.houseNo || b.address || '');
      if (hseA !== 0) return hseA;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [customers, search, areaFilter, blockFilter, statusTab, selectedRiderId, selectedRider, todayDeliveriesMap]);

  // Pending customers on current filtered route
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
    const rider = deliveryBoys.find(b => b.id === bulkRiderId) || selectedRider;

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
        regularQuantity: qty,
        extraBottles: 0,
        emptyBottlesReceived: qty,
        waterType: customer.waterType || 'Regular Jar',
        pricePerUnit: unitPrice,
        totalPrice,
        paymentStatus: bulkPaymentStatus,
        paidAmount: bulkPaymentStatus === 'paid' ? totalPrice : 0,
        status: 'delivered',
        deliveryBoyId: rider?.id,
        deliveryBoyName: rider?.name,
        notes: `Route Delivery by ${rider?.name || 'Staff'}`,
      });
      count++;
    });

    toast.success(`Mubarak! ${count} customers ko ek sath delivery record ho gayi!`);
    setSelectedCustomerIds([]);
  };

  // Open Bulk Skip Modal (Pani Nahi Gya for multiple selected)
  const handleOpenBulkSkipModal = () => {
    if (selectedCustomerIds.length === 0) {
      toast.error('Baraye meharbani pehle customers select karein.');
      return;
    }
    setBulkSkipReasonPreset('Customer Ny Mana Kiya (Refused / Aaj Nahi Chahiye)');
    setBulkCustomSkipReason('');
    setIsBulkSkipModalOpen(true);
  };

  // Confirm Bulk Skip / Cross Mark (❌ Pani Nahi Gya)
  const handleConfirmBulkSkip = () => {
    if (selectedCustomerIds.length === 0) return;
    const reason = bulkCustomSkipReason.trim()
      ? `${bulkSkipReasonPreset} - ${bulkCustomSkipReason.trim()}`
      : bulkSkipReasonPreset;
    const nowTime = format(new Date(), 'HH:mm');
    const rider = deliveryBoys.find(b => b.id === bulkRiderId) || selectedRider;
    let count = 0;

    selectedCustomerIds.forEach(id => {
      const customer = customers.find(c => c.id === id);
      if (!customer) return;

      recordSkippedDelivery({
        customerId: customer.id,
        customerName: customer.name,
        date: selectedDate,
        time: nowTime,
        skipReason: reason,
        deliveryBoyId: rider?.id,
        deliveryBoyName: rider?.name,
        notes: `Pani Nahi Gya (Bulk): ${reason}`,
      });
      count++;
    });

    toast.error(`${count} customers ko Pani Nahi Gya (❌ Cross Mark) record ho gaya!`);
    setIsBulkSkipModalOpen(false);
    setSelectedCustomerIds([]);
  };

  // State getter with defaults
  const getEntry = (c: Customer) => {
    if (entries[c.id]) return entries[c.id];
    const defaultRider = c.assignedDeliveryBoyId || (isRiderLoggedIn ? loggedInRiderId : (selectedRiderId !== 'all' ? selectedRiderId : ''));
    return {
      quantity: c.quantity || 1,
      extraBottles: 0,
      emptyReceived: c.quantity || 1,
      emptyReturned: true,
      paymentStatus: 'unpaid' as const,
      riderId: defaultRider,
    };
  };

  const updateEntry = (
    customerId: string, 
    field: 'quantity' | 'extraBottles' | 'emptyReceived' | 'emptyReturned' | 'paymentStatus' | 'riderId', 
    val: any
  ) => {
    setEntries(prev => {
      const current = prev[customerId] || getEntry(customers.find(c => c.id === customerId)!);
      return {
        ...prev,
        [customerId]: {
          ...current,
          [field]: val,
        },
      };
    });
  };

  // Deliver action (Tick Mark ✅)
  const handleDeliver = (customer: Customer) => {
    const entry = getEntry(customer);
    const unitPrice = customer.pricePerUnit || settings.defaultWaterPrice || 30;
    const regularQty = entry.quantity;
    const extraQty = Math.max(0, entry.extraBottles || 0);
    const totalQty = regularQty + extraQty;
    const totalPrice = totalQty * unitPrice;
    const nowTime = format(new Date(), 'HH:mm');
    const emptyCans = entry.emptyReturned ? Math.max(0, entry.emptyReceived) : 0;

    const rider = deliveryBoys.find(b => b.id === entry.riderId) || selectedRider;

    // Check if delivery already exists (e.g. was previously skipped)
    const existing = todayDeliveriesMap[customer.id];
    let newDelivery: Delivery;

    if (existing) {
      newDelivery = updateDelivery(existing.id, {
        quantity: totalQty,
        regularQuantity: regularQty,
        extraBottles: extraQty,
        emptyBottlesReceived: emptyCans,
        emptyReturned: entry.emptyReturned,
        waterType: customer.waterType || 'Regular Jar',
        pricePerUnit: unitPrice,
        totalPrice,
        paymentStatus: entry.paymentStatus,
        paidAmount: entry.paymentStatus === 'paid' ? totalPrice : 0,
        status: 'delivered',
        skipReason: undefined,
        deliveryBoyId: rider?.id,
        deliveryBoyName: rider?.name,
        notes: extraQty > 0 ? `Delivered with ${extraQty} extra bottles` : `Route Delivery`,
      })!;
    } else {
      newDelivery = addDelivery({
        customerId: customer.id,
        customerName: customer.name,
        date: selectedDate,
        time: nowTime,
        quantity: totalQty,
        regularQuantity: regularQty,
        extraBottles: extraQty,
        emptyBottlesReceived: emptyCans,
        emptyReturned: entry.emptyReturned,
        waterType: customer.waterType || 'Regular Jar',
        pricePerUnit: unitPrice,
        totalPrice,
        paymentStatus: entry.paymentStatus,
        paidAmount: entry.paymentStatus === 'paid' ? totalPrice : 0,
        status: 'delivered',
        deliveryBoyId: rider?.id,
        deliveryBoyName: rider?.name,
        notes: extraQty > 0 ? `Delivered with ${extraQty} extra bottles` : `Route Delivery`,
      });
    }

    const extraNotice = extraQty > 0 ? ` (+${extraQty} Extra 🍾)` : '';
    const emptyNotice = entry.emptyReturned ? `(Khali Can: ${emptyCans} ✅)` : `(Khali Can Nahi Mila ❌)`;
    toast.success(`Delivered ${totalQty} bottles to ${customer.name}! ${extraNotice} ${emptyNotice} (Tick ✅)`);

    if (settings.notificationsEnabled) {
      const bal = getCustomerBalance(customer.id);
      openWhatsAppDeliverySlip(newDelivery, customer, bal, settings);
    }
  };

  // Open Skip / Crossmark Modal
  const handleOpenSkipModal = (customer: Customer) => {
    setSkipCustomer(customer);
    setSkipReasonPreset('Ghar Band Tha (Door Locked)');
    setCustomSkipReason('');
  };

  // Confirm Skip / Cross Mark (❌ Pani Nahi Gya)
  const handleConfirmSkip = () => {
    if (!skipCustomer) return;
    const reason = customSkipReason.trim() ? `${skipReasonPreset} - ${customSkipReason.trim()}` : skipReasonPreset;
    const nowTime = format(new Date(), 'HH:mm');
    const entry = getEntry(skipCustomer);
    const rider = deliveryBoys.find(b => b.id === entry.riderId) || selectedRider;

    recordSkippedDelivery({
      customerId: skipCustomer.id,
      customerName: skipCustomer.name,
      date: selectedDate,
      time: nowTime,
      skipReason: reason,
      deliveryBoyId: rider?.id,
      deliveryBoyName: rider?.name,
      notes: `Pani Nahi Gya: ${reason}`,
    });

    toast.error(`Pani Nahi Gya (❌ Cross Mark) recorded for ${skipCustomer.name}: ${reason}`);
    setSkipCustomer(null);
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

  // Quick Add Extra Bottles to an already delivered customer (1-tap chip)
  const handleQuickAddExtraBottles = (
    customer: Customer,
    delivery: Delivery,
    extraToAdd: number,
    emptyReturned: boolean = true,
    paymentReceived: boolean = false
  ) => {
    const unitPrice = delivery.pricePerUnit || customer.pricePerUnit || settings.defaultWaterPrice || 30;
    const currentTotal = delivery.quantity || 0;
    const currentExtra = delivery.extraBottles || 0;
    const currentRegular = delivery.regularQuantity !== undefined 
      ? delivery.regularQuantity 
      : Math.max(0, currentTotal - currentExtra);
    const newTotalQty = currentTotal + extraToAdd;
    const newExtraBottles = currentExtra + extraToAdd;
    const newTotalPrice = newTotalQty * unitPrice;
    const currentEmpty = delivery.emptyBottlesReceived || 0;
    const newEmpty = emptyReturned ? (currentEmpty + extraToAdd) : currentEmpty;
    const nowTime = format(new Date(), 'HH:mm');

    const updated = updateDelivery(delivery.id, {
      quantity: newTotalQty,
      regularQuantity: currentRegular,
      extraBottles: newExtraBottles,
      totalPrice: newTotalPrice,
      emptyBottlesReceived: newEmpty,
      emptyReturned: emptyReturned ? true : delivery.emptyReturned,
      paidAmount: paymentReceived ? (delivery.paidAmount + (extraToAdd * unitPrice)) : delivery.paidAmount,
      paymentStatus: paymentReceived 
        ? ((delivery.paidAmount + (extraToAdd * unitPrice)) >= newTotalPrice ? 'paid' : 'partial')
        : (delivery.paymentStatus || 'unpaid'),
      notes: `${delivery.notes || ''} | +${extraToAdd} Extra Bottle added at ${nowTime}`.trim(),
    });

    toast.success(`+${extraToAdd} Extra Bottle save ho gayi! Total: ${newTotalQty} Bottles (${sym}${newTotalPrice})`);
  };

  // Reset extra bottles back to standard regular quota
  const handleResetExtraBottlesDirect = (customer: Customer, delivery: Delivery) => {
    const unitPrice = delivery.pricePerUnit || customer.pricePerUnit || settings.defaultWaterPrice || 30;
    const regularQty = delivery.regularQuantity !== undefined 
      ? delivery.regularQuantity 
      : Math.max(1, customer.quantity || 1);
    const newTotalPrice = regularQty * unitPrice;
    
    updateDelivery(delivery.id, {
      quantity: regularQty,
      extraBottles: 0,
      totalPrice: newTotalPrice,
      notes: `Reset extra bottles to ${regularQty} regular bottles`,
    });
    
    toast.success(`Extra bottles reset ho gayi! Total: ${regularQty} Regular Bottles.`);
  };

  // Open Full Extra Bottle Modal
  const handleOpenExtraModal = (customer: Customer, delivery: Delivery) => {
    setExtraModalData({ customer, delivery });
    setExtraCountToAdd(1);
    setExtraEmptyReturned(true);
    setExtraPaymentReceived(false);
    setExtraRiderId(delivery.deliveryBoyId || loggedInRiderId || '');
    setExtraCustomNote('');
  };

  // Confirm Full Extra Bottle Modal
  const handleConfirmExtraModal = () => {
    if (!extraModalData) return;
    const { customer, delivery } = extraModalData;
    const extraToAdd = Math.max(1, extraCountToAdd);
    const unitPrice = delivery.pricePerUnit || customer.pricePerUnit || settings.defaultWaterPrice || 30;
    const currentTotal = delivery.quantity || 0;
    const currentExtra = delivery.extraBottles || 0;
    const currentRegular = delivery.regularQuantity !== undefined 
      ? delivery.regularQuantity 
      : Math.max(0, currentTotal - currentExtra);
    const newTotalQty = currentTotal + extraToAdd;
    const newExtraBottles = currentExtra + extraToAdd;
    const newTotalPrice = newTotalQty * unitPrice;
    const currentEmpty = delivery.emptyBottlesReceived || 0;
    const newEmpty = extraEmptyReturned ? (currentEmpty + extraToAdd) : currentEmpty;
    const nowTime = format(new Date(), 'HH:mm');
    const rider = deliveryBoys.find(b => b.id === extraRiderId) || selectedRider;

    const updated = updateDelivery(delivery.id, {
      quantity: newTotalQty,
      regularQuantity: currentRegular,
      extraBottles: newExtraBottles,
      totalPrice: newTotalPrice,
      emptyBottlesReceived: newEmpty,
      emptyReturned: extraEmptyReturned ? true : delivery.emptyReturned,
      paidAmount: extraPaymentReceived ? (delivery.paidAmount + (extraToAdd * unitPrice)) : delivery.paidAmount,
      paymentStatus: extraPaymentReceived 
        ? ((delivery.paidAmount + (extraToAdd * unitPrice)) >= newTotalPrice ? 'paid' : 'partial')
        : (delivery.paymentStatus || 'unpaid'),
      deliveryBoyId: rider?.id || delivery.deliveryBoyId,
      deliveryBoyName: rider?.name || delivery.deliveryBoyName,
      notes: `${delivery.notes || ''} | +${extraToAdd} Extra Bottle (${nowTime}${extraCustomNote ? ': ' + extraCustomNote : ''})`.trim(),
    });

    toast.success(`+${extraToAdd} Extra Bottle save ho gayi! Total: ${newTotalQty} Bottles (${sym}${newTotalPrice})`);

    setExtraModalData(null);
  };

  // Route statistics for selected date (strictly scoped to this rider if logged in or selected)
  const activeRiderId = isRiderLoggedIn ? loggedInRiderId : (selectedRiderId !== 'all' ? selectedRiderId : null);

  const routeTargetCustomers = useMemo(() => {
    if (!activeRiderId) {
      return customers.filter(c => c.status === 'active');
    }
    const rider = deliveryBoys.find(b => b.id === activeRiderId);
    const assignedAreas = rider?.assignedAreas || [];
    const assignedBlocks = rider?.assignedBlocks || [];

    return customers.filter(c => {
      if (c.status !== 'active') return false;
      if (c.assignedDeliveryBoyId === activeRiderId) return true;
      if (c.assignedDeliveryBoyId && c.assignedDeliveryBoyId !== activeRiderId) return false;
      if (assignedBlocks.length > 0 && c.block && assignedBlocks.includes(c.block)) return true;
      if (assignedAreas.length > 0 && c.area && assignedAreas.includes(c.area)) return true;
      if (assignedBlocks.length === 0 && assignedAreas.length === 0 && !c.assignedDeliveryBoyId) return true;
      return false;
    });
  }, [customers, activeRiderId, deliveryBoys]);

  const routeCustomerIds = useMemo(() => new Set(routeTargetCustomers.map(c => c.id)), [routeTargetCustomers]);

  const routeDeliveries = useMemo(() => {
    return deliveries.filter(d => {
      if (d.date !== selectedDate) return false;
      if (activeRiderId) {
        return d.deliveryBoyId === activeRiderId || routeCustomerIds.has(d.customerId);
      }
      return true;
    });
  }, [deliveries, selectedDate, activeRiderId, routeCustomerIds]);

  const totalOnRoute = routeTargetCustomers.length;
  const deliveredList = routeDeliveries.filter(d => d.status !== 'skipped');
  const skippedList = routeDeliveries.filter(d => d.status === 'skipped');
  const deliveredCount = deliveredList.length;
  const skippedCount = skippedList.length;
  const totalBottlesToday = deliveredList.reduce((sum, d) => sum + d.quantity, 0);
  const totalExtraBottlesToday = deliveredList.reduce((sum, d) => sum + (d.extraBottles || 0), 0);
  const pendingCount = Math.max(0, totalOnRoute - deliveredCount - skippedCount);

  const sym = settings.currencySymbol || 'Rs.';

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <PageHeader
        title="Today's Route Khatta & Delivery Register"
        subtitle="Track water deliveries with live Tick (✅) & Cross (❌ Pani Nahi Gya) marks + Extra Bottles on-demand"
        action={
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-gray-200 shadow-xs text-xs font-bold">
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

      {/* Rider Urgent Route Alert Banner */}
      {isRiderLoggedIn && activeRouteNotification && (
        <div className="bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-700 text-white p-4 rounded-2xl shadow-lg border border-sky-400/40 relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 text-white shadow-inner">
                <Bell className="w-6 h-6 text-amber-300 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider bg-amber-400 text-amber-950 font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                    🚨 Naya Route Order Dispatch
                  </span>
                  <span className="text-xs text-sky-100 font-medium">
                    {activeRouteNotification.dispatchedAt ? format(new Date(activeRouteNotification.dispatchedAt), 'hh:mm a') : 'Today'}
                  </span>
                </div>
                <h3 className="text-base font-black text-white mt-1">
                  Route: {activeRouteNotification.areaOrBlock} ({activeRouteNotification.customerCount} Customers, ~{activeRouteNotification.bottleCount} Bottles)
                </h3>
                {activeRouteNotification.message && (
                  <p className="text-xs text-sky-100 mt-1 italic font-medium">
                    "{activeRouteNotification.message}"
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  acknowledgeRouteDispatch(activeRouteNotification.id);
                  if (activeRouteNotification.areaOrBlock && activeRouteNotification.areaOrBlock !== 'All Assigned Areas') {
                    if (distinctBlocks.includes(activeRouteNotification.areaOrBlock)) {
                      setBlockFilter(activeRouteNotification.areaOrBlock);
                    } else if (areas.includes(activeRouteNotification.areaOrBlock)) {
                      setAreaFilter(activeRouteNotification.areaOrBlock);
                    }
                  }
                  toast.success('Route shuru kar diya gaya hai! Deliveries complete karein.');
                }}
                className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 rounded-xl font-black text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Start Route / Samjh Gaya</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rider / Mode Switcher Bar */}
      <Card className="p-3.5 bg-gradient-to-r from-sky-50 via-white to-blue-50 border-sky-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              {isRiderLoggedIn ? <Bike className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-sky-700 block">
                  {isRiderLoggedIn ? 'My Delivery Route' : 'Owner Route Dispatcher'}
                </span>
                {selectedRider && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.2 rounded-full">
                    Active Rider
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-gray-900">
                {isRiderLoggedIn
                  ? `🛵 ${selectedRider?.name || 'Rider'}'s Delivery Route`
                  : (selectedRiderId === 'all' ? 'Owner Master Monitor (All Riders & Routes)' : `${selectedRider?.name}'s Route`)}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isRiderLoggedIn ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold shadow-2xs">
                <Bike className="w-4 h-4 text-emerald-600" />
                <span>Rider: {selectedRider?.name || auth.name}</span>
                {selectedRider?.vehicleNumber && (
                  <span className="text-[10px] text-emerald-600 font-medium">({selectedRider.vehicleNumber})</span>
                )}
              </div>
            ) : (
              <>
                <span className="text-xs font-bold text-gray-500">Rider / Route:</span>
                <select
                  value={selectedRiderId}
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedRiderId(val);
                    if (val !== 'all') {
                      const r = deliveryBoys.find(b => b.id === val);
                      if (r?.assignedBlocks && r.assignedBlocks.length > 0) {
                        setBlockFilter(r.assignedBlocks[0]);
                      }
                      if (r?.assignedAreas && r.assignedAreas.length > 0) {
                        setAreaFilter(r.assignedAreas[0]);
                      }
                    }
                  }}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none shadow-2xs"
                >
                  <option value="all">👁️ All Riders (Owner Master View)</option>
                  {deliveryBoys.map(boy => {
                    const blockTag = boy.assignedBlocks?.length ? ` [${boy.assignedBlocks.join(', ')}]` : '';
                    return (
                      <option key={boy.id} value={boy.id}>
                        🛵 {boy.name}{blockTag}
                      </option>
                    );
                  })}
                </select>
              </>
            )}
          </div>
        </div>

        {/* Display Assigned Block & Area Summary when a Rider is active */}
        {selectedRider && (
          <div className="mt-2.5 pt-2.5 border-t border-sky-100/80 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-gray-500">Route Assigned:</span>
            {selectedRider.assignedBlocks && selectedRider.assignedBlocks.length > 0 ? (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-indigo-800 font-bold">🏢 Blocks:</span>
                {selectedRider.assignedBlocks.map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBlockFilter(b)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                      blockFilter === b ? 'bg-indigo-600 text-white shadow-xs' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
                    }`}
                  >
                    🏢 {b}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-gray-400 text-[11px] italic">No specific block restriction</span>
            )}

            {selectedRider.assignedAreas && selectedRider.assignedAreas.length > 0 ? (
              <div className="flex items-center gap-1 flex-wrap ml-2">
                <span className="text-emerald-800 font-bold">📍 Areas:</span>
                {selectedRider.assignedAreas.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAreaFilter(a)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                      areaFilter === a ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                    }`}
                  >
                    📍 {a}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </Card>

      {/* Progress & Route Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3.5 bg-sky-50/70 border-sky-100">
          <span className="text-[11px] font-semibold text-sky-700 uppercase">Customers on Route</span>
          <p className="text-2xl font-black text-sky-950 mt-0.5">{totalOnRoute}</p>
          <span className="text-[10px] text-sky-600 font-semibold">{pendingCount} Still Pending</span>
        </Card>

        <Card className="p-3.5 bg-emerald-50/70 border-emerald-100">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase flex items-center gap-1">
            <Check className="w-3.5 h-3.5 stroke-[3]" /> Delivered (Tick ✅)
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-0.5">{deliveredCount}</p>
          <span className="text-[10px] text-emerald-700 font-semibold">
            {totalBottlesToday} Bottles delivered
          </span>
        </Card>

        <Card className="p-3.5 bg-rose-50/70 border-rose-100">
          <span className="text-[11px] font-semibold text-rose-700 uppercase flex items-center gap-1">
            <X className="w-3.5 h-3.5 stroke-[3]" /> Pani Nahi Gya (Cross ❌)
          </span>
          <p className="text-2xl font-black text-rose-600 mt-0.5">{skippedCount}</p>
          <span className="text-[10px] text-rose-700 font-semibold">Stops missed / skipped</span>
        </Card>

        <Card className="p-3.5 bg-amber-50/70 border-amber-100">
          <span className="text-[11px] font-semibold text-amber-700 uppercase flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Extra Bottles (🍾)
          </span>
          <p className="text-2xl font-black text-amber-900 mt-0.5">+{totalExtraBottlesToday}</p>
          <span className="text-[10px] text-amber-700 font-semibold">On-demand extra demand</span>
        </Card>

        <Card className="p-3.5 bg-purple-50/70 border-purple-100 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-purple-700 uppercase">Progress</span>
          <div className="w-full bg-purple-200/50 rounded-full h-2.5 mt-2">
            <div 
              className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${totalOnRoute > 0 ? ((deliveredCount + skippedCount) / totalOnRoute) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[10px] text-purple-700 mt-1 font-bold">
            {totalOnRoute > 0 ? Math.round(((deliveredCount + skippedCount) / totalOnRoute) * 100) : 0}% covered
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
              <span className="text-xs font-semibold text-gray-500 whitespace-nowrap mr-1">Area:</span>
              <button
                onClick={() => setAreaFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  areaFilter === 'all' ? 'bg-sky-500 text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Areas
              </button>
              {areas.map(a => (
                <button
                  key={a}
                  onClick={() => setAreaFilter(a)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    areaFilter === a ? 'bg-sky-500 text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Block-Wise Route Filter Chips */}
        {distinctBlocks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-sky-800 flex items-center gap-1 whitespace-nowrap mr-1">
                <Building2 className="w-3.5 h-3.5 text-sky-600" />
                <span>Block Wise Route:</span>
              </span>
              <button
                type="button"
                onClick={() => setBlockFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                  blockFilter === 'all'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200/60'
                }`}
              >
                <span>🏢 All Blocks ({customers.length})</span>
              </button>
              {distinctBlocks.map(blk => {
                const countInBlock = customers.filter(c => c.status === 'active' && (c.block === blk || (!c.block && c.area === blk))).length;
                const doneInBlock = customers.filter(c => c.status === 'active' && (c.block === blk || (!c.block && c.area === blk)) && todayDeliveriesMap[c.id]?.status !== 'skipped' && todayDeliveriesMap[c.id]).length;
                return (
                  <button
                    key={blk}
                    type="button"
                    onClick={() => setBlockFilter(blk)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      blockFilter === blk
                        ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-300'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <span>🏢 {blk}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      blockFilter === blk ? 'bg-sky-800 text-white' : 'bg-gray-100 text-gray-600 font-semibold'
                    }`}>
                      {doneInBlock}/{countInBlock}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Status Filter Tabs (All, Delivered ✅, Skipped ❌, Pending ⏳) */}
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100 overflow-x-auto">
          <button
            onClick={() => setStatusTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusTab === 'all' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Route ({filteredCustomers.length})
          </button>

          <button
            onClick={() => setStatusTab('delivered')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              statusTab === 'delivered' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Delivered ({deliveredCount})</span>
          </button>

          <button
            onClick={() => setStatusTab('skipped')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              statusTab === 'skipped' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            <X className="w-3.5 h-3.5 stroke-[3]" />
            <span>Pani Nahi Gya ({skippedCount})</span>
          </button>

          <button
            onClick={() => setStatusTab('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              statusTab === 'pending' ? 'bg-sky-600 text-white shadow-xs' : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending ({pendingCustomers.length})</span>
          </button>
        </div>
      </Card>

      {/* Multi-Customer Selection Bar */}
      {pendingCustomers.length > 0 && (
        <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={selectAllPending}
              className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-sky-50 text-sky-700 text-xs font-bold rounded-xl border border-sky-200 transition-all shadow-2xs"
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

            {selectedCustomerIds.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-sky-900 bg-sky-200/80 px-2.5 py-1 rounded-lg">
                  {selectedCustomerIds.length} Selected
                </span>
                <button
                  type="button"
                  onClick={handleOpenBulkSkipModal}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1 transition-all"
                >
                  <X className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Pani Nahi Gya (❌) ({selectedCustomerIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={handleBulkDeliver}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1 transition-all"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Deliver (Tick ✅) ({selectedCustomerIds.length})</span>
                </button>
              </div>
            ) : (
              <span className="text-xs text-sky-700 font-medium hidden sm:inline">
                💡 Har customer card par <strong>"Select"</strong> tick karke ek sath Pani Deliver ya Cross karein.
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

      {/* Rapid Delivery Customer Grid */}
      {filteredCustomers.length === 0 ? (
        <EmptyState
          icon={<Truck className="w-10 h-10 text-sky-400" />}
          title="No customers found on route"
          description={
            statusTab !== 'all' 
              ? `No customers match the "${statusTab}" filter.` 
              : search 
              ? "Try searching for another name or mobile number." 
              : "Add active customers to view your daily delivery register."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCustomers.map(customer => {
            const delivery = todayDeliveriesMap[customer.id];
            const isDelivered = delivery && delivery.status !== 'skipped';
            const isSkipped = delivery && delivery.status === 'skipped';
            const isPending = !delivery;

            const entry = getEntry(customer);
            const balance = getCustomerBalance(customer.id);
            const unitPrice = customer.pricePerUnit || settings.defaultWaterPrice || 30;
            const isSelected = selectedCustomerIds.includes(customer.id);

            const totalEntryBottles = entry.quantity + (entry.extraBottles || 0);

            return (
              <Card 
                key={customer.id} 
                className={`p-4 transition-all border relative flex flex-col justify-between ${
                  isDelivered 
                    ? 'border-emerald-300 bg-emerald-50/20' 
                    : isSkipped
                    ? 'border-rose-300 bg-rose-50/20'
                    : isSelected
                    ? 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-400/40 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-sky-300'
                }`}
              >
                <div>
                  {/* Customer Info Header */}
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {isPending && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectCustomer(customer.id);
                          }}
                          className={`mt-0.5 flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                            isSelected
                              ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-300'
                              : 'bg-white border-2 border-gray-300 hover:border-sky-500 text-gray-700 hover:bg-sky-50'
                          }`}
                          title={isSelected ? "Deselect customer" : "Select customer (Delivery ya Pani Nahi Gya mark karne ke liye)"}
                        >
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center ${isSelected ? 'bg-white text-sky-600' : 'border border-gray-400 bg-white'}`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="text-[11px]">{isSelected ? 'Selected' : 'Select'}</span>
                        </button>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-gray-900 text-base truncate">{customer.name}</h3>
                          {customer.block && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                              🏢 {customer.block}
                            </span>
                          )}
                          {customer.building && (
                            <span className="text-[10px] bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-md">
                              Bldg: {customer.building}
                            </span>
                          )}
                          {customer.houseNo && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-md">
                              H#: {customer.houseNo}
                            </span>
                          )}
                          {customer.area && !customer.block && (
                            <span className="text-[10px] bg-sky-100 text-sky-700 font-semibold px-2 py-0.5 rounded-md">
                              {customer.area}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span>{customer.phone}</span>
                        </p>
                        {(customer.address || customer.floor) && (
                          <p className="text-[11px] text-gray-500 truncate mt-0.5">
                            {customer.floor ? `Floor: ${customer.floor} • ` : ''}
                            {customer.address}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status Badges: Tick (✅), Cross (❌), or Pending (⏳) */}
                    {isDelivered && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500 text-white rounded-full text-xs font-bold shadow-xs shadow-emerald-500/20 shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        Delivered
                      </span>
                    )}

                    {isSkipped && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600 text-white rounded-full text-xs font-bold shadow-xs shadow-rose-600/20 shrink-0">
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                        Pani Nahi Gya
                      </span>
                    )}

                    {isPending && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[11px] font-semibold shrink-0">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                    )}
                  </div>

                  {/* Balances Summary */}
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

                  {/* CASE 1: DELIVERED TODAY (✅ Tick Mark) */}
                  {isDelivered && (
                    <div className="space-y-2 mb-3">
                      <div className="p-3 bg-emerald-50/90 border border-emerald-200/80 rounded-xl text-xs text-emerald-950">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-sm text-emerald-900">
                                {delivery.quantity} bottles delivered
                              </span>
                              <span className="px-1.5 py-0.2 bg-emerald-200 text-emerald-900 rounded font-black text-[10px]">
                                ✅ DELIVERED
                              </span>
                            </div>
                            <span className="text-[11px] text-emerald-700 block mt-0.5">
                              Delivered at {delivery.time}
                              {delivery.deliveryBoyName ? ` by ${delivery.deliveryBoyName}` : ''}
                            </span>
                            {delivery.extraBottles && delivery.extraBottles > 0 ? (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="inline-block px-2 py-0.5 bg-amber-100 border border-amber-200 text-amber-900 rounded-md text-[10px] font-bold">
                                  🍾 Includes {delivery.extraBottles} Extra Bottles
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleResetExtraBottlesDirect(customer, delivery)}
                                  className="text-[10px] text-rose-600 hover:text-rose-800 font-bold underline"
                                  title="Reset extra bottles"
                                >
                                  (Undo Extra)
                                </button>
                              </div>
                            ) : null}
                            {delivery.emptyReturned === false ? (
                              <span className="block mt-1 text-[11px] text-rose-700 font-bold">
                                ❌ Khali Can Wapis Nahi Mila
                              </span>
                            ) : delivery.emptyBottlesReceived ? (
                              <span className="block text-[11px] text-emerald-700 mt-0.5 font-medium">
                                🔄 {delivery.emptyBottlesReceived} Khali Can Wapis Mile
                              </span>
                            ) : null}
                          </div>
                          <div className="text-right">
                            <span className="font-black text-sm text-emerald-800 block">{sym}{delivery.totalPrice}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              delivery.paymentStatus === 'paid' ? 'bg-emerald-200/80 text-emerald-900' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {delivery.paymentStatus === 'paid' ? 'Paid' : 'Udhar'}
                            </span>
                          </div>
                        </div>

                        {/* Customer called again? Extra Bottle Fast Adder Bar */}
                        <div className="mt-2.5 pt-2 border-t border-emerald-200/70">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-emerald-700" />
                              <span>Customer Ki Dobara Call Aayi? Extra Bottle:</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenExtraModal(customer, delivery)}
                              className="text-[10px] font-bold text-sky-700 hover:text-sky-900 underline"
                            >
                              Custom Qty ➕
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleQuickAddExtraBottles(customer, delivery, 1, true, false)}
                              className="px-2.5 py-1 bg-white hover:bg-emerald-100 active:scale-95 border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-900 shadow-2xs flex items-center gap-1 transition-all"
                              title="Customer ko 1 Extra Bottle bhejein"
                            >
                              <Plus className="w-3 h-3 stroke-[3]" />
                              <span>+1 Bottle</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAddExtraBottles(customer, delivery, 2, true, false)}
                              className="px-2.5 py-1 bg-white hover:bg-emerald-100 active:scale-95 border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-900 shadow-2xs flex items-center gap-1 transition-all"
                              title="Customer ko 2 Extra Bottles bhejein"
                            >
                              <Plus className="w-3 h-3 stroke-[3]" />
                              <span>+2 Bottles</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAddExtraBottles(customer, delivery, 3, true, false)}
                              className="px-2.5 py-1 bg-white hover:bg-emerald-100 active:scale-95 border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-900 shadow-2xs flex items-center gap-1 transition-all"
                              title="Customer ko 3 Extra Bottles bhejein"
                            >
                              <Plus className="w-3 h-3 stroke-[3]" />
                              <span>+3 Bottles</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CASE 2: SKIPPED TODAY (❌ Cross Mark - Pani Nahi Gya) */}
                  {isSkipped && (
                    <div className="space-y-2 mb-3">
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950">
                        <div className="flex items-center gap-1.5 text-rose-700 font-bold mb-1">
                          <X className="w-4 h-4 stroke-[3] text-rose-600" />
                          <span>Pani Nahi Gya (Delivery Skipped)</span>
                        </div>
                        <p className="text-xs font-semibold text-rose-900">
                          Wajah: <strong>{delivery.skipReason || 'Ghar band ya phone nahi uthaya'}</strong>
                        </p>
                        <p className="text-[11px] text-rose-700 mt-1">
                          Marked at {delivery.time} {delivery.deliveryBoyName ? `by ${delivery.deliveryBoyName}` : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* CASE 3: PENDING DELIVERY - Rapid Controls */}
                  {isPending && (
                    <div className="space-y-3">
                      {/* Rider Assignment (if in Owner View) */}
                      {deliveryBoys.length > 0 && selectedRiderId === 'all' && (
                        <div className="flex items-center justify-between text-xs px-1">
                          <span className="text-gray-500 font-medium">Delivery Rider:</span>
                          <select
                            value={entry.riderId}
                            onChange={e => updateEntry(customer.id, 'riderId', e.target.value)}
                            className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800"
                          >
                            <option value="">-- Choose Rider --</option>
                            {deliveryBoys.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* 2-Column Quantity Selector: Regular Bottles + Extra Bottles */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Regular Daily Quota */}
                        <div className="p-2 bg-sky-50/50 border border-sky-100 rounded-xl text-center">
                          <span className="text-[10px] font-bold text-sky-800 uppercase block mb-1">
                            Daily Quota
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

                        {/* Extra Bottles On-Demand */}
                        <div className="p-2 bg-amber-50/50 border border-amber-200/80 rounded-xl text-center">
                          <span className="text-[10px] font-bold text-amber-800 uppercase block mb-1">
                            Extra Bottles (+)
                          </span>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateEntry(customer.id, 'extraBottles', Math.max(0, (entry.extraBottles || 0) - 1))}
                              className="w-7 h-7 bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-bold flex items-center justify-center"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-base font-black text-amber-950 w-6">
                              {entry.extraBottles || 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateEntry(customer.id, 'extraBottles', (entry.extraBottles || 0) + 1)}
                              className="w-7 h-7 bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-bold flex items-center justify-center"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Quick Extra Bottle Chips: 0 to 6 */}
                      <div className="flex items-center justify-between text-xs px-1">
                        <span className="text-[11px] text-gray-500 font-semibold">Extra Bottle:</span>
                        <div className="flex gap-1 flex-wrap">
                          {[1, 2, 3, 4, 5, 6].map(amt => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => updateEntry(customer.id, 'extraBottles', amt)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                                entry.extraBottles === amt
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              }`}
                            >
                              +{amt}
                            </button>
                          ))}
                          {entry.extraBottles > 0 && (
                            <button
                              type="button"
                              onClick={() => updateEntry(customer.id, 'extraBottles', 0)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-700 hover:bg-gray-300"
                            >
                              0
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Khali Can (Empty Can Return Status) */}
                      <div className="p-2.5 bg-gray-50 border border-gray-200/80 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-700 text-[11px] uppercase tracking-wide">
                            Khali Can Return:
                          </span>
                          <span className="text-[11px] font-semibold text-gray-500">
                            {entry.emptyReturned !== false ? `${entry.emptyReceived} can wapis` : '❌ Wapis nahi mila'}
                          </span>
                        </div>

                        {/* 2 Big Toggle Buttons: ✅ Mila vs ❌ Nahi Mila */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              updateEntry(customer.id, 'emptyReturned', true);
                              if (!entry.emptyReceived) {
                                updateEntry(customer.id, 'emptyReceived', totalEntryBottles);
                              }
                            }}
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                              entry.emptyReturned !== false
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-emerald-50'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Khali Can Mila</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              updateEntry(customer.id, 'emptyReturned', false);
                              updateEntry(customer.id, 'emptyReceived', 0);
                            }}
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                              entry.emptyReturned === false
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-rose-50'
                            }`}
                          >
                            <X className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Nahi Mila</span>
                          </button>
                        </div>

                        {/* If Mila: Allow editing can count */}
                        {entry.emptyReturned !== false ? (
                          <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-xs">
                            <span className="text-[11px] text-emerald-800 font-medium">Kitne khali can mile?</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateEntry(customer.id, 'emptyReceived', Math.max(0, entry.emptyReceived - 1))}
                                className="w-6 h-6 bg-white border border-gray-300 rounded text-gray-700 font-bold flex items-center justify-center hover:bg-gray-100"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center font-bold text-gray-900">{entry.emptyReceived}</span>
                              <button
                                type="button"
                                onClick={() => updateEntry(customer.id, 'emptyReceived', entry.emptyReceived + 1)}
                                className="w-6 h-6 bg-white border border-gray-300 rounded text-gray-700 font-bold flex items-center justify-center hover:bg-gray-100"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-1.5 bg-rose-50 border border-rose-100 rounded text-[11px] text-rose-700 font-medium flex items-center gap-1">
                            <X className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>Khali can customer ke zimme baqiya rahega.</span>
                          </div>
                        )}
                      </div>

                      {/* Empty Returned & Payment Status */}
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-xl text-xs">
                        <span className="text-[11px] font-bold text-gray-600">Payment:</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => updateEntry(customer.id, 'paymentStatus', 'unpaid')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                              entry.paymentStatus === 'unpaid' ? 'bg-rose-100 text-rose-700' : 'text-gray-400'
                            }`}
                          >
                            Udhar
                          </button>
                          <button
                            type="button"
                            onClick={() => updateEntry(customer.id, 'paymentStatus', 'paid')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                              entry.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-400'
                            }`}
                          >
                            Cash
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons (Footer) */}
                <div className="pt-3 border-t border-gray-100 mt-3 space-y-2">
                  {/* Total calculation banner */}
                  {isPending && (
                    <div className="flex items-center justify-between text-xs px-1 text-gray-700">
                      <span>Total: <strong className="text-gray-900">{totalEntryBottles} Bottles</strong></span>
                      <span className="font-black text-sm text-sky-950">{sym}{totalEntryBottles * unitPrice}</span>
                    </div>
                  )}

                  {/* ACTION BUTTONS FOR PENDING */}
                  {isPending && (
                    <div className="grid grid-cols-2 gap-2">
                      {/* Big Green Tick Mark Button */}
                      <button
                        onClick={() => handleDeliver(customer)}
                        className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Deliver (Tick ✅)</span>
                      </button>

                      {/* Red Cross Mark Button (Pani Nahi Gya) */}
                      <button
                        onClick={() => handleOpenSkipModal(customer)}
                        className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                      >
                        <X className="w-4 h-4 stroke-[3]" />
                        <span>Pani Nahi Gya (❌)</span>
                      </button>
                    </div>
                  )}

                  {/* ACTION BUTTONS IF ALREADY DELIVERED */}
                  {isDelivered && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenExtraModal(customer, delivery)}
                          className="py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1 transition-all"
                          title="Customer ko Extra Bottle bhejein"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>+ Extra</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendSlip(customer, delivery)}
                          className="py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center justify-center gap-1 transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendSmsSlip(customer, delivery)}
                          className="py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center justify-center gap-1 transition-all"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>SMS</span>
                        </button>
                      </div>

                      {/* Change to skipped if mistake */}
                      <button
                        onClick={() => handleOpenSkipModal(customer)}
                        className="w-full py-1 text-center text-[10px] text-gray-400 hover:text-rose-600 font-semibold"
                      >
                        Change to Pani Nahi Gya (Cross ❌)
                      </button>
                    </div>
                  )}

                  {/* ACTION BUTTONS IF SKIPPED (PANI NAHI GYA) */}
                  {isSkipped && (
                    <div className="space-y-2">
                      {/* Customer called back: Deliver Now (Tick Mark) */}
                      <button
                        onClick={() => handleDeliver(customer)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Abhi Deliver Karein (Tick ✅)</span>
                      </button>

                      <button
                        onClick={() => handleSendSlip(customer, delivery)}
                        className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Send Skip Notice on WhatsApp</span>
                      </button>
                    </div>
                  )}
                </div>
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
              {/* Rider Select */}
              {deliveryBoys.length > 0 && (
                <select
                  value={bulkRiderId}
                  onChange={e => setBulkRiderId(e.target.value)}
                  className="bg-sky-950/80 text-white border border-sky-700/70 rounded-xl px-2.5 py-1 text-xs font-semibold"
                >
                  <option value="">Rider: Default / Self</option>
                  {deliveryBoys.map(b => (
                    <option key={b.id} value={b.id}>
                      Rider: {b.name}
                    </option>
                  ))}
                </select>
              )}

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
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedCustomerIds([])}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-all"
              >
                Clear
              </button>
              {/* Red Button: Pani Nahi Gya (Cross ❌) for selected customers */}
              <button
                type="button"
                onClick={handleOpenBulkSkipModal}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition-all"
              >
                <X className="w-4 h-4 stroke-[3]" />
                <span>Pani Nahi Gya (❌) ({selectedCustomerIds.length})</span>
              </button>
              {/* Green Button: Deliver (Tick ✅) for selected customers */}
              <button
                type="button"
                onClick={handleBulkDeliver}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-500/30 flex items-center gap-1.5 transition-all"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Deliver (Tick ✅) ({selectedCustomerIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Skip / Crossmark Modal for Multiple Selected Customers */}
      <Modal
        isOpen={isBulkSkipModalOpen}
        onClose={() => setIsBulkSkipModalOpen(false)}
        title={`Mark (${selectedCustomerIds.length}) Customers as Pani Nahi Gya (Cross ❌)`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950">
            <span className="font-bold block mb-1">
              In {selectedCustomerIds.length} select kiye hue customers ko pani kyun nahi deliver hua?
            </span>
            <div className="max-h-24 overflow-y-auto space-y-0.5 text-[11px] text-rose-800">
              {selectedCustomerIds.map(id => {
                const c = customers.find(x => x.id === id);
                return c ? (
                  <div key={id} className="flex items-center gap-1">
                    <span>• {c.name}</span>
                    {c.block && <span className="text-rose-600">({c.block}{c.houseNo ? ` H#${c.houseNo}` : ''})</span>}
                  </div>
                ) : null;
              })}
            </div>
          </div>

          <div className="space-y-2">
            {[
              'Customer Ny Mana Kiya (Refused / Aaj Nahi Chahiye)',
              'Ghar Band Tha (Door Locked)',
              'Pani Pehle Se Maujood Tha (Dispenser/Bottles Full)',
              'Phone Nahi Uthaya (Call Not Answered)',
              'Khali Can Dastiyab Nahi Thi (No Empty Can)',
              'Rasta Band / Gari Nahi Ja Saki (No Access)',
            ].map(reason => (
              <button
                key={reason}
                type="button"
                onClick={() => setBulkSkipReasonPreset(reason)}
                className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold transition-all border ${
                  bulkSkipReasonPreset === reason
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
              Mazeed Tafseel / Custom Reason (Optional)
            </label>
            <input
              type="text"
              value={bulkCustomSkipReason}
              onChange={e => setBulkCustomSkipReason(e.target.value)}
              placeholder="e.g. Subah delivery attempt hui lekin mana kiya..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setIsBulkSkipModalOpen(false)}>
              Cancel
            </Button>
            <button
              type="button"
              onClick={handleConfirmBulkSkip}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <X className="w-4 h-4 stroke-[3]" />
              <span>Confirm Cross (❌) for ({selectedCustomerIds.length})</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Skip / Crossmark Modal */}
      <Modal
        isOpen={!!skipCustomer}
        onClose={() => setSkipCustomer(null)}
        title="Mark as Pani Nahi Gya (Cross ❌)"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Kyun pani nahi deliver ho saka customer <strong>{skipCustomer?.name}</strong> ko?
          </p>

          <div className="space-y-2">
            {[
              'Ghar Band Tha (Door Locked)',
              'Customer Ny Mana Kiya (Refused / Aaj Nahi Chahiye)',
              'Pani Pehle Se Maujood Tha (Dispenser/Bottles Full)',
              'Phone Nahi Uthaya (Call Not Answered)',
              'Khali Can Dastiyab Nahi Thi (No Empty Can)',
              'Rasta Band / Gari Nahi Ja Saki (No Access)',
            ].map(reason => (
              <button
                key={reason}
                type="button"
                onClick={() => setSkipReasonPreset(reason)}
                className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold transition-all border ${
                  skipReasonPreset === reason
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
              Mazeed Tafseel / Custom Reason (Optional)
            </label>
            <input
              type="text"
              value={customSkipReason}
              onChange={e => setCustomSkipReason(e.target.value)}
              placeholder="e.g. Call attempt at 11am, neighbor said out of city..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setSkipCustomer(null)}>
              Cancel
            </Button>
            <button
              type="button"
              onClick={handleConfirmSkip}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <X className="w-4 h-4 stroke-[3]" />
              <span>Confirm Cross (❌)</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Extra Bottle Modal for Already Delivered Customer */}
      <Modal
        isOpen={!!extraModalData}
        onClose={() => setExtraModalData(null)}
        title="📞 Customer Ki Dobara Call Aayi? Extra Bottle Add Karein"
        size="md"
      >
        {extraModalData && (
          <div className="space-y-4">
            {/* Customer & Previous Delivery Info */}
            <div className="p-3 bg-sky-50 border border-sky-100 rounded-2xl flex items-start justify-between">
              <div>
                <span className="font-bold text-sm text-sky-950 block">
                  {extraModalData.customer.name}
                </span>
                <span className="text-xs text-sky-700 block">
                  {extraModalData.customer.phone}
                  {extraModalData.customer.block ? ` • Block ${extraModalData.customer.block}` : ''}
                  {extraModalData.customer.building ? ` • ${extraModalData.customer.building}` : ''}
                  {extraModalData.customer.houseNo ? ` • H#${extraModalData.customer.houseNo}` : ''}
                </span>
                <span className="text-[11px] text-gray-500 block mt-1">
                  Pehle Deliver: <strong>{extraModalData.delivery.quantity} Bottles</strong> at {extraModalData.delivery.time}
                  {extraModalData.delivery.extraBottles && extraModalData.delivery.extraBottles > 0 
                    ? ` (jin mein ${extraModalData.delivery.extraBottles} Extra hain)` 
                    : ''}
                </span>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-black rounded-lg shrink-0">
                ✅ Delivered
              </span>
            </div>

            {/* Extra Bottle Count Selector */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2.5">
              <label className="block text-xs font-bold text-amber-950 uppercase tracking-wide">
                Kitni Extra Bottle(s) Chahiyein?
              </label>

              {/* Stepper with - / + buttons and quick chips */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white border border-amber-300 rounded-xl p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setExtraCountToAdd(prev => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 flex items-center justify-center font-bold text-base transition-all"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={extraCountToAdd}
                    onChange={(e) => setExtraCountToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 text-center font-black text-amber-950 text-base bg-transparent border-none focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setExtraCountToAdd(prev => prev + 1)}
                    className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-white flex items-center justify-center font-bold text-base transition-all shadow-xs"
                  >
                    +
                  </button>
                </div>

                {/* Quick Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[1, 2, 3, 4, 5, 6].map(qty => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setExtraCountToAdd(qty)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        extraCountToAdd === qty
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white border border-amber-200 text-amber-900 hover:bg-amber-100'
                      }`}
                    >
                      +{qty}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Calculation preview */}
              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs font-semibold text-amber-900">
                <span>
                  Ab Total: <strong>{extraModalData.delivery.quantity + extraCountToAdd} Bottles</strong>
                  {' '}(+🍾 {extraCountToAdd} Extra)
                </span>
                <span className="font-black text-sm text-amber-950">
                  Naya Bill: {sym}{(extraModalData.delivery.quantity + extraCountToAdd) * (extraModalData.delivery.pricePerUnit || extraModalData.customer.pricePerUnit || 30)}
                </span>
              </div>
            </div>

            {/* Empty Can Return Option */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
              <label className="block text-xs font-bold text-gray-800">
                Kya Khali Can Wapis Mila?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExtraEmptyReturned(true)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    extraEmptyReturned
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50'
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>✅ Khali Can Mila (+{extraCountToAdd})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExtraEmptyReturned(false)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    !extraEmptyReturned
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-rose-50'
                  }`}
                >
                  <X className="w-4 h-4 stroke-[3]" />
                  <span>❌ Can Wapis Nahi Mila</span>
                </button>
              </div>
            </div>

            {/* Payment Collection */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
              <label className="block text-xs font-bold text-gray-800">
                Payment (Paisa Wasool Hua?):
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExtraPaymentReceived(false)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    !extraPaymentReceived
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-rose-50'
                  }`}
                >
                  <span>⏳ Udhar / Monthly Bill Mein</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExtraPaymentReceived(true)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    extraPaymentReceived
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50'
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>💵 Spot Cash Mil Gaya</span>
                </button>
              </div>
            </div>

            {/* Rider Selector (if owner) */}
            {deliveryBoys.length > 0 && selectedRiderId === 'all' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Yeh Extra Bottle Kaun Deliver Kar Raha Hai?
                </label>
                <select
                  value={extraRiderId}
                  onChange={(e) => setExtraRiderId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800"
                >
                  <option value="">-- Delivery Boy Select Karein --</option>
                  {deliveryBoys.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Note / Reason */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Koyi Note Ya Time (Optional)
              </label>
              <input
                type="text"
                value={extraCustomNote}
                onChange={e => setExtraCustomNote(e.target.value)}
                placeholder="e.g. Shaam ko mehman aye thy, call pe mangwaya..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
              />
            </div>

            {/* Info notice about message preference */}
            <div className="p-2.5 bg-sky-50/60 border border-sky-100 rounded-xl text-[11px] text-sky-800 flex items-center gap-2">
              <span className="text-base">💡</span>
              <span>Extra bottle pehle save hogi (koi direct message nahi jayega). Save hone ke baad aap ki marzi hai ke card se <strong>WhatsApp</strong> bhejein ya <strong>SMS</strong>.</span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
              {extraModalData.delivery.extraBottles && extraModalData.delivery.extraBottles > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    handleResetExtraBottlesDirect(extraModalData.customer, extraModalData.delivery);
                    setExtraModalData(null);
                  }}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all"
                >
                  Reset Extra to 0
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setExtraModalData(null)}>
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={handleConfirmExtraModal}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Save Extra Bottles (✅ Save Karein)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
