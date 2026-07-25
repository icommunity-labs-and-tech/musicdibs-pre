/**
 * Canonical Stripe price → plan mappings for MusicDibs.
 * Single source of truth — imported by stripe-webhook, check-subscription,
 * and process-subscription-renewals.
 *
 * Price ID prefixes:
 *   F9ZCIiqrz6 = current live account prices
 *   FULeu7PzK6 / TMapTF = legacy prices
 */

/** price_id → credits granted on subscription/renewal */
export const PRICE_CREDITS: Record<string, number> = {
  // ── Current prices (F9ZCIiqrz6) ──────────────────────────────────────────
  "price_1T9TnyF9ZCIiqrz6ruOlBcnZ": 120,   // annual_legacy
  "price_1THT7cF9ZCIiqrz6sWS67Q4V": 100,   // annual_100
  "price_1THT7gF9ZCIiqrz6Acb2CkDC": 200,   // annual_200
  "price_1THT7jF9ZCIiqrz6i02J4bj4": 300,   // annual_300
  "price_1THT7nF9ZCIiqrz6r1ZcqH8L": 500,   // annual_500
  "price_1THT7rF9ZCIiqrz6UmJDkBNZ": 1000,  // annual_1000
  "price_1T9SZvF9ZCIiqrz6TWLtfMBs": 8,     // monthly
  "price_1THULsF9ZCIiqrz64SbA3AK6": 1,     // individual
  "price_1THT7xF9ZCIiqrz60FfiGbfv": 10,    // topup_10
  "price_1THT80F9ZCIiqrz6H31dYDMG": 25,    // topup_25
  "price_1THT83F9ZCIiqrz6BD2wmUaO": 50,    // topup_50
  "price_1THT86F9ZCIiqrz6C548DJnT": 100,   // topup_100
  "price_1THT8AF9ZCIiqrz626wSH9Rz": 200,   // topup_200
  // ── Legacy prices (FULeu7PzK6) ───────────────────────────────────────────
  "price_1T8n6CFULeu7PzK6vs7NZyiJ": 100,   // annual_100 legacy
  "price_1T8n6lFULeu7PzK60TbO76hE": 8,     // monthly legacy
  "price_1TMapTFULeu7PzK640B5uuEq": 200,   // annual_200
  "price_1TMapTFULeu7PzK6D4GnB3Il": 300,   // annual_300
  "price_1TMapTFULeu7PzK6cNJMf2oL": 500,   // annual_500
  "price_1TMapTFULeu7PzK6ziUW5fLn": 1000,  // annual_1000
  // FIX 2026-07-25: annual_20 (price_1Tp90n...) faltaba por completo en este
  // archivo -- causa raiz confirmada de por que profiles.subscription_plan/
  // tier se reseteaba repetidamente a "Monthly"/null para compradores de
  // annual_20 (yaugika@gmail.com, jmontoyataber@gmail.com, y otros), cada
  // vez que check-subscription se ejecutaba (cada carga de dashboard) y no
  // encontraba el priceId en estos mapas, cayendo al fallback "Monthly".
  "price_1Tp90nFULeu7PzK67hoGodWv": 20,    // annual_20
  // FIX 2026-07-25 (segunda pasada): un lote ENTERO de price_ids
  // (TMDVk/TMDVw/TMDW3) ya presente y correcto en stripe-webhook faltaba
  // tambien por completo aqui -- mismo bug, mas cuentas potencialmente
  // afectadas.
  "price_1TMDVkFULeu7PzK6aNdFYW91": 1,     // individual
  "price_1TMDVkFULeu7PzK6YxaKfBiJ": 10,    // topup_10
  "price_1TMDVkFULeu7PzK62A2zwaDO": 25,    // topup_25
  "price_1TMDVkFULeu7PzK6PcMnQkWZ": 50,    // topup_50
  "price_1TMDVkFULeu7PzK6AJC3o4lZ": 100,   // topup_100
  "price_1TMDVkFULeu7PzK6e9omPpoB": 200,   // topup_200
  "price_1TMDVwFULeu7PzK6laW4n6wu": 100,   // annual_100
  "price_1TMDVwFULeu7PzK6ZnMqrW1c": 200,   // annual_200
  "price_1TMDVwFULeu7PzK6S22WkY3w": 300,   // annual_300
  "price_1TMDVwFULeu7PzK6mSwmx29Z": 500,   // annual_500
  "price_1TMDVwFULeu7PzK68TlUbof2": 1000,  // annual_1000
  "price_1TMDW3FULeu7PzK6468wsXJt": 8,     // monthly
};

