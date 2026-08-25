import React from 'react';
import { Link } from 'react-router-dom';

export default function Brand() {
  return <Link to="/" className="flex items-center gap-2.5 font-heading font-bold text-lg text-brand-navy">
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-navy text-sm text-brand-gold shadow-sm">KC</span>
    <span>Klal Connect</span>
  </Link>;
}