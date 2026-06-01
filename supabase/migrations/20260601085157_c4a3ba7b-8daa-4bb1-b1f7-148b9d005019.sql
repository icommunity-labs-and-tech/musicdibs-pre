-- Reembolso manual: promo premium rechazada sin reembolso previo
DO $$
DECLARE
  v_user_id uuid := 'acdb7bd8-fb15-4b33-92ee-8fc8639cb7e7';
  v_promo_id uuid := 'fc620a3e-1a29-4443-8fb9-a7978bb72d70';
  v_amount int := 25;
  v_marker text := '[promo:fc620a3e-1a29-4443-8fb9-a7978bb72d70]';
  v_exists uuid;
BEGIN
  SELECT id INTO v_exists FROM credit_transactions
  WHERE user_id = v_user_id AND type = 'refund' AND description ILIKE '%' || v_marker || '%'
  LIMIT 1;

  IF v_exists IS NULL THEN
    UPDATE profiles
      SET available_credits = COALESCE(available_credits, 0) + v_amount,
          updated_at = now()
      WHERE user_id = v_user_id;

    INSERT INTO credit_transactions (user_id, amount, type, description)
    VALUES (v_user_id, v_amount, 'refund',
      'Reembolso promo rechazada: Dime Donde Esta Tu Casa, Tu Albe. ' || v_marker);
  END IF;
END $$;