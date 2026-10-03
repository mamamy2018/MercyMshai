import express from 'express';
import { BOOKS, CURRENCY } from './catalog.js';
import { CartError, createCheckoutSession } from './checkout.js';
import { fulfillCheckout } from './fulfillment.js';

export function createApp({ stripe, store, webhookSecret, publicUrl, shippingCountries }) {
  const app = express();

  // The webhook needs the raw body for signature verification, so it is
  // registered before express.json().
  app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], webhookSecret);
    } catch (err) {
      console.warn(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send('Invalid signature');
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded':
          await fulfillCheckout(stripe, store, event.data.object.id);
          break;
        case 'checkout.session.async_payment_failed':
          // TODO: email the customer that their payment didn't go through.
          console.log(`Payment failed for ${event.data.object.id}`);
          break;
        default:
          break;
      }
    } catch (err) {
      // A non-2xx response makes Stripe retry the event later.
      console.error(`Failed to handle ${event.type} ${event.id}: ${err.message}`);
      return res.status(500).send('Webhook handler error');
    }
    res.json({ received: true });
  });

  app.use(express.json({ limit: '10kb' }));
  app.use(express.static(new URL('../public', import.meta.url).pathname));

  app.get('/api/books', (_req, res) => {
    res.json({ currency: CURRENCY, books: BOOKS });
  });

  app.post('/api/checkout-sessions', async (req, res) => {
    try {
      const session = await createCheckoutSession(stripe, {
        items: req.body?.items,
        publicUrl,
        shippingCountries,
      });
      res.json({ url: session.url });
    } catch (err) {
      if (err instanceof CartError) return res.status(400).json({ error: err.message });
      console.error(`Checkout Session creation failed: ${err.message}`);
      res.status(500).json({ error: 'Could not start checkout. Please try again.' });
    }
  });

  // Lets the success page show order status. This is display only;
  // fulfillment happens in the webhook.
  app.get('/api/checkout-sessions/:id', async (req, res) => {
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(req.params.id)) {
      return res.status(400).json({ error: 'Invalid session id.' });
    }
    try {
      const session = await stripe.checkout.sessions.retrieve(req.params.id);
      res.json({
        status: session.status,
        paymentStatus: session.payment_status,
        email: session.customer_details?.email ?? null,
      });
    } catch {
      res.status(404).json({ error: 'Order not found.' });
    }
  });

  return app;
}
