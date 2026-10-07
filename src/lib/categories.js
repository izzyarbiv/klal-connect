// The categories the directory is built around.
//
// Shared because three places need the same list and had two of them: the
// seeder created them, the admin page let someone type them in one at a time,
// and nothing connected the two — so adding Shidduchim, Shuls & Minyanim and
// Other to this file did nothing for a directory already running, and putting
// them in by hand meant retyping the icon and the subcategories from memory.
//
// Adding one here is enough. The seeder picks it up on a fresh database, and
// Admin -> Categories offers it on a running one.
export const DIRECTORY_CATEGORIES = [
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
