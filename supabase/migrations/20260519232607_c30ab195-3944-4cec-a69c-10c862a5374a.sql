
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL DEFAULT 1,
  campaign_name TEXT NOT NULL,
  collaborator_name TEXT,
  max_redemptions INTEGER,
  redemptions_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON public.coupons (code);

CREATE TABLE public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_granted INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, coupon_id)
);

CREATE INDEX idx_coupon_redemptions_user ON public.coupon_redemptions (user_id);
CREATE INDEX idx_coupon_redemptions_coupon ON public.coupon_redemptions (coupon_id);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can read active coupons" ON public.coupons
  FOR SELECT TO authenticated USING (is_active = TRUE);

CREATE POLICY "Admins manage coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service role full access coupons" ON public.coupons
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Users see own redemptions" ON public.coupon_redemptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins read all redemptions" ON public.coupon_redemptions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service role full access redemptions" ON public.coupon_redemptions
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
