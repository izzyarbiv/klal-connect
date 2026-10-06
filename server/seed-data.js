// Demo content: the categories the UI expects plus a small set of listings.
// Safe to run repeatedly — it skips anything already present.
import { store } from './db.js';
import { stableId } from './db-shared.js';

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
  // Resources and contacts only — shadchanim and the shidduch organisations
  // people already use. Deliberately not profiles or matching: who is dating is
  // nobody else's business, which is also why @/lib/sensitivity treats anything
  // in here as private (no public "used this", no named vouches).
  { name: 'Shidduchim',      icon: 'HandHeart',       order: 12, subcategories: ['Shadchanim', 'Shidduch organizations', 'Dating coaches'] },
  // Shuls are one of the six things the homepage offers to search for, and had
  // no category of their own — only a subcategory of Community, which the
  // listing form never offers.
  { name: 'Shuls & Minyanim', icon: 'Landmark',       order: 13, subcategories: ['Shuls', 'Minyanim', 'Botei Medrash'] },
  // Last on purpose, and the reason it exists: category is required on the
  // listing form, so anything the list does not name could not be listed at
  // all. A directory should never refuse a resource for want of a heading. The
  // subcategory field is where it says what it actually is.
  { name: 'Other',           icon: 'MoreHorizontal', order: 99, subcategories: [] },
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

export async function seedCategories() {
  let added = 0;
  for (const category of CATEGORIES) {
    if ((await store.filter('Category', { name: category.name })).length) continue;
    await store.create('Category', {
      ...category,
      id: stableId('Category', category.name),
      slug: slugify(category.name),
    });
    added++;
  }
  return added;
}

async function seedProviders(owner) {
  let added = 0;
  for (const provider of PROVIDERS) {
    if ((await store.filter('Provider', { name: provider.name })).length) continue;
    await store.create(
      'Provider',
      {
        ...provider,
        id: stableId('Provider', provider.name),
        slug: slugify(provider.name),
        status: 'published',   // seeded listings skip the review queue
        claimed: false,
        save_count: 0,
        usage_count: 0,
        demo: true,            // flagged so real listings are distinguishable
      },
      owner
    );
    added++;
  }
  return added;
}

/** Seeds categories and sample listings. @returns {{categories:number, providers:number}} */
export async function seedAll(owner = null) {
  const categories = await seedCategories();
  const providers = await seedProviders(owner);
  return { categories, providers };
}
