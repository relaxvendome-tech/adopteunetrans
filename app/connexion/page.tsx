'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function Connexion() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setState('error'); } else setState('sent');
  }

  return (
    <section style={{ padding: '40px 0' }}>
      <h1>Connexion ou inscription</h1>
      <p className="muted">Entrez votre e-mail : vous recevrez un lien de connexion sécurisé, sans mot de passe.</p>
      {state === 'sent' ? (
        <p className="success">Lien envoyé à {email}. Ouvrez votre boîte mail (pensez aux spams).</p>
      ) : (
        <form className="stack" onSubmit={submit}>
          <label>Adresse e-mail
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="btn" disabled={state === 'sending'}>{state === 'sending' ? 'Envoi…' : 'Recevoir mon lien'}</button>
          {state === 'error' && <p className="alert">Erreur : {error}</p>}
        </form>
      )}
    </section>
  );
}
