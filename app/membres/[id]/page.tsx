import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireMember } from '@/lib/supabase/server';
import { prefectureParDep } from '@/lib/data';

async function send(formData: FormData) {
  'use server';
  const { sb } = await requireMember();
  const to = String(formData.get('to'));
  const { error } = await sb.rpc('send_message', { p_recipient_id: to, p_body: String(formData.get('body') || '') });
  if (error) redirect(`/membres/${to}?e=` + encodeURIComponent(error.message));
  redirect('/messages?tab=sent');
}

async function block(formData: FormData) {
  'use server';
  const { sb, user } = await requireMember();
  await sb.from('blocks').insert({ blocker_id: user.id, blocked_id: String(formData.get('id')) });
  redirect('/membres');
}

async function report(formData: FormData) {
  'use server';
  const { sb, user } = await requireMember();
  const id = String(formData.get('id'));
  await sb.from('reports').insert({ reporter_id: user.id, reported_id: id, reason: String(formData.get('reason') || 'Signalement') });
  redirect(`/membres/${id}?ok=1`);
}

export default async function Membre({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ e?: string; ok?: string }> }) {
  const { id } = await params;
  const { e, ok } = await searchParams;
  const { sb, user } = await requireMember();
  if (id === user.id) redirect('/profil');
  const { data } = await sb.rpc('member_card', { p_id: id });
  const m = data?.[0];
  if (!m) notFound();
  await sb.from('profile_views').insert({ viewer_id: user.id, viewed_id: id });

  return (
    <section style={{ padding: '32px 0', display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
      <div className="card">
        <div className="avatar" aria-hidden="true" style={{ height: 220 }}>{m.display_name.slice(0, 1).toUpperCase()}</div>
        <h1 style={{ fontSize: 28, marginBottom: 4 }}>{m.display_name}, {m.age}</h1>
        <p className="muted">{[m.gender_identity, m.pronouns, prefectureParDep(m.department_code)?.prefecture].filter(Boolean).join(' · ')}</p>
        {m.is_verified && <span className="badge">Profil vérifié</span>}
        <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{m.bio}</p>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Écrire à {m.display_name}</h2>
        {e && <p className="alert">{e}</p>}
        {ok && <p className="success">Merci, votre signalement a été transmis à la modération.</p>}
        <form action={send} className="stack">
          <input type="hidden" name="to" value={m.id} />
          <label>Votre message
            <textarea name="body" required maxLength={2000} placeholder="Présentez-vous, parlez de vos points communs…" />
          </label>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>Premier message : texte uniquement, sans lien ni numéro. Une seule relance si pas de réponse.</p>
          <button className="btn">Envoyer</button>
        </form>
        <hr style={{ margin: '24px 0', border: 0, borderTop: '1px solid var(--line)' }} />
        <form action={block} style={{ display: 'inline' }}>
          <input type="hidden" name="id" value={m.id} />
          <button className="btn ghost small">Bloquer</button>
        </form>{' '}
        <form action={report} style={{ display: 'inline-flex', gap: 8, marginTop: 8 }}>
          <input type="hidden" name="id" value={m.id} />
          <input name="reason" placeholder="Motif du signalement" required minLength={3} />
          <button className="btn ghost small" style={{ borderColor: '#B42318', color: '#B42318' }}>Signaler</button>
        </form>
        <p><Link href="/membres">← Retour aux membres</Link></p>
      </div>
    </section>
  );
}
