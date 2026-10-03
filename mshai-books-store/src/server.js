import { createApp } from './app.js';
import { FileOrderStore } from './fulfillment.js';
import { stripe } from './stripe.js';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is not set. See .env.example.');

const port = Number(process.env.PORT ?? 4242);
const app = createApp({
  stripe,
  store: new FileOrderStore(new URL('../data/orders.json', import.meta.url).pathname),
  webhookSecret,
  publicUrl: (process.env.PUBLIC_URL ?? `http://localhost:${port}`).replace(/\/$/, ''),
  shippingCountries: (process.env.SHIPPING_COUNTRIES ?? 'US,CA,GB').split(',').map((c) => c.trim()),
});

app.listen(port, () => console.log(`Mshai Books store running on http://localhost:${port}`));
