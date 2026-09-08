import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import CompletenessRing from '@/components/CompletenessRing';
import { profileCompleteness } from '@/lib/completeness';

// The completeness ring, and under it every step with a tick or a link to
// where it gets done. Owner only. Disappears once everything is ticked.
export default function ProfileChecklist({ user, onEdit }) {
  const navigate = useNavigate();
  const c = profileCompleteness(user);
  if (c.percent >= 100) return null;
  const go = (target) => {
    if (!target) return;
    if (target.startsWith('/')) { navigate(target); return; }
    if (target === '#photo') {
      // The photo lives in the header's upload overlay, not in a form: open
      // the picker straight away (a click handler may do that).
      document.getElementById('intro')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('avatar-upload')?.click();
      return;
    }
    document.getElementById(target.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onEdit?.(target.slice(1));
  };
  return <div className="panel space-y-4">
    <CompletenessRing percent={c.percent} next={c.next} label="Profile" onAction={() => go(c.next?.target)} />
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {c.checks.map((step) => <li key={step.action} className="flex items-center gap-2 text-sm">
        {step.done
          ? <><CheckCircle2 size={16} className="shrink-0 text-brand-teal"/><span className="text-brand-muted line-through decoration-brand-line">{step.action}</span></>
          : step.target?.startsWith('/')
            ? <><Circle size={16} className="shrink-0 text-brand-line"/><Link to={step.target} className="inline-flex items-center gap-1 font-medium text-brand-ink hover:text-brand-teal hover:underline">{step.action}<ArrowRight size={13}/></Link></>
            : <><Circle size={16} className="shrink-0 text-brand-line"/><button type="button" onClick={() => go(step.target)} className="inline-flex items-center gap-1 font-medium text-brand-ink hover:text-brand-teal hover:underline">{step.action}<ArrowRight size={13}/></button></>}
      </li>)}
    </ul>
  </div>;
}
