import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, MapPin } from 'lucide-react';

// One role in a career. The shape a reader expects from this kind of profile:
// the company's own logo, the title, the company, the dates with how long it
// ran, then the location — not a generic briefcase and a bare "Present".
const monthOf = (s) => {
  if (!s) return null;
  const d = new Date(/^\d{4}-\d{2}$/.test(s) ? `${s}-01T12:00:00` : s);
  return Number.isNaN(d.getTime()) ? null : d;
};
const fmtMonth = (s) => {
  const d = monthOf(s);
  return d ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : (s || '');
};

// "2 mos", "3 yrs 4 mos" — the same arithmetic a reader would do, so a role
// with no end date still says how long it has been running.
function duration(start, end, current) {
  const from = monthOf(start);
  if (!from) return '';
  const to = current || !end ? new Date() : monthOf(end);
  if (!to || to < from) return '';
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  months = Math.max(months, 0) + 1;             // inclusive of the first month
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [];
  if (years) parts.push(`${years} yr${years === 1 ? '' : 's'}`);
  if (rest) parts.push(`${rest} mo${rest === 1 ? '' : 's'}`);
  return parts.join(' ');
}

function dateLine(job) {
  const start = fmtMonth(job.start_date);
  const end = job.current ? 'Present' : fmtMonth(job.end_date);
  const span = duration(job.start_date, job.end_date, job.current);
  if (!start && !end) return '';
  // Without a start date, do not invent a range — say what is known.
  if (!start) return end === 'Present' ? 'Current role' : end;
  return `${start} – ${end || 'Present'}${span ? ` · ${span}` : ''}`;
}

const initialsOf = (name) => String(name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

// `companyLinks` maps a lower-cased company name to its Klal page; `companyLogos`
// maps it to that page's logo, so a role at a business in the directory shows
// the business's own mark.
export default function WorkExperienceTimeline({ value = [], companyLinks = {}, companyLogos = {} }) {
  const items = Array.isArray(value) ? value : [];
  const keyOf = (name) => (name ? String(name).trim().toLowerCase() : '');
  const linkFor = (name) => companyLinks[keyOf(name)] || null;
  const logoFor = (name) => companyLogos[keyOf(name)] || null;
  if (items.length === 0) return <p className="text-sm text-brand-muted">No roles added yet.</p>;

  return <div className="relative">
    {items.length > 1 && <div className="absolute left-5 top-3 bottom-3 w-px bg-brand-line" aria-hidden="true" />}
    <div className="space-y-5">
      {items.map((job, i) => {
        const logo = logoFor(job.company);
        const to = linkFor(job.company);
        const dates = dateLine(job);
        return <div key={i} className="relative flex gap-3">
          <div className="relative z-10 shrink-0">
            {logo
              ? <img src={logo} alt="" className="h-10 w-10 rounded-xl object-cover ring-1 ring-brand-line" />
              : job.company
                ? <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-tint text-xs font-bold text-brand-teal ring-1 ring-brand-line">{initialsOf(job.company)}</span>
                : <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-tint text-brand-teal ring-1 ring-brand-line"><Briefcase size={16} /></span>}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <p className="font-semibold leading-tight text-brand-ink">{job.title || 'Untitled role'}</p>
            {job.company && <p className="text-sm font-medium text-brand-teal">
              {to ? <Link to={to} className="hover:underline">{job.company}</Link> : job.company}
            </p>}
            {dates && <p className="mt-0.5 text-xs text-brand-muted">{dates}</p>}
            {job.location && <p className="mt-0.5 flex items-center gap-1 text-xs text-brand-muted"><MapPin size={11} />{job.location}</p>}
            {job.description && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-brand-body">{job.description}</p>}
          </div>
        </div>;
      })}
    </div>
  </div>;
}
