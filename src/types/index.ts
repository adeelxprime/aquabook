export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  area?: string; // Route or Area name (e.g. Society / Colony Name)
  block?: string; // Block Name (e.g. R-Block, Block A, Sector 5)
  building?: string; // Building / Plaza / Street Name (e.g. Building 12, Street 4)
  floor?: string; // Floor / Apartment (e.g. Floor 2, Flat 3B)
  houseNo?: string; // House Number (e.g. House # 14)
  waterType: string;
  quantity: number; // default daily bottles
  pricePerUnit: number;
  emptyBottlesHeld?: number; // Total empty cans currently at customer's place (owed cans)
  status: 'active' | 'inactive';
  assignedDeliveryBoyId?: string;
  assignedDeliveryBoyName?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Delivery {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  time: string;
  quantity: number; // total filled bottles delivered (regular + extra)
  regularQuantity?: number; // standard daily quota bottles
  extraBottles?: number; // extra on-demand bottles requested (e.g. 1, 2, 3, 4, 5, 6...)
  emptyBottlesReceived?: number; // empty bottles collected back
  emptyReturned?: boolean; // true = empty bottle received (Tick ✅), false = empty bottle not returned (Cross ❌)
  waterType: string;
  pricePerUnit: number;
  totalPrice: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paidAmount: number;
  status?: 'delivered' | 'skipped'; // 'delivered' = Tick mark (✅), 'skipped' = Cross mark (❌ - Pani nahi gya)
  skipReason?: string; // e.g. "Ghar Band Tha", "Customer Refused", "Pani Pehle Se Tha", etc.
  deliveryBoyId?: string;
  deliveryBoyName?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryBoy {
  id: string;
  name: string;
  phone: string;
  username?: string; // Rider Login Username (e.g. ali123 or 03001234567)
  password?: string; // Rider Login Password or PIN (e.g. 1234)
  vehicleType: 'bike' | 'loader_rickshaw' | 'van' | 'truck' | 'container_truck' | 'other';
  vehicleNumber?: string;
  assignedAreas: string[];
  assignedBlocks?: string[]; // Specific blocks assigned (e.g. ['R-Block', 'Block B'])
  status: 'active' | 'inactive';
  dailyTarget?: number; // daily bottles target
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TruckSupply {
  id: string;
  tripNumber?: string;
  vehicleNumber: string; // e.g. "TK-5421" or "Suzuki LEB-890"
  vehicleType: 'tanker' | 'container_truck' | 'bulk_van' | 'other';
  capacityLiters?: number; // e.g. 5000 Litres
  capacityContainers?: number; // e.g. 100 cans
  driverName: string;
  driverPhone?: string;
  deliveryBoyId?: string;
  clientName: string;
  clientPhone?: string;
  destinationAddress: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  supplyType: 'tanker_water' | 'bulk_containers';
  quantitySupplied: number; // e.g. 1 tanker, 5000 liters, or 80 containers
  extraQuantity?: number; // e.g. 500 extra liters, 10 extra cans
  unitPrice: number;
  totalAmount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paidAmount: number;
  status: 'delivered' | 'skipped' | 'in_transit'; // 'delivered' = Tick (✅), 'skipped' = Cross (❌), 'in_transit' = ⏳
  skipReason?: string; // Reason if water couldn't be supplied
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string;
  method: 'cash' | 'bank_transfer' | 'other';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  defaultWaterPrice: number;
  currency: string;
  currencySymbol: string;
  notificationsEnabled: boolean;
  theme: 'light' | 'dark';
}

export interface DashboardStats {
  totalCustomers: number;
  todayDeliveries: number;
  todayRevenue: number;
  pendingPayments: number;
  totalOutstanding: number;
  todayBottlesDelivered?: number;
  todaySkippedDeliveries?: number;
  todayPendingDeliveries?: number;
  todayExtraBottles?: number;
  todayTruckTrips?: number;
}

export interface CustomerBalance {
  totalCharges: number;
  totalPayments: number;
  totalDeliveryPayments: number;
  outstandingBalance: number;
  emptyBottlesHeld: number;
}

export interface CustomerMonthlyBill {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  area?: string;
  month: string; // YYYY-MM
  monthStr?: string; // YYYY-MM alias for backwards compatibility
  monthName: string;
  deliveries: Delivery[];
  totalBottles: number;
  totalEmptyBottlesReturned: number;
  pricePerUnit: number;
  monthCharges: number;
  monthPaidDeliveries: number;
  directPayments: number;
  totalPaidInMonth: number;
  previousBalance: number;
  netOutstanding: number;
}

export type SortDirection = 'asc' | 'desc';

export interface DateRange {
  start: string;
  end: string;
}
