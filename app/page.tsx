import Link from 'next/link';
import { PREFECTURES } from '@/lib/data';

const TOP = ['paris', 'lyon', 'marseille', 'toulouse', 'bordeaux', 'lille', 'nantes', 'nice', 'montpellier', 'strasbourg'];

export default function Home() {
  return (
    <>
      <section className="hero">
        <p className="muted" style={{ fontWeight: 600, color: 'var(--accent)', letterSpacing: '.05em', textTransform: 'uppercase', fontSize: 13 }}>
          Rencontres trans · gratuit · 18+
        </p>
        <h1>Des rencontres où l&apos;on vous respecte, vraiment.</h1>
        <p className="muted" style={{ fontSize: 18, maxWidth: 620, lineHeight: 1.55 }}>
          Femmes trans, hommes trans, personnes non binaires et celles et ceux qui les aiment.
          Inscription gratuite, messagerie protégée, charte anti-fétichisation.
        </p>
        <p style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
          <Link href="/connexion" className="btn">Créer mon profil gratuitement</Link>
          <Link href="/rencontre-trans" className="btn ghost">Voir les villes</Link>
        </p>
      </section>

      <section id="securite" className="grid" style={{ margin: '24px 0 40px' }}>
        <div className="card"><h2 style={{ marginTop: 0 }}>Messagerie protégée</h2><p className="muted">Les premiers messages arrivent dans « Demandes » : pas de lien ni de numéro, une seule relance, filtre « profils vérifiés uniquement ».</p></div>
        <div className="card"><h2 style={{ marginTop: 0 }}>Respect avant tout</h2><p className="muted">Charte anti-fétichisation, blocage et signalement en un clic, modération humaine.</p></div>
        <div className="card"><h2 style={{ marginTop: 0 }}>Vos données protégées</h2><p className="muted">Hébergement en Europe. Votre date de naissance et votre position ne sont jamais visibles par les autres membres.</p></div>
      </section>

      <section>
        <h2>Rencontre trans près de chez vous</h2>
        <p style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
          {TOP.map((s) => {
            const p = PREFECTURES.find((x) => x.slug === s)!;
            return <Link key={s} href={p.url}>{p.prefecture}</Link>;
          })}
          <Link href="/rencontre-trans">Toutes les villes →</Link>
        </p>
      </section>
    </>
  );
}
