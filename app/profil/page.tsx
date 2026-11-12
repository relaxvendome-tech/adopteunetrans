import { redirect } from 'next/navigation';
import { requireMember } from '@/lib/supabase/server';
import { PREFECTURES } from '@/lib/data';

async function save(formData: FormData) {
  'use server';
  const { sb, user, profile } = await requireMember({ allowNoProfile: true });
  const dep = String(formData.get('department_code') || '');
  const pref = PREFECTURES.find((p) => p.code_dep === dep);
  const row = {
    id: user.id,
    display_name: String(formData.get('display_name') || '').trim().slice(0, 50),
    gender_identity: String(formData.get('gender_identity') || '').slice(0, 60) || null,
    pronouns: String(formData.get('pronouns') || '').slice(0, 30) || null,
    bio: String(formData.get('bio') || '').slice(0, 500) || null,
    department_code: pref?.code_dep ?? null,
    city_slug: pref?.slug ?? null,
    accept_only_verified: formData.get('accept_only_verified') === 'on',
    age_min: Math.max(18, Number(formData.get('age_min') || 18)),
    age_max: Math.min(120, Number(formData.get('age_max') || 99)),
  };
  const { error } = profile
    ? await sb.from('profiles').update(row).eq('id', user.id)
    : await sb.from('profiles').insert(row);
  if (error) redirect('/profil?e=' + encodeURIComponent(error.message));

  if (!profile) {
    if (formData.get('adult') !== 'on' || formData.get('consent') !== 'on') {
      redirect('/profil?e=' + encodeURIComponent('Les deux cases de consentement sont obligatoires.'));
    }
    const { error: e2 } = await sb.from('profiles_private').insert({
      id: user.id,
      birthdate: String(formData.get('birthdate')),
      consent_sensitive_at: new Date().toISOString(),
    });
    if (e2) {
      await sb.from('profiles').delete().eq('id', user.id);
      redirect('/profil?e=' + encodeURIComponent('Date de naissance invalide : le site est réservé aux 18 ans et plus.'));
    }
  }
  redirect('/membres');
}

export default async function Profil({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { profile } = await requireMember({ allowNoProfile: true });
  const { e } = await searchParams;
  const p = profile ?? {};
  return (
    <section style={{ padding: '32px 0' }}>
      <h1>{profile ? 'Mon profil' : 'Créer mon profil'}</h1>
      {e && <p className="alert">{e}</p>}
      <form action={save} className="stack">
        <label>Prénom ou pseudo
          <input name="display_name" required maxLength={50} defaultValue={p.display_name ?? ''} />
        </label>
        <label>Identité (champ libre : femme trans, homme trans, non binaire, homme, femme…)
          <input name="gender_identity" maxLength={60} defaultValue={p.gender_identity ?? ''} />
        </label>
        <label>Pronoms
          <input name="pronouns" maxLength={30} placeholder="elle, il, iel…" defaultValue={p.pronouns ?? ''} />
        </label>
        <label>Département
          <select name="department_code" defaultValue={p.department_code ?? ''} required>
            <option value="" disabled>Choisir…</option>
            {PREFECTURES.map((d) => (
              <option key={d.code_dep} value={d.code_dep}>{d.code_dep} – {d.departement} ({d.prefecture})</option>
            ))}
          </select>
        </label>
        <label>Présentation (500 caractères max)
          <textarea name="bio" maxLength={500} defaultValue={p.bio ?? ''} />
        </label>
        <fieldset className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <legend style={{ fontWeight: 600 }}>Qui peut m&apos;écrire</legend>
          <label className="check"><input type="checkbox" name="accept_only_verified" defaultChecked={p.accept_only_verified ?? true} /> Uniquement les profils vérifiés</label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label>Âge min<input type="number" name="age_min" min={18} max={120} defaultValue={p.age_min ?? 18} /></label>
            <label>Âge max<input type="number" name="age_max" min={18} max={120} defaultValue={p.age_max ?? 99} /></label>
          </div>
        </fieldset>
        {!profile && (
          <>
            <label>Date de naissance (jamais affichée, seul l&apos;âge est visible)
              <input type="date" name="birthdate" required />
            </label>
            <label className="check"><input type="checkbox" name="adult" required /> J&apos;ai 18 ans ou plus et j&apos;accepte les <a href="/legal/cgu" target="_blank">CGU</a> et la charte de respect.</label>
            <label className="check"><input type="checkbox" name="consent" required /> J&apos;accepte que mon identité de genre soit traitée pour le fonctionnement du site (données sensibles, voir la <a href="/legal/confidentialite" target="_blank">politique de confidentialité</a>). Je peux retirer ce consentement en supprimant mon compte.</label>
          </>
        )}
        <button className="btn">Enregistrer</button>
      </form>
    </section>
  );
}
