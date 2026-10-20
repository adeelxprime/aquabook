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
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- =====================================================================
-- 5. TABLE: deliveries (Daily Delivery Register & Bottle Count)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.deliveries (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TEXT NOT NULL DEFAULT '12:00',
    quantity INTEGER NOT NULL DEFAULT 1,
    empty_bottles_received INTEGER NOT NULL DEFAULT 1,
    water_type TEXT NOT NULL DEFAULT 'Regular Jar',
    price_per_unit NUMERIC(10, 2) NOT NULL DEFAULT 100,
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 100,
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- =====================================================================
-- 6. TABLE: payments (Cash/Bank Payments Received from Customers)
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
-- 7. TABLE: settings (Business Configuration & Preferences)
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
-- 8. INDEXES FOR HIGH-SPEED LOOKUP & FILTERING
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_customers_business ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_area ON public.customers(area);

CREATE INDEX IF NOT EXISTS idx_deliveries_business ON public.deliveries(business_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_customer ON public.deliveries(customer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_date ON public.deliveries(date);

CREATE INDEX IF NOT EXISTS idx_payments_business ON public.payments(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(date);

-- =====================================================================
-- 9. PERMISSIONS & ROW LEVEL SECURITY (RLS)
-- To ensure the web app client with anon key has 100% full unblocked access:
-- =====================================================================
ALTER TABLE public.businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to anon and authenticated roles
GRANT ALL ON TABLE public.businesses TO anon, authenticated;
GRANT ALL ON TABLE public.subscription_payments TO anon, authenticated;
GRANT ALL ON TABLE public.customers TO anon, authenticated;
GRANT ALL ON TABLE public.deliveries TO anon, authenticated;
GRANT ALL ON TABLE public.payments TO anon, authenticated;
GRANT ALL ON TABLE public.settings TO anon, authenticated;

-- =====================================================================
-- SCHEMA READY: Multi-Tenant Architecture Configured
-- Run this in your Supabase SQL Editor to initialize all tables
-- =====================================================================
