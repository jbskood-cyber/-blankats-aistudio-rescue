-- SQL code to create the orders table in your Supabase database.
-- Run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    customer_email TEXT,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'MXN' NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'expired')) DEFAULT 'pending' NOT NULL,
    payment_provider TEXT DEFAULT 'mercadopago' NOT NULL,
    mercado_pago_preference_id TEXT,
    mercado_pago_payment_id TEXT,
    analysis_json JSONB NOT NULL,
    improved_cv_json JSONB NOT NULL,
    original_file_name TEXT,
    download_token TEXT UNIQUE,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS (Row Level Security)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Allow service role full write/read access" 
ON orders FOR ALL 
TO service_role 
USING (true);
