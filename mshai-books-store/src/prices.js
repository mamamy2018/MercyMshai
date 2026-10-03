// Stripe accepts at most 10 lookup_keys per prices.list call.
const LOOKUP_KEYS_PER_REQUEST = 10;

// Returns a Map of lookup_key -> Price for the given keys.
export async function pricesByLookupKey(stripe, lookupKeys, { activeOnly = false } = {}) {
  const prices = new Map();
  for (let i = 0; i < lookupKeys.length; i += LOOKUP_KEYS_PER_REQUEST) {
    const batch = lookupKeys.slice(i, i + LOOKUP_KEYS_PER_REQUEST);
    const { data } = await stripe.prices.list({
      lookup_keys: batch,
      limit: batch.length,
      ...(activeOnly && { active: true }),
    });
    for (const price of data) prices.set(price.lookup_key, price);
  }
  return prices;
}
