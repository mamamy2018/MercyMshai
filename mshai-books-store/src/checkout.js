import { CURRENCY, findBook } from './catalog.js';
import { pricesByLookupKey } from './prices.js';

// Tags every session so this flow can be tracked in the Dashboard.
const INTEGRATION_IDENTIFIER = 'mshaibooks_web_checkout_hqtzmwrd';
const MAX_QUANTITY = 10;

export class CartError extends Error {}

// Turns an untrusted cart from the browser into validated line items.
// Only lookup keys from our catalog are accepted; prices always come from Stripe.
export function parseCart(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new CartError('Your cart is empty.');
  }
  const quantities = new Map();
  for (const item of items) {
    const book = findBook(item?.lookupKey);
    const quantity = Number(item?.quantity);
    if (!book) throw new CartError('Unknown book in cart.');
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new CartError(`Quantity must be between 1 and ${MAX_QUANTITY}.`);
    }
    quantities.set(book.lookupKey, Math.min((quantities.get(book.lookupKey) ?? 0) + quantity, MAX_QUANTITY));
  }
  return [...quantities].map(([lookupKey, quantity]) => ({ book: findBook(lookupKey), quantity }));
}

export async function createCheckoutSession(stripe, { items, publicUrl, shippingCountries }) {
  const cart = parseCart(items);
  const priceByKey = await pricesByLookupKey(stripe, cart.map(({ book }) => book.lookupKey), { activeOnly: true });

  const lineItems = cart.map(({ book, quantity }) => {
    const price = priceByKey.get(book.lookupKey);
    if (!price) throw new Error(`No active Stripe price for ${book.lookupKey}. Run \`npm run seed\`.`);
    return { price: price.id, quantity };
  });
  const needsShipping = cart.some(({ book }) => book.format === 'print');

  // payment_method_types is intentionally omitted so Stripe shows the best
  // payment methods enabled in the Dashboard for each customer.
  return stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    currency: CURRENCY,
    allow_promotion_codes: true,
    customer_creation: 'always',
    integration_identifier: INTEGRATION_IDENTIFIER,
    ...(needsShipping && {
      shipping_address_collection: { allowed_countries: shippingCountries },
    }),
    success_url: `${publicUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${publicUrl}/?canceled=1`,
  });
}
