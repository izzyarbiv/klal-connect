import { api } from "@/api/client";

export const WEEKLY_CAP = 40;

export async function loadMyConnections(meId){
  const [sent, received] = await Promise.all([
    api.entities.Connection.filter({ requester_id: meId }),
    api.entities.Connection.filter({ recipient_id: meId }),
  ]);
  return { sent, received, all: [...sent, ...received] };
}

export function sentThisWeekCount(sent){
  const now = Date.now();
  const week = 7 * 24 * 3600 * 1000;
  return (sent || []).filter(c => new Date(c.created_date).getTime() >= now - week).length;
}

export function connectionStatusWith(targetId, { sent = [], received = [] } = {}){
  const fromMe = sent.find(c => c.recipient_id === targetId);
  if (fromMe){ return { status: fromMe.status, conn: fromMe, direction: 'out' }; }
  const toMe = received.find(c => c.requester_id === targetId);
  if (toMe){ return { status: toMe.status, conn: toMe, direction: 'in' }; }
  return { status: 'none' };
}

export function connectedIds(connections){
  const ids = new Set();
  (connections?.all || []).forEach(c => {
    ids.add(c.requester_id);
    ids.add(c.recipient_id);
  });
  return ids;
}

function tokenSet(values, key){
  return new Set((values || []).map(v => (v[key] || '').toLowerCase().trim()).filter(Boolean));
}

export function similarityScore(a, b){
  let score = 0;
  if (a.profile_type && b.profile_type && a.profile_type === b.profile_type) score += 2;
  const ac = (a.home_city || '').toLowerCase().trim();
  const bc = (b.home_city || '').toLowerCase().trim();
  if (ac && bc && ac === bc) score += 3;
  const ac2 = tokenSet(a.work_experience, 'company');
  const bc2 = tokenSet(b.work_experience, 'company');
  let companyOverlap = 0;
  ac2.forEach(c => { if (bc2.has(c)) companyOverlap++; });
  score += companyOverlap * 3;
  const at = tokenSet(a.work_experience, 'title');
  const bt = tokenSet(b.work_experience, 'title');
  let titleOverlap = 0;
  at.forEach(t => { if (bt.has(t)) titleOverlap++; });
  score += titleOverlap;
  // Weak signal: shared words in the free-text headline (length >= 4 to skip
  // stopwords). Kept small so it never overrides city/company/title matching.
  const ah = new Set((a.headline || '').toLowerCase().split(/\s+/).filter(w => w.length >= 4));
  const bh = new Set((b.headline || '').toLowerCase().split(/\s+/).filter(w => w.length >= 4));
  let headlineOverlap = 0;
  ah.forEach(w => { if (bh.has(w)) headlineOverlap++; });
  score += headlineOverlap * 0.5;
  return score;
}

// Suggestions, so a sample is legitimate here — unlike a lookup of specific
// people, nobody goes missing from a ranked list by being outside it. Worth
// naming rather than leaving implicit: the pool is the 200 newest members, so
// once the community is larger than that, suggestions stop considering the rest.
// Ranking server-side is the fix when that starts to matter.
export async function suggestSimilar(targetUser, meId, excludedIds){
  const users = await api.entities.User.list('-created_date', 200);
  const blocked = new Set([targetUser?.id, meId, ...(excludedIds || [])].filter(Boolean));
  return users
    .filter(u => !blocked.has(u.id))
    .map(u => ({ user: u, score: similarityScore(targetUser, u) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

export function topJob(user){
  const we = Array.isArray(user?.work_experience) ? user.work_experience : [];
  const current = we.find(j => j.current) || we[0];
  if (!current) return null;
  return current;
}