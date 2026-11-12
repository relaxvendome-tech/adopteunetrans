import Link from 'next/link';
import { requireMember } from '@/lib/supabase/server';
import { PREFECTURES, prefectureParDep } from '@/lib/data';

type Member = { id: string; display_name: string; age: number; gender_identity: string | null; pronouns: string | null; bio: string | null; department_code: string | null; is_verified: boolean; online: boolean };

export default async function Membres({ searchParams }: { searchParams: Promise<{ dep?: string }> }) {
  const { sb, profile } = await requireMember();
  const { dep } = await searchParams;
  const current = dep === 'all' ? null : dep ?? profile.department_code;
  const { data, error } = await sb.rpc('list_members', { p_dep: current, p_limit: 60 });
  const members = (data ?? []) as Member[];
  await sb.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', profile.id);

  return (
    <section style={{ padding: '32px 0' }}>
      <h1>Membres {current ? `– ${prefectureParDep(current)?.departement ?? current}` : '– toute la France'}</h1>
      <form style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0 20px' }}>
        <select name="dep" defaultValue={current ?? 'all'} aria-label="Département">
          <option value="all">Toute la France</option>
          {PREFECTURES.map((d) => <option key={d.code_dep} value={d.code_dep}>{d.code_dep} – {d.departement}</option>)}
        </select>
        <button className="btn small">Filtrer</button>
      </form>
      {error && <p className="alert">{error.message}</p>}
      {members.length === 0 ? (
        <p className="card">Pas encore de membre ici. Élargissez la recherche à <Link href="/membres?dep=all">toute la France</Link> ou invitez vos ami·es : le site est gratuit.</p>
      ) : (
        <div className="grid">
          {members.map((m) => (
            <article key={m.id} className="card">
              <div className="avatar" aria-hidden="true">{m.display_name.slice(0, 1).toUpperCase()}</div>
              <h2 style={{ fontSize: 18, margin: '12px 0 4px' }}>{m.display_name}, {m.age}</h2>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                {[m.gender_identity, m.pronouns, prefectureParDep(m.department_code)?.prefecture].filter(Boolean).join(' · ')}
              </p>
              <p style={{ display: 'flex', gap: 6, margin: '8px 0' }}>
                {m.is_verified && <span className="badge">Vérifié·e</span>}
                {m.online && <span className="badge">En ligne</span>}
              </p>
              <p className="muted" style={{ fontSize: 14, minHeight: 40 }}>{m.bio?.slice(0, 120)}</p>
              <Link href={`/membres/${m.id}`} className="btn small">Voir le profil</Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