/** price_id → plan display name ("Annual" | "Monthly") */
export const PRICE_PLAN: Record<string, string> = {
  "price_1T9TnyF9ZCIiqrz6ruOlBcnZ": "Annual",
  "price_1THT7cF9ZCIiqrz6sWS67Q4V": "Annual",
  "price_1THT7gF9ZCIiqrz6Acb2CkDC": "Annual",
  "price_1THT7jF9ZCIiqrz6i02J4bj4": "Annual",
  "price_1THT7nF9ZCIiqrz6r1ZcqH8L": "Annual",
  "price_1THT7rF9ZCIiqrz6UmJDkBNZ": "Annual",
  "price_1T9SZvF9ZCIiqrz6TWLtfMBs": "Monthly",
  "price_1T8n6CFULeu7PzK6vs7NZyiJ": "Annual",
  "price_1T8n6lFULeu7PzK60TbO76hE": "Monthly",
  "price_1TMapTFULeu7PzK640B5uuEq": "Annual",
  "price_1TMapTFULeu7PzK6D4GnB3Il": "Annual",
  "price_1TMapTFULeu7PzK6cNJMf2oL": "Annual",
  "price_1TMapTFULeu7PzK6ziUW5fLn": "Annual",
  "price_1Tp90nFULeu7PzK67hoGodWv": "Annual", // annual_20 (ver FIX 2026-07-25 arriba)
  "price_1TMDVkFULeu7PzK6aNdFYW91": "Individual",
  "price_1TMDVwFULeu7PzK6laW4n6wu": "Annual",
  "price_1TMDVwFULeu7PzK6ZnMqrW1c": "Annual",
  "price_1TMDVwFULeu7PzK6S22WkY3w": "Annual",
  "price_1TMDVwFULeu7PzK6mSwmx29Z": "Annual",
  "price_1TMDVwFULeu7PzK68TlUbof2": "Annual",
  "price_1TMDW3FULeu7PzK6468wsXJt": "Monthly",
};

/**
 * price_id → internal tier/plan_id.
 * NOTE: price_1TMapTFULeu7PzK6cNJMf2oL was incorrectly mapped to "annual_400"
 * in check-subscription and process-subscription-renewals — fixed here.
 */
export const PRICE_TO_TIER: Record<string, string> = {
  "price_1T9TnyF9ZCIiqrz6ruOlBcnZ": "annual_legacy",
  "price_1THT7cF9ZCIiqrz6sWS67Q4V": "annual_100",
  "price_1THT7gF9ZCIiqrz6Acb2CkDC": "annual_200",
  "price_1THT7jF9ZCIiqrz6i02J4bj4": "annual_300",
  "price_1THT7nF9ZCIiqrz6r1ZcqH8L": "annual_500",
  "price_1THT7rF9ZCIiqrz6UmJDkBNZ": "annual_1000",
  "price_1T9SZvF9ZCIiqrz6TWLtfMBs": "monthly",
  "price_1THULsF9ZCIiqrz64SbA3AK6": "individual",
  "price_1THT7xF9ZCIiqrz60FfiGbfv": "topup_10",
  "price_1THT80F9ZCIiqrz6H31dYDMG": "topup_25",
  "price_1THT83F9ZCIiqrz6BD2wmUaO": "topup_50",
  "price_1THT86F9ZCIiqrz6C548DJnT": "topup_100",
  "price_1THT8AF9ZCIiqrz626wSH9Rz": "topup_200",
  "price_1T8n6CFULeu7PzK6vs7NZyiJ": "annual_100",
  "price_1T8n6lFULeu7PzK60TbO76hE": "monthly",
  "price_1TMapTFULeu7PzK640B5uuEq": "annual_200",
  "price_1TMapTFULeu7PzK6D4GnB3Il": "annual_300",
  "price_1TMapTFULeu7PzK6cNJMf2oL": "annual_500",   // was "annual_400" — fixed
  "price_1TMapTFULeu7PzK6ziUW5fLn": "annual_1000",  // was "annual_500" — fixed
  "price_1Tp90nFULeu7PzK67hoGodWv": "annual_20",     // ver FIX 2026-07-25 arriba
  "price_1TMDVkFULeu7PzK6aNdFYW91": "individual",
  "price_1TMDVkFULeu7PzK6YxaKfBiJ": "topup_10",
  "price_1TMDVkFULeu7PzK62A2zwaDO": "topup_25",
  "price_1TMDVkFULeu7PzK6PcMnQkWZ": "topup_50",
  "price_1TMDVkFULeu7PzK6AJC3o4lZ": "topup_100",
  "price_1TMDVkFULeu7PzK6e9omPpoB": "topup_200",
  "price_1TMDVwFULeu7PzK6laW4n6wu": "annual_100",
  "price_1TMDVwFULeu7PzK6ZnMqrW1c": "annual_200",
  "price_1TMDVwFULeu7PzK6S22WkY3w": "annual_300",
  "price_1TMDVwFULeu7PzK6mSwmx29Z": "annual_500",
  "price_1TMDVwFULeu7PzK68TlUbof2": "annual_1000",
  "price_1TMDW3FULeu7PzK6468wsXJt": "monthly",
};

/** tier → credits (canonical amounts) */
export const TIER_CREDITS: Record<string, number> = {
  monthly:     8,
  annual_20:   20,
  annual_100:  100,
  annual_200:  200,
  annual_300:  300,
  annual_500:  500,
  annual_1000: 1000,
};

/** tier → Stripe price ID (legacy FULeu7PzK6 prices, used for subscription creation in renewals) */
export const TIER_TO_PRICE_ID: Record<string, string> = {
  monthly:     "price_1T8n6lFULeu7PzK60TbO76hE",
  annual_20:   "price_1Tp90nFULeu7PzK67hoGodWv",
  annual_100:  "price_1T8n6CFULeu7PzK6vs7NZyiJ",
  annual_200:  "price_1TMapTFULeu7PzK640B5uuEq",
  annual_300:  "price_1TMapTFULeu7PzK6D4GnB3Il",
  annual_500:  "price_1TMapTFULeu7PzK6cNJMf2oL",
  annual_1000: "price_1TMapTFULeu7PzK6ziUW5fLn",
};
