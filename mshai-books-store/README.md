# Mshai Books Store: Stripe Payments

A small storefront for [mshaibooks.com](https://mshaibooks.com) that sells eBooks and print books through **Stripe Checkout**, the Stripe-hosted payment page.

- **Checkout Sessions API**, `mode: 'payment'`, Stripe-hosted page. Card details never touch this server.
- **Dynamic payment methods.** The code never sets `payment_method_types`. You choose cards, Apple Pay, Google Pay, Link and others in the [Dashboard](https://dashboard.stripe.com/settings/payment_methods), with no code change.
- **Prices live in Stripe**, referenced by `lookup_key`. You can change a price in the Dashboard without redeploying.
- **Fulfillment runs in a verified webhook**, not on the success page. It handles `checkout.session.completed` and `checkout.session.async_payment_succeeded`, and only when the session is paid. It is idempotent, so redelivered events never double-fulfill.
- Shipping addresses are collected only when the cart contains a print book. Promotion codes are enabled.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/catalog.js` | The books for sale (name, format, lookup key, seed price) |
| `src/checkout.js` | Validates the cart and creates the Checkout Session |
| `src/fulfillment.js` | Idempotent order recording, where you add email and download delivery |
| `src/app.js` | Express routes: `/api/books`, `/api/checkout-sessions`, `/webhook` |
| `scripts/seed-products.js` | Creates the Products and Prices in Stripe (safe to re-run) |
| `public/` | Shop page and order confirmation page |

## Run it locally (test mode)

1. **Get test API keys.** In the Stripe Dashboard (test mode), create a **restricted key** (`rk_test_…`) with *Checkout Sessions: Write* and *Prices: Read*. If you don't have an account yet, `npm i -g @stripe/cli && stripe sandbox create` makes a [sandbox](https://docs.stripe.com/sandboxes.md) with test keys.
2. **Configure.**
   ```sh
   cd mshai-books-store
   npm install
   cp .env.example .env   # fill in STRIPE_API_KEY
   ```
3. **Create the products in Stripe.** Run this once, with a key that also has *Products: Write* and *Prices: Write*:
   ```sh
   STRIPE_API_KEY=rk_test_seed_key npm run seed
   ```
4. **Forward webhooks** with the [Stripe CLI](https://docs.stripe.com/stripe-cli.md). Copy the `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET`:
   ```sh
   stripe listen --forward-to localhost:4242/webhook \
     --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed
   ```
5. **Start the shop** with `npm start`, then open http://localhost:4242. Pay with test card `4242 4242 4242 4242`, any future expiry date and any CVC. Paid orders appear in `data/orders.json`.

Run `npm test` to execute the offline test suite. It needs no Stripe keys.

## Before going live

- [ ] **Deliver the goods.** Fill in the `TODO` in `src/fulfillment.js`: email download links for eBooks, and send print orders to your printer or shipping provider.
- [ ] **Replace `FileOrderStore`** with a real database. The JSON file is for development only.
- [ ] **Shipping.** Add [shipping rates](https://docs.stripe.com/payments/during-payment/charge-shipping.md) for print books, and set `SHIPPING_COUNTRIES` (default `US,CA,GB`).
- [ ] **Sales tax / VAT.** Digital goods are taxable in many places. Set up [Stripe Tax](https://docs.stripe.com/tax.md) and **add a tax registration first**, then add `automatic_tax: { enabled: true }` to the session. Without a registration, Stripe collects no tax.
- [ ] **Production webhook.** Create an endpoint at `https://<your-domain>/webhook` in the Dashboard with the three events above, and use its signing secret.
- [ ] **Live keys.** Create a live restricted key and keep it, along with the webhook secret, in your host's secrets manager. Never put them in code or a committed file.
- [ ] Add a `Content-Security-Policy` header to the site.
- [ ] Turn on passkey or authenticator-app 2FA for your Stripe account.
- [ ] Work through Stripe's [go-live checklist](https://docs.stripe.com/get-started/checklist/go-live.md).

### Optional: block accidental key commits

```sh
ln -s ../../mshai-books-store/scripts/pre-commit .git/hooks/pre-commit
```
