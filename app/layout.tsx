import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { SITE } from '@/lib/data';
import { supabaseServer } from '@/lib/supabase/server';

const KEYWORDS = [
  'site de rencontre trans', 'rencontre trans', 'rencontre trans gratuit', 'site de rencontre transgenre',
  'rencontre transgenre', 'rencontre femme trans', 'rencontre homme trans', 'rencontre MTF', 'rencontre FTM',
  'rencontre non binaire', 'rencontre LGBT', 'appli de rencontre trans', 'rencontre trans France', 'adopte une trans',
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `Site de rencontre trans gratuit – ${SITE.name}`, template: `%s | ${SITE.name}` },
  description: 'Site de rencontre trans gratuit et respectueux : femmes trans, hommes trans, personnes non binaires et leurs partenaires. Messagerie protégée, charte anti-fétichisation, 18+.',
  keywords: KEYWORDS,
  applicationName: SITE.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website', locale: 'fr_FR', siteName: SITE.name, url: '/',
    title: `Site de rencontre trans gratuit – ${SITE.name}`,
    description: 'Rencontres trans respectueuses partout en France. Inscription gratuite, messagerie protégée.',
  },
  twitter: { card: 'summary', title: `Site de rencontre trans gratuit – ${SITE.name}`, description: 'Rencontres trans respectueuses partout en France. Inscription gratuite.' },
  robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  formatDetection: { telephone: false },
};

const JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', name: SITE.name, alternateName: 'Site de rencontre trans gratuit', url: SITE.url, inLanguage: 'fr-FR' },
    { '@type': 'Organization', name: SITE.name, url: SITE.url },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  return (
    <html lang="fr">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }} />
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
