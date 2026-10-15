import { useEffect, useState } from 'react';
import { api } from '@/api/client';

// Whether vouches and community notes are switched on (Admin → Site switches).
// Reads false until the answer arrives, and if it never does: a hidden
// section that should have shown is a smaller mistake than the reverse.
export default function useVouchesEnabled() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    api.getConfig().then((c) => { if (alive) setOn(c.vouchesEnabled === true); });
    return () => { alive = false; };
  }, []);
  return on;
}
