// Profile and listing completeness: a score, the single next thing to do, and
// the full checklist. Shown only to the owner — an incomplete profile is
// their prompt, never a public grade.

const filled = (v) => Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim().length > 0 : v != null;

function score(checks, subject) {
  const total = checks.reduce((n, c) => n + c.weight, 0);
  let got = 0;
  let next = null;
  const list = checks.map((c) => {
    const done = !!c.test(subject);
    if (done) got += c.weight;
    else if (!next) next = c;
    return { action: c.action, weight: c.weight, target: c.target || null, done };
  });
  return { percent: Math.round((got / total) * 100), next, checks: list };
}

// `target` is where the fix happens: a section id on the profile page, or a
// path when it lives elsewhere.
export function profileCompleteness(user) {
  return score([
    { weight: 20, test: (u) => filled(u.full_name), action: 'Add your name', target: '#intro' },
    { weight: 15, test: (u) => filled(u.headline), action: 'Write a one-line headline', target: '#intro' },
    { weight: 15, test: (u) => filled(u.avatar_url), action: 'Add a photo', target: '#photo' },
    { weight: 10, test: (u) => filled(u.home_city), action: 'Add your home city', target: '#intro' },
    { weight: 15, test: (u) => (u.bio || '').trim().length >= 40, action: 'Write a short bio', target: '#about' },
    { weight: 15, test: (u) => Array.isArray(u.work_experience) && u.work_experience.length > 0, action: 'Add your work or business', target: '#experience' },
    { weight: 10, test: (u) => u.latitude != null && u.longitude != null, action: 'Set your Shabbos location', target: '/settings#location' },
  ], user || {});
}

export function listingCompleteness(provider) {
  return score([
    { weight: 15, test: (p) => filled(p.logo_url) || (p.image_urls || []).length > 0, action: 'Add a logo or photo' },
    { weight: 15, test: (p) => (p.description || '').trim().length >= 80, action: 'Write a fuller description' },
    { weight: 10, test: (p) => filled(p.tagline), action: 'Add a tagline' },
    { weight: 10, test: (p) => filled(p.phone) || filled(p.whatsapp), action: 'Add a phone or WhatsApp number' },
    { weight: 10, test: (p) => filled(p.whatsapp), action: 'Add a WhatsApp number' },
    { weight: 10, test: (p) => filled(p.hours), action: 'Add your hours' },
    { weight: 10, test: (p) => filled(p.website) || filled(p.email), action: 'Add a website or email' },
    { weight: 10, test: (p) => p.latitude != null && p.longitude != null, action: 'Pin your location on the map' },
    { weight: 10, test: (p) => (p.badges || []).length > 0, action: 'Add community badges' },
  ], provider || {});
}
