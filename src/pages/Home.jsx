import React from 'react';
import { Link } from 'react-router-dom';
import { Search, MessageSquare, Building2, Users, ShieldCheck, Compass, ArrowRight } from 'lucide-react';
import SearchPanel from '@/components/SearchPanel';

export default function Home(){
  return <>
    <section className="hero"><div className="page-shell py-16 md:py-28">
      <span className="eyebrow">BUILT BY THE COMMUNITY, FOR THE COMMUNITY</span>
      <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold tracking-tight text-white md:text-6xl">Helping each other grow.<br/><span className="text-[#F3C66A]">Strengthening our communities.</span></h1>
      <p className="mt-5 max-w-2xl text-lg text-white/85">Klal Connect is a single home for the frum Jewish community to find trusted businesses, services, and resources — and to put your own business in front of the klal.</p>
      <div className="mt-8"><SearchPanel/></div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link to="/directory" className="inline-flex items-center gap-2 rounded-xl bg-[#F3C66A] px-5 py-3 font-bold text-brand-navy"><Search size={17}/>Browse the directory</Link>
        <Link to="/feed" className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 font-semibold text-white"><MessageSquare size={17}/>Open the community feed</Link>
      </div>
    </div></section>

    <div className="page-shell space-y-16 py-14">
      <section className="mx-auto max-w-3xl text-center">
        <h2 className="title">One platform. Two ways to use it.</h2>
        <p className="mt-4 text-lg leading-8 text-brand-body">You don't have to choose. Some people come to Klal Connect just to <strong className="text-brand-navy">find what they need</strong>. Others use it to <strong className="text-brand-navy">grow their business and be seen</strong>. Do whichever fits you.</p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <WayCard icon={<Compass size={24}/>} title="Use it as a resource" body="Find a doctor, a Gemach, a tutor, an insurance broker, a caterer — anywhere you are. Search, save, and connect with trusted community members whose services others rely on." action={{label:'Explore resources', to:'/directory'}} accent="#0D6B66"/>
        <WayCard icon={<MessageSquare size={24}/>} title="Use it to grow your business" body="Post updates, share promotions, ask the klal a question, and keep your listing in front of the community — the same social-business networking, in a place that's ours." action={{label:'Open the feed', to:'/feed'}} accent="#B68A2E"/>
      </div>

      <section>
        <div className="section-head"><div><span className="eyebrow dark">HOW IT WORKS</span><h2 className="title">Three simple steps</h2></div></div>
        <div className="grid gap-5 md:grid-cols-3">
          <Step n={1} icon={<Search size={20}/>} title="Find or be found" body="Search the directory by category, location, or need — or add your own listing so others can find you."/>
          <Step n={2} icon={<Users size={20}/>} title="Connect with the klal" body="Save providers, share their info, and leave positive community notes. In the feed, comment and engage like you would expect."/>
          <Step n={3} icon={<Building2 size={20}/>} title="Grow together" body="Providers claim their listing, post updates, and build trust through real community usage — not anonymous reviews."/>
        </div>
      </section>

      <section className="rounded-[2rem] bg-brand-canvas p-7 text-center ring-1 ring-brand-line md:p-12">
        <ShieldCheck size={28} className="mx-auto text-brand-teal"/>
        <h2 className="mt-4 title">Built on trust, not reviews</h2>
        <p className="mx-auto mt-3 max-w-xl text-brand-body">No public negative reviews, no rating wars. Klal Connect shows community usage and positive experiences, with corrections handled privately. Good connections support families, livelihoods, and local institutions.</p>
        <Link to="/add" className="mt-6 inline-flex items-center gap-2 primary"><ArrowRight size={16}/>Add your listing</Link>
      </section>
    </div>
  </>;
}

function WayCard({ icon, title, body, action, accent }) {
  return <section className="panel space-y-4">
    <div className="grid h-11 w-11 place-items-center rounded-2xl text-white" style={{background:accent}}>{icon}</div>
    <h3 className="text-xl font-bold text-brand-ink">{title}</h3>
    <p className="leading-7 text-brand-body">{body}</p>
    <Link to={action.to} className="secondary inline-flex"><ArrowRight size={16}/>{action.label}</Link>
  </section>;
}

function Step({ n, icon, title, body }) {
  return <div className="panel space-y-3"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-brand-tint font-bold text-brand-teal">{n}</span><span className="text-brand-teal">{icon}</span></div><h3 className="font-bold text-brand-ink">{title}</h3><p className="text-sm leading-6 text-brand-body">{body}</p></div>;
}