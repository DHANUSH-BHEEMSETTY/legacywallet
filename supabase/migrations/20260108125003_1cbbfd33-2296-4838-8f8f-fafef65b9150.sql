-- Create enum for will types
CREATE TYPE public.will_type AS ENUM ('audio', 'video', 'chat', 'text');

-- Create enum for will status
CREATE TYPE public.will_status AS ENUM ('draft', 'in_progress', 'review', 'completed');

-- Create enum for asset categories
CREATE TYPE public.asset_category AS ENUM ('property', 'investment', 'bank_account', 'vehicle', 'jewelry', 'digital_asset', 'insurance', 'business', 'other');

-- Create wills table
CREATE TABLE public.wills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'My Will',
  type public.will_type NOT NULL DEFAULT 'text',
  status public.will_status NOT NULL DEFAULT 'draft',
  content TEXT,
  audio_url TEXT,
  video_url TEXT,
  transcript TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recipients table (beneficiaries)
CREATE TABLE public.recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  relationship TEXT,
  address TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assets table
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  will_id UUID REFERENCES public.wills(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category public.asset_category NOT NULL DEFAULT 'other',
  description TEXT,
  estimated_value DECIMAL(15, 2),
  currency TEXT DEFAULT 'USD',
  location TEXT,
  documents_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create asset allocations table (links assets to recipients)
CREATE TABLE public.asset_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.recipients(id) ON DELETE CASCADE,
  allocation_percentage DECIMAL(5, 2) NOT NULL CHECK (allocation_percentage > 0 AND allocation_percentage <= 100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(asset_id, recipient_id)
);

-- Enable RLS on all tables
ALTER TABLE public.wills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wills
CREATE POLICY "Users can view their own wills" ON public.wills
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wills" ON public.wills
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wills" ON public.wills
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wills" ON public.wills
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for recipients
CREATE POLICY "Users can view their own recipients" ON public.recipients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recipients" ON public.recipients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipients" ON public.recipients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipients" ON public.recipients
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for assets
CREATE POLICY "Users can view their own assets" ON public.assets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assets" ON public.assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assets" ON public.assets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets" ON public.assets
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for asset_allocations (users can manage allocations for their own assets)
CREATE POLICY "Users can view allocations for their assets" ON public.asset_allocations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.assets WHERE assets.id = asset_allocations.asset_id AND assets.user_id = auth.uid())
  );

CREATE POLICY "Users can create allocations for their assets" ON public.asset_allocations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.assets WHERE assets.id = asset_allocations.asset_id AND assets.user_id = auth.uid())
  );

CREATE POLICY "Users can update allocations for their assets" ON public.asset_allocations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.assets WHERE assets.id = asset_allocations.asset_id AND assets.user_id = auth.uid())
  );

CREATE POLICY "Users can delete allocations for their assets" ON public.asset_allocations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.assets WHERE assets.id = asset_allocations.asset_id AND assets.user_id = auth.uid())
  );

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_wills_updated_at
  BEFORE UPDATE ON public.wills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recipients_updated_at
  BEFORE UPDATE ON public.recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_wills_user_id ON public.wills(user_id);
CREATE INDEX idx_recipients_user_id ON public.recipients(user_id);
CREATE INDEX idx_assets_user_id ON public.assets(user_id);
CREATE INDEX idx_assets_will_id ON public.assets(will_id);
CREATE INDEX idx_asset_allocations_asset_id ON public.asset_allocations(asset_id);
CREATE INDEX idx_asset_allocations_recipient_id ON public.asset_allocations(recipient_id);