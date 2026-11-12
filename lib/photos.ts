import type { SupabaseClient } from '@supabase/supabase-js';

export type Photo = { id: string; profile_id: string; storage_path: string; position: number; url: string };

/** Photos signées (1 h) des profils demandés. onlyMain = seulement la photo principale. */
export async function photosFor(sb: SupabaseClient, ids: string[], onlyMain = false): Promise<Photo[]> {
  if (ids.length === 0) return [];
  let q = sb.from('photos').select('id,profile_id,storage_path,position').in('profile_id', ids).order('position');
  if (onlyMain) q = q.eq('position', 0);
  const { data } = await q;
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const { data: signed } = await sb.storage.from('photos').createSignedUrls(rows.map((r) => r.storage_path), 3600);
  return rows.map((r, i) => ({ ...r, url: signed?.[i]?.signedUrl ?? '' })).filter((p) => p.url);
}
