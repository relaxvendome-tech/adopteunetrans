import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PREFECTURES, contenuVille, prefectureParSlug } from '@/lib/data';

export const dynamicParams = false;
export function generateStaticParams() {
  return PREFECTURES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = prefectureParSlug(slug);
  if (!p) return {};
  const indexable = p.priorite.startsWith('1');
  return {
    title: p.title,
    description: p.meta_description,
    alternates: { canonical: p.url },
    // Priorité 2 : non indexée tant que la page n'a pas de contenu propre (évite les « doorway pages »).
    robots: indexable ? undefined : { index: false, follow: true },
  };
}

export default async function Ville({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = prefectureParSlug(slug);
  if (!p) notFound();
  const c = contenuVille(slug);
  const voisines = PREFECTURES.filter((x) => x.region === p.region && x.slug !== p.slug).slice(0, 6);

  return (
    <article style={{ padding: '32px 0' }} className="prose">
      <h1>{p.h1}</h1>
      <p className="muted">{p.departement} ({p.code_dep}) · {p.region}</p>
      {c ? (
        <>
          <p>{c.intro}</p>
          <div className="card"><strong>Conseil sécurité :</strong> {c.conseil_securite}</div>
          <h2>Autour de {p.prefecture}</h2>
          <p>{c.villes_voisines.join(' · ')}</p>
        </>
      ) : (
        <p>
          Vous cherchez une rencontre trans à {p.prefecture} ou ailleurs dans le département {p.departement} ?
          Inscrivez-vous gratuitement : profils vérifiés, messagerie protégée et respect garanti pour les personnes
          trans et leurs partenaires.
        </p>
      )}
      <p style={{ margin: '28px 0' }}><Link className="btn" href="/connexion">Rejoindre gratuitement</Link></p>
      {voisines.length > 0 && (
        <>
          <h2>Ailleurs en {p.region}</h2>
          <p style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
            {voisines.map((v) => <Link key={v.slug} href={v.url}>Rencontre trans à {v.prefecture}</Link>)}
          </p>
        </>
      )}
    </article>
  );
}
