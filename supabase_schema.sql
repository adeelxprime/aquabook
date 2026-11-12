-- =====================================================================
-- AQUABOOK - COMPLETE SUPABASE POSTGRESQL SCHEMA & MULTI-TENANT CONFIG
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- =====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- 2. TABLE: businesses (Multi-Tenant Water Plants / Businesses)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.businesses (
    id TEXT PRIMARY KEY,
    business_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    plan TEXT NOT NULL DEFAULT 'standard',
    subscription_price NUMERIC(10, 2) NOT NULL DEFAULT 1500,
    subscription_start DATE NOT NULL DEFAULT CURRENT_DATE,
    subscription_end DATE NOT NULL,
    max_customers INTEGER NOT NULL DEFAULT 200,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- =====================================================================
-- 3. TABLE: subscription_payments (Super Admin Subscription Log)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.subscription_payments (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    period_months INTEGER NOT NULL DEFAULT 1,
    plan TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- =====================================================================
-- 4. TABLE: customers (Customers per Water Plant)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    area TEXT,
    water_type TEXT NOT NULL DEFAULT 'Regular Jar',
    quantity INTEGER NOT NULL DEFAULT 1,
    price_per_unit NUMERIC(10, 2) NOT NULL DEFAULT 100,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    assigned_delivery_boy_id TEXT,
    assigned_delivery_boy_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- =====================================================================
-- 5. TABLE: delivery_boys (Riders / Delivery Staff)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.delivery_boys (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle_type TEXT NOT NULL DEFAULT 'bike' CHECK (vehicle_type IN ('bike', 'loader_rickshaw', 'suzuki_pickup', 'truck', 'tanker', 'other')),
    vehicle_number TEXT,
    assigned_areas TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    daily_target INTEGER NOT NULL DEFAULT 50,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- =====================================================================
-- 6. TABLE: deliveries (Daily Delivery Register & Bottle Count)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.deliveries (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TEXT NOT NULL DEFAULT '12:00',
    quantity INTEGER NOT NULL DEFAULT 1,
    regular_quantity INTEGER NOT NULL DEFAULT 1,
    extra_bottles INTEGER NOT NULL DEFAULT 0,
    empty_bottles_received INTEGER NOT NULL DEFAULT 1,
    water_type TEXT NOT NULL DEFAULT 'Regular Jar',
    price_per_unit NUMERIC(10, 2) NOT NULL DEFAULT 100,
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 100,
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'delivered' CHECK (status IN ('delivered', 'skipped')),
    skip_reason TEXT,
    delivery_boy_id TEXT,
    delivery_boy_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- =====================================================================
-- 7. TABLE: truck_supplies (Bulk Tanker / Container Truck Dispatches)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.truck_supplies (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    trip_number TEXT NOT NULL,
    vehicle_number TEXT NOT NULL,
    vehicle_type TEXT NOT NULL DEFAULT 'tanker' CHECK (vehicle_type IN ('tanker', 'container_truck', 'loader_rickshaw', 'pickup', 'other')),
    capacity_liters INTEGER,
    capacity_containers INTEGER,
    driver_name TEXT NOT NULL,
    driver_phone TEXT,
    delivery_boy_id TEXT,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    destination_address TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TEXT NOT NULL DEFAULT '12:00',
    supply_type TEXT NOT NULL DEFAULT 'liters' CHECK (supply_type IN ('liters', 'containers')),
    quantity_supplied INTEGER NOT NULL DEFAULT 1000,
    extra_quantity INTEGER NOT NULL DEFAULT 0,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 1.5,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 1500,
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'delivered' CHECK (status IN ('delivered', 'skipped', 'in_transit')),
    skip_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- =====================================================================
-- 8. TABLE: payments (Cash/Bank Payments Received from Customers)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    method TEXT NOT NULL DEFAULT 'cash' CHECK (method IN ('cash', 'bank_transfer', 'other')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- =====================================================================
-- 9. TABLE: settings (Business Configuration & Preferences)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_phone TEXT,
    business_address TEXT,
    default_water_price NUMERIC(10, 2) NOT NULL DEFAULT 100,
    currency TEXT NOT NULL DEFAULT 'PKR',
    currency_symbol TEXT NOT NULL DEFAULT 'Rs.',
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    theme TEXT NOT NULL DEFAULT 'light',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- =====================================================================
-- 10. INDEXES FOR HIGH-SPEED LOOKUP & FILTERING
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_customers_business ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_area ON public.customers(area);
CREATE INDEX IF NOT EXISTS idx_customers_delivery_boy ON public.customers(assigned_delivery_boy_id);

CREATE INDEX IF NOT EXISTS idx_delivery_boys_business ON public.delivery_boys(business_id);
CREATE INDEX IF NOT EXISTS idx_delivery_boys_phone ON public.delivery_boys(phone);

CREATE INDEX IF NOT EXISTS idx_deliveries_business ON public.deliveries(business_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_customer ON public.deliveries(customer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_date ON public.deliveries(date);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_boy ON public.deliveries(delivery_boy_id);

CREATE INDEX IF NOT EXISTS idx_truck_supplies_business ON public.truck_supplies(business_id);
CREATE INDEX IF NOT EXISTS idx_truck_supplies_date ON public.truck_supplies(date);
CREATE INDEX IF NOT EXISTS idx_truck_supplies_status ON public.truck_supplies(status);

CREATE INDEX IF NOT EXISTS idx_payments_business ON public.payments(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(date);

-- =====================================================================
-- 11. PERMISSIONS & ROW LEVEL SECURITY (RLS)
-- To ensure the web app client with anon key has 100% full unblocked access:
-- =====================================================================
ALTER TABLE public.businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_boys DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_supplies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to anon and authenticated roles
GRANT ALL ON TABLE public.businesses TO anon, authenticated;
GRANT ALL ON TABLE public.subscription_payments TO anon, authenticated;
GRANT ALL ON TABLE public.customers TO anon, authenticated;
GRANT ALL ON TABLE public.delivery_boys TO anon, authenticated;
GRANT ALL ON TABLE public.deliveries TO anon, authenticated;
GRANT ALL ON TABLE public.truck_supplies TO anon, authenticated;
GRANT ALL ON TABLE public.payments TO anon, authenticated;
GRANT ALL ON TABLE public.settings TO anon, authenticated;

-- =====================================================================
-- 12. HELPER MIGRATION SCRIPT (IF UPGRADING EXISTING DATABASE)
-- Run this block if you already have AquaBook running on Supabase:
-- =====================================================================
DO $$
BEGIN
    -- Add columns to customers if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='assigned_delivery_boy_id') THEN
        ALTER TABLE public.customers ADD COLUMN assigned_delivery_boy_id TEXT;
        ALTER TABLE public.customers ADD COLUMN assigned_delivery_boy_name TEXT;
    END IF;

    -- Add columns to deliveries if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deliveries' AND column_name='status') THEN
        ALTER TABLE public.deliveries ADD COLUMN status TEXT NOT NULL DEFAULT 'delivered';
        ALTER TABLE public.deliveries ADD COLUMN skip_reason TEXT;
        ALTER TABLE public.deliveries ADD COLUMN extra_bottles INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE public.deliveries ADD COLUMN regular_quantity INTEGER NOT NULL DEFAULT 1;
        ALTER TABLE public.deliveries ADD COLUMN delivery_boy_id TEXT;
        ALTER TABLE public.deliveries ADD COLUMN delivery_boy_name TEXT;
    END IF;
END $$;

-- =====================================================================
-- SCHEMA READY: Multi-Tenant Architecture Configured
-- Run this in your Supabase SQL Editor to initialize all tables
-- =====================================================================
