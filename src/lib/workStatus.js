// The two LinkedIn-style profile statuses: "Open to work" and "Hiring". Fixed,
// official designs rather than a custom ribbon-builder — consistency is the
// point, the same way LinkedIn's own frames are not user-customizable.
export const WORK_STATUSES = {
  open_to_work: { id: 'open_to_work', label: 'Open to work', ring: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  hiring: { id: 'hiring', label: 'Hiring', ring: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
};

export const workStatusOf = (user) => WORK_STATUSES[user?.work_status] || null;
