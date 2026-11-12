import Link from 'next/link';
import { requireMember } from '@/lib/supabase/server';

type Conv = { id: string; user_a: string; user_b: string; status: 'request' | 'active' | 'ignored'; initiated_by: string; last_message_at: string | null };

export default async function Messages({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { sb, user } = await requireMember();
  const { tab = 'requests' } = await searchParams;
  const { data } = await sb.from('conversations').select('*').order('last_message_at', { ascending: false, nullsFirst: false });
  const convs = (data ?? []) as Conv[];
  const other = (c: Conv) => (c.user_a === user.id ? c.user_b : c.user_a);
  const ids = [...new Set(convs.map(other))];
  const { data: names } = ids.length ? await sb.from('profiles').select('id, display_name').in('id', ids) : { data: [] };
  const name = (id: string) => names?.find((n) => n.id === id)?.display_name ?? 'Membre';

  const requests = convs.filter((c) => c.status === 'request' && c.initiated_by !== user.id);
  const active = convs.filter((c) => c.status === 'active');
  const sent = convs.filter((c) => c.status !== 'active' && c.initiated_by === user.id);
  const list = tab === 'active' ? active : tab === 'sent' ? sent : requests;

  return (
    <section style={{ padding: '32px 0' }}>
      <h1>Messages</h1>
      <nav className="tabs" aria-label="Boîtes de réception">
        <Link href="/messages?tab=requests" className={tab === 'requests' ? 'on' : ''}>Demandes ({requests.length})</Link>
        <Link href="/messages?tab=active" className={tab === 'active' ? 'on' : ''}>Conversations ({active.length})</Link>
        <Link href="/messages?tab=sent" className={tab === 'sent' ? 'on' : ''}>Envoyées ({sent.length})</Link>
      </nav>
      {tab === 'requests' && <p className="muted">Premiers messages de personnes à qui vous n&apos;avez pas encore répondu. Répondre ouvre la conversation.</p>}
      {list.length === 0 ? <p className="card">Rien pour l&apos;instant. <Link href="/membres">Découvrir des membres →</Link></p> : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map((c) => (
            <li key={c.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <strong>{name(other(c))}</strong>
              <span className="muted" style={{ fontSize: 13 }}>{c.last_message_at ? new Date(c.last_message_at).toLocaleString('fr-FR') : ''}</span>
              <Link className="btn small" href={`/messages/${c.id}`}>Ouvrir</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
