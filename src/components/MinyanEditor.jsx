import React from 'react';
import { ANCHORS, DAY_SETS, MINYANIM_MAX, TEFILLOS } from '@/lib/minyanim';

const fresh = () => ({ tefillah: 'Shacharis', days: 'sun_fri', anchor: 'clock', time: '07:00' });

// A shul's minyanim, one row each. The shul page works the next one out from
// these, so a Mincha tied to shkiya stays right all year without anyone
// coming back to change it. The link is for whatever the shul keeps itself:
// its GoDaven page or its own website.
//
// onChange may be handed a function of the current list, the same contract
// the gallery editor has.
export default function MinyanEditor({ value = [], onChange, link = '', onLink }) {
  const set = (i, patch) => onChange((cur) => (cur || []).map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const remove = (i) => onChange((cur) => (cur || []).filter((_, j) => j !== i));
  const add = () => onChange((cur) => ((cur || []).length >= MINYANIM_MAX ? cur : [...(cur || []), fresh()]));
  const setAnchor = (i, anchor) => set(i, anchor === 'clock'
    ? { anchor, time: value[i]?.time || '07:00', minutes: undefined }
    : anchor === 'sunrise' ? { anchor, time: undefined, minutes: undefined }
      : { anchor, time: undefined, minutes: Number.isInteger(value[i]?.minutes) ? value[i].minutes : 15 });
  return <fieldset className="rounded-lg border border-brand-line p-4">
    <legend className="px-1 text-sm font-semibold text-brand-ink">Minyan times</legend>
    <p className="helper mt-0">Add each minyan and the shul page shows the next one at the top. Times can be set ("7:00") or follow shkiya ("15 minutes before"), which keeps them right all year.</p>
    {value.length > 0 && <ul className="mt-3 space-y-3">{value.map((m, i) => <li key={i} className="grid grid-cols-2 gap-2 rounded-lg bg-brand-tint p-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end">
      <label className="text-sm">Tefillah<select className="field" value={m.tefillah} onChange={(e) => set(i, { tefillah: e.target.value })}>{TEFILLOS.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
      <label className="text-sm">Days<select className="field" value={m.days} onChange={(e) => set(i, { days: e.target.value })}>{Object.entries(DAY_SETS).map(([k, d]) => <option key={k} value={k}>{d.short}</option>)}</select></label>
      <label className="text-sm">When<select className="field" value={m.anchor} onChange={(e) => setAnchor(i, e.target.value)}>{Object.entries(ANCHORS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select></label>
      {m.anchor === 'clock'
        ? <label className="text-sm">Time<input type="time" className="field" value={m.time || ''} onChange={(e) => set(i, { time: e.target.value })} required/></label>
        : m.anchor === 'sunrise'
          ? <p className="self-end pb-2.5 text-sm text-brand-muted">Worked out from the map pin.</p>
          : <label className="text-sm">Minutes {m.anchor === 'sunset_before' ? 'before' : 'after'}<input type="number" min="0" max="120" step="1" inputMode="numeric" className="field" value={m.minutes ?? ''} onChange={(e) => set(i, { minutes: e.target.value === '' ? '' : Number(e.target.value) })} required/></label>}
      <button type="button" onClick={() => remove(i)} className="col-span-2 justify-self-start text-sm font-semibold text-brand-error underline lg:col-span-1 lg:mb-2.5">Remove</button>
    </li>)}</ul>}
    {value.length < MINYANIM_MAX && <button type="button" onClick={add} className="secondary mt-3">Add a minyan</button>}
    <label className="mt-4 block text-sm">Full schedule link (optional)<input type="url" className="field" value={link} onChange={(e) => onLink(e.target.value)} placeholder="The shul's GoDaven page or website"/></label>
  </fieldset>;
}
