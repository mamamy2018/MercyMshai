// The storefront catalog. Prices live in Stripe and are referenced by
// lookup_key, so you can change a price in the Dashboard without a deploy.
// `npm run seed` creates the matching Products and Prices in Stripe.
//
// format: 'digital' books are delivered by download link after payment;
// 'print' books ship, so Checkout collects a shipping address.
export const BOOKS = [
  {
    lookupKey: 'mshai_screen_free_stem_print',
    name: 'Screen-Free STEM Activities',
    description: 'Hands-on science, technology, engineering and maths activities for curious kids.',
    format: 'print',
    unitAmount: 1899,
  },
  {
    lookupKey: 'mshai_productivity_systems_ebook',
    name: 'Practical Productivity Systems',
    description: 'Build simple systems that keep your work and life moving forward.',
    format: 'digital',
    unitAmount: 999,
  },
  {
    lookupKey: 'mshai_neurodivergent_guide_ebook',
    name: 'Everyday Guide for Neurodivergent Minds',
    description: 'Practical strategies for focus, planning and everyday life.',
    format: 'digital',
    unitAmount: 1199,
  },
  {
    lookupKey: 'mshai_money_basics_print',
    name: 'Money, Work and Everyday Life',
    description: 'A clear, practical guide to managing money and building a better path forward.',
    format: 'print',
    unitAmount: 2199,
  },
];

export const CURRENCY = 'usd';

const byLookupKey = new Map(BOOKS.map((book) => [book.lookupKey, book]));

export function findBook(lookupKey) {
  return byLookupKey.get(lookupKey);
}
