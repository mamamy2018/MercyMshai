// The storefront catalog. Prices live in Stripe and are referenced by
// lookup_key, so you can change a price in the Dashboard without a deploy.
// `npm run seed` creates the matching Products and Prices in Stripe.
//
// format: 'digital' books are delivered by download link after payment;
// 'print' books ship, so Checkout collects a shipping address.
export const BOOKS = [
  {
    lookupKey: 'mshai_neurodivergent_digital_life_pdf',
    name: 'The Neurodivergent Digital Life',
    description: 'Practical ways to set up your devices, apps and online habits so they work with your brain.',
    category: 'Self-Development',
    format: 'digital',
    unitAmount: 1699,
  },
  {
    lookupKey: 'mshai_authentic_communicator_pdf',
    name: 'The Authentic Communicator',
    description: 'Speak and write with clarity and confidence while staying true to yourself.',
    category: 'Self-Development',
    format: 'digital',
    unitAmount: 1699,
  },
  {
    lookupKey: 'mshai_remote_conflict_playbook_pdf',
    name: 'The Remote Conflict Playbook',
    description: 'A step-by-step playbook for preventing and resolving conflict on remote and hybrid teams.',
    category: 'Self-Development',
    format: 'digital',
    unitAmount: 1699,
  },
  {
    lookupKey: 'mshai_young_entrepreneur_workbook_pdf',
    name: "The Young Entrepreneur's Business Workbook",
    description: 'Hands-on exercises that take young people from a business idea to a real plan.',
    category: 'Business',
    format: 'digital',
    unitAmount: 1899,
  },
  {
    lookupKey: 'mshai_coding_without_screens_pdf',
    name: 'Coding Without Screens: The Ultimate Guide to Teaching Logic and Computational Thinking',
    description: 'Screen-free activities that teach children logic and computational thinking.',
    category: 'Self-Development',
    format: 'digital',
    unitAmount: 2799,
  },
  {
    lookupKey: 'mshai_neurodivergent_time_system_pdf',
    name: 'The Neurodivergent Time System',
    description: 'A flexible system for planning your time and following through, built for neurodivergent minds.',
    category: 'Self-Development',
    format: 'digital',
    unitAmount: 1697,
  },
  {
    lookupKey: 'mshai_practical_homeschool_economist_pdf',
    name: 'The Practical Homeschool Economist: A Project Based Guide to Raising Financially Literate Teens',
    description: 'Real-world projects that teach teens how money works, from budgeting to earning and saving.',
    category: 'Business',
    format: 'digital',
    unitAmount: 1799,
  },
  {
    lookupKey: 'mshai_beyond_the_diagnosis_pdf',
    name: 'Beyond the Diagnosis: A Practical Guide to Navigating Special Needs Preschool',
    description: 'Clear guidance for parents finding the right support and setting for their child in the preschool years.',
    category: 'Self-Development',
    format: 'digital',
    unitAmount: 1499,
  },
];

export const CURRENCY = 'usd';

const byLookupKey = new Map(BOOKS.map((book) => [book.lookupKey, book]));

export function findBook(lookupKey) {
  return byLookupKey.get(lookupKey);
}
