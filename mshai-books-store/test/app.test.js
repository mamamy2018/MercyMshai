import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Stripe from 'stripe';
import { createApp } from '../src/app.js';
import { parseCart, CartError } from '../src/checkout.js';
import { FileOrderStore } from '../src/fulfillment.js';

const webhookSecret = 'whsec_test_secret';
// Real SDK for webhook signing/verification; API calls are stubbed below.
const real = new Stripe('sk_test_dummy');
const calls = { create: [], retrieve: [] };
let paymentStatus = 'paid';

const stripe = {
  webhooks: real.webhooks,
  prices: {
    list: async ({ lookup_keys }) => ({
      data: lookup_keys.map((key) => ({ id: `price_${key}`, lookup_key: key })),
    }),
  },
  checkout: {
    sessions: {
      create: async (params) => {
        calls.create.push(params);
        return { id: 'cs_test_123', url: 'https://checkout.stripe.com/c/pay/cs_test_123' };
      },
      retrieve: async (id) => {
        calls.retrieve.push(id);
        return {
          id,
          status: 'complete',
          payment_status: paymentStatus,
          payment_intent: 'pi_123',
          amount_total: 999,
          currency: 'usd',
          customer_details: { email: 'reader@example.com' },
          line_items: { data: [{ price: { id: 'price_x', lookup_key: 'x' }, description: 'Book', quantity: 1 }] },
        };
      },
    },
  },
};

let server;
let base;
let store;

before(async () => {
  store = new FileOrderStore(join(mkdtempSync(join(tmpdir(), 'orders-')), 'orders.json'));
  const app = createApp({ stripe, store, webhookSecret, publicUrl: 'https://mshaibooks.com', shippingCountries: ['US'] });
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

function sendEvent(type, sessionId, { secret = webhookSecret } = {}) {
  const payload = JSON.stringify({ id: `evt_${type}`, object: 'event', type, data: { object: { id: sessionId } } });
  const header = real.webhooks.generateTestHeaderString({ payload, secret });
  return fetch(`${base}/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Stripe-Signature': header },
    body: payload,
  });
}

test('parseCart rejects unknown books and bad quantities', () => {
  assert.throws(() => parseCart([]), CartError);
  assert.throws(() => parseCart([{ lookupKey: 'nope', quantity: 1 }]), CartError);
  assert.throws(() => parseCart([{ lookupKey: 'mshai_productivity_systems_ebook', quantity: 0 }]), CartError);
  assert.throws(() => parseCart([{ lookupKey: 'mshai_productivity_systems_ebook', quantity: 1.5 }]), CartError);
});

test('parseCart merges duplicate lines', () => {
  const cart = parseCart([
    { lookupKey: 'mshai_productivity_systems_ebook', quantity: 2 },
    { lookupKey: 'mshai_productivity_systems_ebook', quantity: 3 },
  ]);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 5);
});

test('creates a Checkout Session without payment_method_types', async () => {
  const res = await fetch(`${base}/api/checkout-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ lookupKey: 'mshai_productivity_systems_ebook', quantity: 1 }] }),
  });
  assert.equal(res.status, 200);
  assert.match((await res.json()).url, /^https:\/\/checkout\.stripe\.com/);
  const params = calls.create.at(-1);
  assert.equal(params.mode, 'payment');
  assert.equal(params.payment_method_types, undefined);
  assert.equal(params.shipping_address_collection, undefined);
  assert.deepEqual(params.line_items, [{ price: 'price_mshai_productivity_systems_ebook', quantity: 1 }]);
  assert.match(params.success_url, /\{CHECKOUT_SESSION_ID\}/);
});

test('collects shipping when a print book is in the cart', async () => {
  await fetch(`${base}/api/checkout-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ lookupKey: 'mshai_screen_free_stem_print', quantity: 2 }] }),
  });
  assert.deepEqual(calls.create.at(-1).shipping_address_collection, { allowed_countries: ['US'] });
});

test('rejects a bad cart with 400', async () => {
  const res = await fetch(`${base}/api/checkout-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ lookupKey: 'mshai_free_book', quantity: 1 }] }),
  });
  assert.equal(res.status, 400);
});

test('webhook rejects an invalid signature', async () => {
  const res = await sendEvent('checkout.session.completed', 'cs_test_forged', { secret: 'whsec_wrong' });
  assert.equal(res.status, 400);
  assert.equal(store.has('cs_test_forged'), false);
});

test('webhook does not fulfill an unpaid session, then fulfills on async success', async () => {
  paymentStatus = 'unpaid';
  assert.equal((await sendEvent('checkout.session.completed', 'cs_test_async')).status, 200);
  assert.equal(store.has('cs_test_async'), false);

  paymentStatus = 'paid';
  assert.equal((await sendEvent('checkout.session.async_payment_succeeded', 'cs_test_async')).status, 200);
  assert.equal(store.has('cs_test_async'), true);
});

test('webhook fulfillment is idempotent on redelivery', async () => {
  paymentStatus = 'paid';
  await sendEvent('checkout.session.completed', 'cs_test_dupe');
  const retrievesBefore = calls.retrieve.length;
  assert.equal((await sendEvent('checkout.session.completed', 'cs_test_dupe')).status, 200);
  assert.equal(calls.retrieve.length, retrievesBefore);
});

test('order status endpoint validates the session id', async () => {
  assert.equal((await fetch(`${base}/api/checkout-sessions/not-a-session`)).status, 400);
  const res = await fetch(`${base}/api/checkout-sessions/cs_test_dupe`);
  assert.deepEqual(await res.json(), { status: 'complete', paymentStatus: 'paid', email: 'reader@example.com' });
});
