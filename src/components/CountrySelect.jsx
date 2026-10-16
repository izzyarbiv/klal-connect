import React, { useMemo } from 'react';
import { countriesFrom } from '@/lib/countries';

// The Country filter beside the Where box: Everywhere, then each country that
// has listings, with how many. A country with nothing listed is never offered.
export default function CountrySelect({ providers = [], value = '', onChange, className = 'field', ...rest }) {
  const countries = useMemo(() => countriesFrom(providers), [providers]);
  return <select className={className} value={value} onChange={(e) => onChange(e.target.value)} aria-label="Country" {...rest}>
    <option value="">Everywhere</option>
    {/* A country from a link that has nothing listed (yet) still shows as chosen. */}
    {value && !countries.some((c) => c.country === value) && <option value={value}>{value}</option>}
    {countries.map(({ country, count }) => <option key={country} value={country}>{country} ({count})</option>)}
  </select>;
}
