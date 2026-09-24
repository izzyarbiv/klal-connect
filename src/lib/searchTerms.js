// Search aliases.
//
// Two things break plain substring search in a directory like this one.
//
// Transliterated Hebrew and Yiddish has no canonical spelling: mikvah, mikva,
// mikveh and mikvas are the same place, and whoever is typing will not guess
// which one it was filed under. And the word people search is rarely the word
// a category is named — nobody looks for "Plumbing", they look for a
// "plumber"; "exterminator" and "pest control" are one job.
//
// Each group below is a set of interchangeable terms. Typing any member
// searches for all of them, so spelling stops deciding whether someone finds
// help. Add to it freely — a missing alias is a search that silently fails.
const GROUPS = [
  // Home and trades
  ['plumber', 'plumbers', 'plumbing'],
  ['electrician', 'electricians', 'electrical', 'electric'],
  ['exterminator', 'pest control', 'pest'],
  ['handyman', 'handy man', 'repair', 'repairs'],
  ['cleaner', 'cleaners', 'cleaning', 'housekeeping', 'housekeeper'],
  ['locksmith', 'locks'],
  ['mover', 'movers', 'moving'],
  ['contractor', 'contracting', 'renovation', 'renovations'],
  ['painter', 'painting'],
  ['landscaper', 'landscaping', 'gardener', 'lawn'],
  ['appliance repair', 'appliances'],
  ['hvac', 'air conditioning', 'heating', 'ac repair'],

  // Jewish community life
  ['mikvah', 'mikva', 'mikveh', 'mikvas', 'mikvaos', 'mikvahs'],
  ['shul', 'shuls', 'synagogue', 'synagogues', 'beis medrash', 'bais medrash', 'minyan', 'minyanim'],
  ['gemach', 'gemachim', 'gemachs', 'gemmach'],
  ['yeshiva', 'yeshivah', 'yeshivas', 'yeshivos', 'mesivta'],
  ['cheder', 'chadarim', 'day school'],
  ['seminary', 'seminaries'],
  ['kollel', 'kollelim'],
  ['shidduch', 'shidduchim', 'shadchan', 'shadchanim', 'matchmaker', 'matchmaking'],
  ['mohel', 'mohelim', 'bris'],
  ['sofer', 'sofrim', 'scribe', 'stam'],
  ['sheitel', 'sheitl', 'shaitel', 'sheitels', 'wig', 'wigs', 'wig macher'],
  ['chesed', 'chessed'],
  ['bikur cholim', 'bikkur cholim'],
  ['chevra kadisha', 'chevrah kadisha'],
  ['eruv', 'eiruv'],
  ['kashrus', 'kashrut', 'hashgacha', 'kosher supervision'],
  ['tomchei shabbos', 'tomchei shabbas', 'food pantry', 'food bank'],

  // Health and therapy
  ['therapist', 'therapists', 'therapy', 'counselor', 'counsellor', 'counseling', 'counselling'],
  ['physical therapy', 'physiotherapy', 'physio', 'pt'],
  ['occupational therapy', 'ot'],
  ['speech therapy', 'speech', 'slp', 'speech language'],
  ['psychiatrist', 'psychiatry'],
  ['psychologist', 'psychology'],
  ['social worker', 'lcsw', 'msw'],
  ['dentist', 'dentists', 'dentistry', 'dental', 'orthodontist', 'orthodontics'],
  ['pediatrician', 'pediatrics', 'paediatrician', 'paediatrics', 'peds'],
  ['doctor', 'doctors', 'physician', 'md'],
  ['midwife', 'doula', 'lactation'],
  ['optometrist', 'optician', 'eye doctor', 'glasses'],
  ['pharmacy', 'pharmacist', 'chemist'],
  ['chiropractor', 'chiropractic'],
  ['nutritionist', 'dietitian', 'dietician'],

  // Simcha and services
  ['caterer', 'caterers', 'catering'],
  ['bakery', 'bakeries', 'baker'],
  ['restaurant', 'restaurants', 'takeout', 'take out'],
  ['photographer', 'photographers', 'photography', 'photo'],
  ['videographer', 'video', 'videography'],
  ['florist', 'flowers', 'floral'],
  ['band', 'music', 'musician', 'one man band', 'singer'],
  ['hall', 'venue', 'simcha hall'],
  ['invitations', 'invites', 'stationery'],
  ['simcha', 'simchas', 'wedding', 'weddings', 'bar mitzvah', 'bas mitzvah', 'bat mitzvah', 'sheva brachos'],

  // Professional
  ['accountant', 'accountants', 'accounting', 'cpa', 'bookkeeper', 'bookkeeping'],
  ['lawyer', 'lawyers', 'attorney', 'attorneys', 'legal', 'law'],
  ['mortgage', 'mortgages', 'lender', 'loan officer'],
  ['insurance', 'insurance broker', 'insurance agent'],
  ['realtor', 'real estate', 'realty', 'real estate agent'],
  ['tutor', 'tutors', 'tutoring'],
  ['babysitter', 'babysitting', 'childcare', 'daycare', 'playgroup', 'nanny'],
  ['it support', 'computer repair', 'tech support', 'computers'],
  ['web developer', 'web development', 'website', 'web design'],
  ['graphic designer', 'graphic design', 'design'],
  ['car service', 'taxi', 'driver', 'limo', 'transportation'],
  ['mechanic', 'auto repair', 'car repair', 'body shop'],
  ['travel agent', 'travel', 'flights'],
];

// Every term, pointing at the group it belongs to.
const INDEX = new Map();
for (const group of GROUPS) {
  for (const term of group) INDEX.set(term, group);
}

/**
 * Every spelling worth searching for, given what someone typed.
 * The original text always comes first so an exact phrase still wins.
 */
export function expandQuery(raw) {
  const text = String(raw || '').trim().toLowerCase();
  if (!text) return [];
  const terms = new Set([text]);
  // The whole phrase, then each word in it — so "frum plumber" still reaches
  // a listing filed under "Plumbing".
  for (const token of [text, ...text.split(/\s+/)]) {
    const group = INDEX.get(token);
    if (group) for (const term of group) terms.add(term);
  }
  return [...terms];
}

/** Does this text satisfy the query, allowing for aliases? */
export function matchesQuery(haystack, terms) {
  if (!terms.length) return true;
  const hay = String(haystack || '').toLowerCase();
  return terms.some((term) => hay.includes(term));
}
