import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireMember } from '@/lib/supabase/server';

async function reply(formData: FormData) {
  'use server';
  const { sb } = await requireMember();
  const conv = String(formData.get('conv'));
  const { error } = await sb.rpc('send_message', { p_recipient_id: String(formData.get('to')), p_body: String(formData.get('body') || '') });
  redirect(`/messages/${conv}` + (error ? '?e=' + encodeURIComponent(error.message) : ''));
}

async function ignore(formData: FormData) {
  'use server';
  const { sb } = await requireMember();
  await sb.rpc('ignore_request', { p_conversation_id: String(formData.get('conv')) });
  redirect('/messages');
}

export default async function Thread({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ e?: string }> }) {
  const { id } = await params;
  const { e } = await searchParams;
  const { sb, user } = await requireMember();
  const { data: c } = await sb.from('conversations').select('*').eq('id', id).maybeSingle();
  if (!c) notFound();
  const otherId = c.user_a === user.id ? c.user_b : c.user_a;
  const [{ data: other }, { data: msgs }] = await Promise.all([
    sb.from('profiles').select('display_name').eq('id', otherId).maybeSingle(),
    sb.from('messages').select('id, sender_id, body, created_at').eq('conversation_id', id).order('created_at'),
  ]);
  await sb.rpc('mark_read', { p_conversation_id: id });
  const isRequestForMe = c.status === 'request' && c.initiated_by !== user.id;

  return (
    <section style={{ padding: '32px 0', maxWidth: 760 }}>
      <p><Link href="/messages">← Messages</Link></p>
      <h1 style={{ fontSize: 26 }}><Link href={`/membres/${otherId}`}>{other?.display_name ?? 'Membre'}</Link></h1>
      {isRequestForMe && <p className="muted">Demande reçue : répondez pour ouvrir la conversation, ou ignorez-la. L&apos;expéditeur ne voit pas si vous l&apos;avez lue.</p>}
      <div className="card" style={{ minHeight: 200 }}>
        {(msgs ?? []).map((m) => (
          <p key={m.id} className={`msg ${m.sender_id === user.id ? 'me' : 'them'}`}>{m.body}</p>
        ))}
      </div>
      {e && <p className="alert">{e}</p>}
      <form action={reply} className="stack" style={{ marginTop: 16, maxWidth: 'none' }}>
        <input type="hidden" name="conv" value={id} />
        <input type="hidden" name="to" value={otherId} />
        <label>Votre réponse<textarea name="body" required maxLength={2000} /></label>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn">Envoyer</button>
        </div>
      </form>
      {isRequestForMe && (
        <form action={ignore} style={{ marginTop: 10 }}>
          <input type="hidden" name="conv" value={id} />
          <button className="btn ghost small">Ignorer cette demande</button>
        </form>
      )}
    </section>
  );
}
