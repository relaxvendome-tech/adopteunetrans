import Link from 'next/link';
import type { Metadata } from 'next';
import { PREFECTURES } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Rencontre trans par ville : les 101 départements de France',
  keywords: ['rencontre trans par ville', 'rencontre trans près de chez moi', 'site de rencontre trans France', 'rencontre transgenre département'],
  description: 'Trouvez des rencontres trans respectueuses dans votre ville : les 101 préfectures de France et d’outre-mer.',
  alternates: { canonical: '/rencontre-trans' },
};

export default function Villes() {
  const regions = [...new Set(PREFECTURES.map((p) => p.region))].sort((a, b) => a.localeCompare(b, 'fr'));
  return (
    <section style={{ padding: '32px 0' }}>
      <h1>Rencontre trans par ville et par département</h1>
      {regions.map((r) => (
        <div key={r}>
          <h2 style={{ fontSize: 20 }}>Rencontre trans en {r}</h2>
          <p style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
            {PREFECTURES.filter((p) => p.region === r).map((p) => (
              <Link key={p.slug} href={p.url}>{p.prefecture} ({p.code_dep})</Link>
            ))}
          </p>
        </div>
      ))}
    </section>
  );
}
