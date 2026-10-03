import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

// Minimal order store so fulfillment is idempotent. Replace with your
// database before going live; the contract is the same: record each
// Checkout Session at most once.
export class FileOrderStore {
  constructor(path) {
    this.path = path;
    mkdirSync(dirname(path), { recursive: true });
    this.orders = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  }

  has(sessionId) {
    return sessionId in this.orders;
  }

  save(order) {
    this.orders[order.sessionId] = order;
    writeFileSync(this.path, JSON.stringify(this.orders, null, 2));
  }
}

// Called from the webhook for checkout.session.completed and
// checkout.session.async_payment_succeeded. Safe to call more than once
// for the same session: Stripe can deliver an event more than once, and
// both events fire for delayed payment methods.
export async function fulfillCheckout(stripe, store, sessionId) {
  if (store.has(sessionId)) return { status: 'already_fulfilled' };

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items'],
  });
  if (session.payment_status === 'unpaid') return { status: 'awaiting_payment' };
  if (store.has(sessionId)) return { status: 'already_fulfilled' };

  const order = {
    sessionId,
    paymentIntent: session.payment_intent,
    email: session.customer_details?.email ?? null,
    amountTotal: session.amount_total,
    currency: session.currency,
    shipping: session.collected_information?.shipping_details ?? null,
    items: session.line_items.data.map((item) => ({
      price: item.price?.id,
      lookupKey: item.price?.lookup_key,
      description: item.description,
      quantity: item.quantity,
    })),
    fulfilledAt: new Date().toISOString(),
  };
  store.save(order);

  // TODO: send download links for digital books and queue print books for
  // shipping (e.g. email via your provider, or create a print-on-demand order).
  console.log(`Fulfilled order ${sessionId} for ${order.email}`);
  return { status: 'fulfilled', order };
}
