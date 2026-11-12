import prefectures from '@/content/prefectures_seo.json';
import top20 from '@/content/villes_top20.json';

export type Prefecture = (typeof prefectures)[number];
export type VilleContenu = (typeof top20)[number];

export const PREFECTURES: Prefecture[] = prefectures;
export const contenuVille = (slug: string): VilleContenu | undefined =>
  (top20 as VilleContenu[]).find((v) => v.slug === slug);
export const prefectureParSlug = (slug: string) => PREFECTURES.find((p) => p.slug === slug);
export const prefectureParDep = (code: string | null | undefined) =>
  PREFECTURES.find((p) => p.code_dep === code);

export const SITE = {
  name: 'Adopte une trans',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://adopteunetrans.com',
};

export function age(birthdate: string) {
  const b = new Date(birthdate);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}
