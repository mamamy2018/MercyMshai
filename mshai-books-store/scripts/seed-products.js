// Creates a Stripe Product and Price for each book in the catalog.
// Safe to re-run: books whose lookup_key already has a Price are skipped.
import { BOOKS, CURRENCY } from '../src/catalog.js';
import { stripe } from '../src/stripe.js';

const { data: existing } = await stripe.prices.list({
  lookup_keys: BOOKS.map((book) => book.lookupKey),
  limit: BOOKS.length,
});
const existingKeys = new Set(existing.map((price) => price.lookup_key));

for (const book of BOOKS) {
  if (existingKeys.has(book.lookupKey)) {
    console.log(`skip    ${book.lookupKey} (already exists)`);
    continue;
  }
  const product = await stripe.products.create({
    name: book.name,
    description: book.description,
    metadata: { format: book.format },
    default_price_data: { currency: CURRENCY, unit_amount: book.unitAmount },
  });
  await stripe.prices.update(product.default_price, { lookup_key: book.lookupKey });
  console.log(`created ${book.lookupKey} -> ${product.id}`);
}
