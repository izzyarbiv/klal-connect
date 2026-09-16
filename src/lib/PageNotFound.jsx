import { Link, useLocation } from 'react-router-dom';
import { Compass } from 'lucide-react';

// The 404. Uses the app's own palette rather than the slate scaffolding it
// shipped with, and no longer tells administrators that "the AI hasn't
// implemented this page yet" — which was generator boilerplate sitting in
// production, and read exactly as unfinished as it sounds.
export default function PageNotFound() {
  const { pathname } = useLocation();
  return (
    <div className="page-shell grid min-h-[70vh] place-items-center py-12">
      <div className="panel max-w-md space-y-4 text-center">
        <span className="grid h-12 w-12 place-items-center justify-self-center rounded-full bg-brand-tint text-brand-teal"><Compass size={22}/></span>
        <h1 className="title text-2xl">We couldn't find that page</h1>
        <p className="helper">
          Nothing lives at <span className="font-medium text-brand-ink">{pathname}</span>. It may have moved, or the link may be old.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <Link to="/directory" className="primary">Browse the directory</Link>
          <Link to="/" className="secondary">Go home</Link>
        </div>
      </div>
    </div>
  );
}
