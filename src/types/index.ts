export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  area?: string; // Route or Area name (e.g. Sector 14, Main Road, Block C)
  waterType: string;
  quantity: number; // default daily bottles
  pricePerUnit: number;
  emptyBottlesHeld?: number; // Total empty cans currently at customer's place
  status: 'active' | 'inactive';
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
  quantity: number; // filled bottles delivered
  emptyBottlesReceived?: number; // empty bottles collected back
  waterType: string;
  pricePerUnit: number;
  totalPrice: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paidAmount: number;
  notes: string;
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
