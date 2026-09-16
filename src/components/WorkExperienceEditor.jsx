import React,{useState} from 'react';
import { Plus, Briefcase, X, MapPin } from 'lucide-react';

const blank={title:'',company:'',location:'',start_date:'',end_date:'',current:false,description:''};

export default function WorkExperienceEditor({ value=[], onChange }){
  const [open,setOpen]=useState(null);
  const items=Array.isArray(value)?value:[];
  const upd=(i,patch)=>onChange(items.map((x,idx)=>idx===i?{...x,...patch}:x));
  const del=(i)=>onChange(items.filter((_,idx)=>idx!==i));
  const add=()=>{const n=items.length;onChange([...items,{...blank}]);setOpen(n);};
  const fmt=(s)=>{if(!s)return '';const d=new Date(s+'-01');if(isNaN(d))return s;return d.toLocaleDateString('en-US',{month:'short',year:'numeric'});};

  return <div className="space-y-5">
    <div className="relative">
      {items.length>0 && <div className="absolute left-[11px] top-2 bottom-2 w-px bg-brand-line"/>}
      <div className="space-y-4">
        {items.map((job,i)=>(
          <div key={i} className="relative pl-9">
            <div className="absolute left-0 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-brand-teal text-white ring-4 ring-brand-canvas"><Briefcase size={12}/></div>
            {open===i ? (
              <div className="panel space-y-3">
                <div className="flex justify-between"><span className="font-semibold text-brand-ink">Edit experience</span><button type="button" onClick={()=>setOpen(null)} className="text-brand-muted"><X size={16}/></button></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <In label="Job title" value={job.title} onChange={v=>upd(i,{title:v})}/>
                  <In label="Company" value={job.company} onChange={v=>upd(i,{company:v})}/>
                  <In label="Location" value={job.location} onChange={v=>upd(i,{location:v})}/>
                  <div/>
                  <In label="Start date" type="month" value={job.start_date} onChange={v=>upd(i,{start_date:v})}/>
                  {job.current
                    ? <label className="text-sm font-medium text-brand-body">End date<div className="field flex items-center text-brand-muted">Present</div></label>
                    : <In label="End date" type="month" value={job.end_date} onChange={v=>upd(i,{end_date:v})}/>}
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-brand-body"><input type="checkbox" checked={!!job.current} onChange={e=>upd(i,{current:e.target.checked,end_date:''})}/>I currently work here</label>
                <Area label="Description" value={job.description} onChange={v=>upd(i,{description:v})}/>
                <div className="flex justify-between">
                  <button type="button" onClick={()=>del(i)} className="text-sm font-semibold text-brand-error">Remove this role</button>
                  <button type="button" onClick={()=>setOpen(null)} className="primary">Done</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={()=>setOpen(i)} className="block w-full rounded-lg bg-brand-surface px-4 py-3 text-left ring-1 ring-brand-line hover:bg-brand-tint">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-brand-ink">{job.title||'Untitled role'}</p>
                    <p className="text-sm text-brand-teal">{job.company}{job.current?' · Present':job.end_date?` · ${fmt(job.start_date)} – ${fmt(job.end_date)}`:''}</p>
                    {job.location && <p className="mt-1 flex items-center gap-1 text-xs text-brand-muted"><MapPin size={11}/>{job.location}</p>}
                  </div>
                  <X size={15} className="text-brand-muted hover:text-brand-error" onClick={e=>{e.stopPropagation();del(i);}}/>
                </div>
                {job.description && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-brand-body">{job.description}</p>}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
    <button type="button" onClick={add} className="secondary"><Plus size={16}/>Add experience</button>
  </div>;
}

function In({label,type='text',value,onChange,disabled}){
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-brand-muted">{label}</span><input type={type} className="field" value={value||''} disabled={disabled} onChange={e=>onChange(e.target.value)}/></label>;
}

function Area({label,value,onChange}){
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-brand-muted">{label}</span><textarea className="field min-h-20" value={value||''} onChange={e=>onChange(e.target.value)}/></label>;
}