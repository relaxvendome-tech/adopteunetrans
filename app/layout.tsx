import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { SITE } from '@/lib/data';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} – rencontres trans respectueuses et vérifiées`, template: `%s | ${SITE.name}` },
  description: 'Site de rencontre gratuit pour personnes trans et leurs partenaires. Profils vérifiés, messagerie protégée, 18+.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  return (
    <html lang="fr">
      <body>
        <header className="top">
          <div className="wrap">
            <Link href="/" className="logo">{SITE.name}</Link>
            <nav className="main" aria-label="Navigation principale">
              {user ? (
                <>
                  <Link href="/membres">Membres</Link>
                  <Link href="/messages">Messages</Link>
                  <Link href="/profil">Mon profil</Link>
                  <Link href="/deconnexion">Déconnexion</Link>
                </>
              ) : (
                <>
                  <Link href="/#securite">Sécurité</Link>
                  <Link href="/connexion" className="btn">Inscription gratuite</Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="bottom">
          <div className="wrap">
            <div className="links">
              <Link href="/legal/cgu">CGU</Link>
              <Link href="/legal/confidentialite">Confidentialité</Link>
              <Link href="/legal/mentions-legales">Mentions légales</Link>
              <Link href="/rencontre-trans">Rencontres par ville</Link>
            </div>
            Site réservé aux personnes majeures (18+). En cas de détresse : 3114 (gratuit, 24 h/24).
          </div>
        </footer>
      </body>
    </html>
  );
}
