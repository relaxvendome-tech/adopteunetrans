'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

type Mode = 'inscription' | 'connexion' | 'lien';

const FR: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou mot de passe incorrect.',
  'User already registered': 'Un compte existe déjà avec cet e-mail : connectez-vous.',
  'Email not confirmed': 'E-mail pas encore confirmé : ouvrez le lien reçu par e-mail.',
  'Password should be at least 8 characters.': 'Le mot de passe doit faire au moins 8 caractères.',
};
const fr = (m: string) => FR[m] ?? (m.toLowerCase().includes('rate limit') ? 'Trop de demandes, réessayez dans quelques minutes ou utilisez un mot de passe.' : m);

export default function Connexion() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('inscription');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const sb = supabaseBrowser();
    const redirect = `${window.location.origin}/auth/callback`;
    try {
      if (mode === 'lien') {
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
        if (error) throw error;
        setMsg({ ok: true, text: `Lien envoyé à ${email}. Ouvrez votre boîte mail (pensez aux spams).` });
      } else if (mode === 'inscription') {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirect } });
        if (error) throw error;
        if (data.session) { router.push('/profil'); router.refresh(); return; }
        setMsg({ ok: true, text: `Compte créé ! Confirmez votre adresse avec le lien envoyé à ${email}.` });
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/membres'); router.refresh(); return;
      }
    } catch (x) {
      setMsg({ ok: false, text: fr(x instanceof Error ? x.message : String(x)) });
    }
    setBusy(false);
  }

  const tab = (m: Mode, label: string) => (
    <button type="button" className={mode === m ? 'btn small' : 'btn ghost small'} onClick={() => { setMode(m); setMsg(null); }}>{label}</button>
  );

  return (
    <section style={{ padding: '40px 0', maxWidth: 460 }}>
      <h1>{mode === 'inscription' ? 'Inscription gratuite' : 'Connexion'}</h1>
      <p className="muted">Gratuit, réservé aux 18 ans et plus. Votre e-mail n&apos;est jamais affiché.</p>
      <div style={{ display: 'flex', gap: 8, margin: '16px 0', flexWrap: 'wrap' }}>
        {tab('inscription', 'Créer un compte')}{tab('connexion', 'J’ai déjà un compte')}{tab('lien', 'Lien par e-mail')}
      </div>
      <form className="stack" onSubmit={submit}>
        <label>Adresse e-mail
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode !== 'lien' && (
          <label>Mot de passe {mode === 'inscription' && <span className="muted">(8 caractères minimum)</span>}
            <input type="password" required minLength={8} autoComplete={mode === 'inscription' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
        )}
        <button className="btn" disabled={busy}>
          {busy ? 'Patientez…' : mode === 'inscription' ? 'Créer mon compte' : mode === 'connexion' ? 'Me connecter' : 'Recevoir mon lien'}
        </button>
        {msg && <p className={msg.ok ? 'success' : 'alert'}>{msg.text}</p>}
        {mode === 'inscription' && <p className="muted" style={{ fontSize: 13 }}>En créant un compte, vous acceptez les <a href="/legal/cgu">CGU</a> et la <a href="/legal/confidentialite">politique de confidentialité</a>.</p>}
      </form>
    </section>
  );
}
