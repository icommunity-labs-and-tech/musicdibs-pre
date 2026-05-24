UPDATE purchase_evidences
SET product_name = 'Cambio a annual_100', product_type = 'annual'
WHERE id = '65588043-14ae-49e0-b9c9-b8e24e80dfc5';

UPDATE orders
SET product_code = 'annual_100', product_label = 'Cambio a annual_100', product_type = 'annual'
WHERE id = 'cc89cd33-6bf3-4010-88c3-1cc7d551e28a';

UPDATE profiles SET subscription_tier = 'annual_100'
WHERE user_id = '963e96f8-f446-4b5d-a254-ea3ceff684c4' AND (subscription_tier IS NULL OR subscription_tier = '');

UPDATE subscriptions SET tier = 'annual_100'
WHERE user_id = '963e96f8-f446-4b5d-a254-ea3ceff684c4' AND tier IS NULL;