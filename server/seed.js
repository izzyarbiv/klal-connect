// Seeds the categories the UI expects plus a small set of sample listings, so a
// fresh install isn't an empty shell. Safe to re-run: it skips anything already
// present rather than duplicating it.
import { store, users } from './db.js';
import { hashPassword } from './auth.js';

// `icon` must match a key in CategoryGrid's icon map, or the tile falls back to
// a generic glyph.
const CATEGORIES = [
  { name: 'Home Services',   icon: 'Home',            order: 1,  subcategories: ['Plumbing', 'Electrical', 'Cleaning', 'Handyman'] },
  { name: 'Business',        icon: 'BriefcaseBusiness', order: 2, subcategories: ['Accounting', 'Marketing', 'Bookkeeping'] },
  { name: 'Health',          icon: 'HeartPulse',      order: 3,  subcategories: ['Pediatrics', 'Dentistry', 'Therapy'] },
  { name: 'Legal',           icon: 'Scale',           order: 4,  subcategories: ['Immigration', 'Real Estate', 'Family Law'] },
  { name: 'Technology',      icon: 'Laptop',          order: 5,  subcategories: ['IT Support', 'Web Development'] },
  { name: 'Education',       icon: 'GraduationCap',   order: 6,  subcategories: ['Tutoring', 'Test Prep', 'Special Ed'] },
  { name: 'Food & Catering', icon: 'Utensils',        order: 7,  subcategories: ['Catering', 'Bakery', 'Restaurants'] },
  { name: 'Community',       icon: 'Users',           order: 8,  subcategories: ['Shuls', 'Schools', 'Youth'] },
  { name: 'Financial',       icon: 'Landmark',        order: 9,  subcategories: ['Mortgage', 'Insurance', 'Tax'] },
  { name: 'Gemachim',        icon: 'Gift',            order: 10, subcategories: ['Medical Equipment', 'Simcha', 'Baby'] },
  { name: 'Simcha Services', icon: 'ShieldCheck',     order: 11, subcategories: ['Photography', 'Music', 'Flowers'] },
];

const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

const PROVIDERS = [
  {
    name: 'Kleinman Plumbing & Heating', category: 'Home Services', subcategory: 'Plumbing',
    short_description: 'Licensed plumber serving the community for over 20 years.',
    tagline: 'Same-day emergency service', city: 'Lakewood', state: 'NJ', zip: '08701',
    phone: '(732) 555-0142', latitude: 40.0959, longitude: -74.2179,
    service_areas: ['Lakewood', 'Toms River', 'Jackson'], languages: ['English', 'Yiddish'],
    delivery_mode: 'in_person', verified: true,
  },
  {
    name: 'Bais Yaakov Tutoring Collective', category: 'Education', subcategory: 'Tutoring',
    short_description: 'One-on-one tutoring in limudei kodesh and secular subjects.',
    tagline: 'Grades 1–12, in person or remote', city: 'Brooklyn', state: 'NY', zip: '11219',
    phone: '(718) 555-0199', latitude: 40.6323, longitude: -73.9968,
    service_areas: ['Boro Park', 'Flatbush'], languages: ['English', 'Hebrew'],
    delivery_mode: 'both', verified: true,
  },
  {
    name: 'Refuah Medical Equipment Gemach', category: 'Gemachim', subcategory: 'Medical Equipment',
    short_description: 'Free loan of wheelchairs, crutches, hospital beds and nebulizers.',
    tagline: 'No cost, no deposit — just call', city: 'Monsey', state: 'NY', zip: '10952',
    phone: '(845) 555-0177', latitude: 41.1112, longitude: -74.0682,
    service_areas: ['Monsey', 'Spring Valley', 'New Square'], languages: ['English', 'Yiddish'],
    delivery_mode: 'in_person', verified: true,
  },
  {
    name: 'Adler & Weiss CPA', category: 'Financial', subcategory: 'Tax',
    short_description: 'Tax preparation and bookkeeping for small businesses and mosdos.',
    tagline: 'Non-profit and small business specialists', city: 'Lakewood', state: 'NJ', zip: '08701',
    phone: '(732) 555-0163', latitude: 40.0878, longitude: -74.2043,
    service_areas: ['Lakewood', 'Toms River'], languages: ['English'],
    delivery_mode: 'both', verified: false,
  },
  {
    name: 'Simcha Catering Co.', category: 'Food & Catering', subcategory: 'Catering',
    short_description: 'Full-service catering for weddings, bar mitzvahs and sheva brachos.',
    tagline: 'Cholov Yisroel · Pas Yisroel', city: 'Baltimore', state: 'MD', zip: '21215',
    phone: '(410) 555-0128', latitude: 39.3573, longitude: -76.6906,
    service_areas: ['Baltimore', 'Silver Spring'], languages: ['English'],
    delivery_mode: 'in_person', verified: true,
  },
  {
    name: 'Chesed Immigration Law', category: 'Legal', subcategory: 'Immigration',
    short_description: 'Visas, green cards and naturalization, with community references.',
    tagline: 'Free initial consultation', city: 'Brooklyn', state: 'NY', zip: '11204',
    phone: '(718) 555-0111', latitude: 40.6194, longitude: -73.9856,
    service_areas: ['Brooklyn', 'Queens'], languages: ['English', 'Russian', 'Hebrew'],
    delivery_mode: 'both', verified: false,
  },
];

function seedCategories() {
  let added = 0;
  for (const category of CATEGORIES) {
    if (store.filter('Category', { name: category.name }).length) continue;
    store.create('Category', { ...category, slug: slugify(category.name) });
    added++;
  }
  return added;
}

function seedProviders(owner) {
  let added = 0;
  for (const provider of PROVIDERS) {
    if (store.filter('Provider', { name: provider.name }).length) continue;
    store.create(
      'Provider',
      {
        ...provider,
        slug: slugify(provider.name),
        status: 'published',   // seeded listings skip the review queue
        claimed: false,
        save_count: 0,
        use_count: 0,
        demo: true,            // flagged so real listings are distinguishable
      },
      owner
    );
    added++;
  }
  return added;
}

const owner = users.all()[0] || null;
const categories = seedCategories();
const providers = seedProviders(owner ? { id: owner.id, email: owner.email } : null);

if (!owner) {
  console.log('[seed] No user yet — register in the app; the first account becomes admin.');
}
console.log(`[seed] categories added: ${categories} (total ${store.count('Category')})`);
console.log(`[seed] providers  added: ${providers} (total ${store.count('Provider')})`);
