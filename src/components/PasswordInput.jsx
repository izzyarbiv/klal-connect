import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

// A password field you can look at.
//
// Typing a password you cannot see is a guessing game, and it is worst with
// exactly the passwords that matter most — the mixed-case one an admin hands
// you, or anything pasted with a stray space on the end. The eye is a plain
// button, off by default, and never submits the form.
//
// `className` styles the input so this drops into either the shadcn-style auth
// pages or the plain `.field` forms.
export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder = '••••••••',
  autoComplete = 'current-password',
  className = 'field',
  withIcon = false,
  ...rest
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      {withIcon && <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />}
      <input
        id={id}
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        // A revealed password must not be offered to spellcheck or
        // autocorrect, which on a phone will happily rewrite it.
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        className={`${className} ${withIcon ? 'pl-10' : ''} pr-11`}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        aria-pressed={shown}
        title={shown ? 'Hide password' : 'Show password'}
        // 44px of touch target, sitting inside the field's right edge.
        className="absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-r-xl text-brand-muted transition hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
      >
        {shown ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}
