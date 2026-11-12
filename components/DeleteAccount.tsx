'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function DeleteAccount({ userId, paths }: { userId: string; paths: string[] }) {
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function del() {
    setBusy(true); setErr('');
    const sb = supabaseBrowser();
    if (paths.length) await sb.storage.from('photos').remove(paths);
    const { error } = await sb.rpc('delete_my_account');
    if (error) { setErr(error.message); setBusy(false); return; }
    await sb.auth.signOut();
    window.location.href = '/?compte=supprime';
  }

  return (
    <details className="card" style={{ marginTop: 24 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Supprimer mon compte</summary>
      <p className="muted">Votre profil, vos photos et vos messages seront effacés définitivement. Cette action est irréversible.</p>
      <label>Tapez SUPPRIMER pour confirmer
        <input value={word} onChange={(e) => setWord(e.target.value)} data-user={userId} />
      </label>
      <p><button type="button" className="btn small" style={{ background: '#B42318' }} disabled={busy || word !== 'SUPPRIMER'} onClick={del}>{busy ? 'Suppression…' : 'Supprimer définitivement'}</button></p>
      {err && <p className="alert">{err}</p>}
    </details>
  );
}
