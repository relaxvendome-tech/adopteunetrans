import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list: { name: string; value: string; options?: any }[]) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            /* appelé depuis un Server Component : le middleware rafraîchit la session */
          }
        },
      },
    },
  );
}

/** Utilisateur connecté obligatoire ; profil complété obligatoire sauf si allowNoProfile. */
export async function requireMember(opts: { allowNoProfile?: boolean } = {}) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/connexion');
  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!profile && !opts.allowNoProfile) redirect('/profil');
  return { sb, user, profile };
}
