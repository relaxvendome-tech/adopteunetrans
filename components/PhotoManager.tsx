'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

type P = { id: string; storage_path: string; position: number; url: string };
const MAX = 5;

/** Redimensionne en JPEG 1280 px max : fichier léger et suppression des métadonnées (GPS inclus). */
async function compress(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error('Image illisible'))), 'image/jpeg', 0.85));
}

export default function PhotoManager({ userId, photos }: { userId: string; photos: P[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const sb = supabaseBrowser();
  const used = photos.map((p) => p.position);
  const free = [0, 1, 2, 3, 4].filter((n) => !used.includes(n));

  async function add(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, free.length);
    e.target.value = '';
    if (!files.length) return;
    setBusy(true); setErr('');
    try {
      for (let i = 0; i < files.length; i++) {
        if (!files[i].type.startsWith('image/')) throw new Error('Seules les images sont acceptées.');
        const blob = await compress(files[i]);
        const path = `${userId}/${crypto.randomUUID()}.jpg`;
        const up = await sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' });
        if (up.error) throw up.error;
        const ins = await sb.from('photos').insert({ profile_id: userId, storage_path: path, position: free[i] });
        if (ins.error) { await sb.storage.from('photos').remove([path]); throw ins.error; }
      }
      router.refresh();
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Envoi impossible.');
    } finally { setBusy(false); }
  }

  async function remove(p: P) {
    setBusy(true);
    await sb.from('photos').delete().eq('id', p.id);
    await sb.storage.from('photos').remove([p.storage_path]);
    setBusy(false);
    router.refresh();
  }

  async function makeMain(p: P) {
    if (p.position === 0) return;
    setBusy(true);
    const { error } = await sb.rpc('set_main_photo', { p_id: p.id });
    if (error) setErr(error.message);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h2 style={{ marginTop: 0 }}>Mes photos ({photos.length}/{MAX})</h2>
      <p className="muted" style={{ fontSize: 14 }}>Visibles uniquement par les membres connectés. La première est votre photo principale. Pas de nudité ni de photo d&apos;une autre personne.</p>
      <div className="photos">
        {photos.map((p) => (
          <figure key={p.id} className="ph">
            <img src={p.url} alt="" />
            <figcaption>
              {p.position === 0 ? <span className="badge">Principale</span> : <button type="button" className="btn ghost small" disabled={busy} onClick={() => makeMain(p)}>Principale</button>}
              <button type="button" className="btn ghost small" disabled={busy} onClick={() => remove(p)}>Supprimer</button>
            </figcaption>
          </figure>
        ))}
        {free.length > 0 && (
          <label className="ph add">
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={add} disabled={busy} />
            {busy ? 'Envoi…' : '+ Ajouter'}
          </label>
        )}
      </div>
      {err && <p className="alert">{err}</p>}
    </div>
  );
}
