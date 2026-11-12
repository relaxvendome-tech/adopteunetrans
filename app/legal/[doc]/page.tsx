import { notFound } from 'next/navigation';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DOCS = ['cgu', 'confidentialite', 'mentions-legales'] as const;
export const dynamicParams = false;
export function generateStaticParams() { return DOCS.map((doc) => ({ doc })); }

function esc(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function inline(s: string) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }

/** Rendu Markdown minimal (titres, listes, paragraphes, gras). */
function md(src: string) {
  const out: string[] = [];
  let list = false;
  for (const raw of src.split('\n')) {
    const l = raw.trim();
    const h = l.match(/^(#{1,4})\s+(.*)/);
    const li = l.match(/^[-*]\s+(.*)/);
    if (!li && list) { out.push('</ul>'); list = false; }
    if (h) out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
    else if (li) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inline(li[1])}</li>`); }
    else if (l) out.push(`<p>${inline(l)}</p>`);
  }
  if (list) out.push('</ul>');
  return out.join('\n');
}

export default async function Legal({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!DOCS.includes(doc as (typeof DOCS)[number])) notFound();
  const src = await readFile(path.join(process.cwd(), 'content', 'legal', `${doc}.md`), 'utf8');
  return <article className="prose" style={{ padding: '32px 0' }} dangerouslySetInnerHTML={{ __html: md(src) }} />;
}
