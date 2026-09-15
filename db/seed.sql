-- Run only in a fresh development database. IDs 1–100 belong to the sample set.
INSERT INTO postcards (id, title, place, image_url, width, height)
SELECT id, 'Split Rock', 'Lake Harmony, Pocono Mountains, Pennsylvania, United States',
  '/images/split-rock-postcard.png', 2064, 2620
FROM generate_series(1, 100) AS id
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('postcards', 'id'), GREATEST((SELECT max(id) FROM postcards), 100));
