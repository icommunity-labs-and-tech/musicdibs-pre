
INSERT INTO public.credit_transactions (user_id, amount, type, description) VALUES
('c72b0503-c665-4354-932d-14603e4605de', 1, 'refund', 'Reembolso manual (edge function falló tras descuento, sin refund automático): registro Sem Nome 12/05 13:13'),
('c72b0503-c665-4354-932d-14603e4605de', 1, 'refund', 'Reembolso manual (edge function falló tras descuento, sin refund automático): registro fragmentos 12/05 13:24');

UPDATE public.profiles SET available_credits = available_credits + 2 WHERE user_id = 'c72b0503-c665-4354-932d-14603e4605de';
