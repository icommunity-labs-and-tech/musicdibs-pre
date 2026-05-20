UPDATE public.stripe_backfill_state
SET last_charge_id = NULL,
    charges_processed = 0,
    orders_inserted = 0,
    orders_skipped = 0,
    completed = FALSE,
    updated_at = NOW()
WHERE id = 1;