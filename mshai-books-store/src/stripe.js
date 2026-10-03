import Stripe from 'stripe';

const apiKey = process.env.STRIPE_API_KEY;
if (!apiKey) {
  throw new Error('STRIPE_API_KEY is not set. See .env.example.');
}

// One client instance for the whole app, pinned to the API version this
// code was written against so a Dashboard upgrade can't change behavior.
export const stripe = new Stripe(apiKey, {
  apiVersion: '2026-08-26.dahlia',
  appInfo: { name: 'mshai-books-store', url: 'https://mshaibooks.com' },
});
