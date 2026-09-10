import React from 'react';
import { CreditCard } from 'lucide-react';
import { api } from '@/api/client';

// A link to wherever a business actually collects money — a Stripe Payment
// Link, PayPal.me, Venmo or Zelle page. Klal never touches funds or sees
// card details; this is a labelled doorway to the business's own payment
// page, same as "Visit Website" is a doorway to their site.
export default function PayButton({ url, className = 'action', targetType, targetId }) {
  if (!url) return null;
  const track = () => {
    api.entities.ActivityEvent.create({
      type: 'payment_link_click',
      ...(targetType === 'company' ? { company_id: targetId } : { provider_id: targetId }),
    }).catch(() => {});
  };
  return (
    <a href={url} onClick={track} target="_blank" rel="noreferrer" className={className}>
      <CreditCard size={17} />Pay / Accept Payment
    </a>
  );
}
