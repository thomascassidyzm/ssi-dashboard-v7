/**
 * The learner read path for the /guess game's text — LIVE rows only, no sign-in.
 *
 *   GET /api/guess-text-published?known=eng
 *   200 { known, fallbackFrom: null | 'eng', items: { tell: {id: text}, pair: {...}, place_note: {...}, place_where: {...} } }
 *
 * The one rule it keeps: it returns state='live' rows and nothing else. The state filter is on
 * the query, and liveMap() drops anything else a second time. A draft is unreachable here; there
 * is no parameter that asks for one. A known language with no text gets English, item by item;
 * the game itself falls back to the text bundled in its build if this fails, so a failure here
 * is never a blank game.
 */
import { getSupabase } from './lib/supabase.js';
import { DEFAULT_KNOWN, validKnown, withFallback } from './lib/guess-text.js';

const TABLE = 'guess_text_items';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') { res.setHeader('Cache-Control', 'no-store'); return res.status(405).json({ error: 'Method not allowed' }); }

  const known = req.query?.known || DEFAULT_KNOWN;
  if (!validKnown(known)) { res.setHeader('Cache-Control', 'no-store'); return res.status(400).json({ error: 'known must be a three-letter language code' }); }

  const supabase = getSupabase();
  if (!supabase) { res.setHeader('Cache-Control', 'no-store'); return res.status(500).json({ error: 'Database not configured' }); }

  const read = (lang) => supabase.from(TABLE).select('kind, item_id, content, state').eq('known_lang', lang).eq('state', 'live');
  const own = await read(known);
  if (own.error) { res.setHeader('Cache-Control', 'no-store'); return res.status(500).json({ error: own.error.message }); }
  let eng = { data: [] };
  if (known !== DEFAULT_KNOWN) {
    eng = await read(DEFAULT_KNOWN);
    if (eng.error) { res.setHeader('Cache-Control', 'no-store'); return res.status(500).json({ error: eng.error.message }); }
  }

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return res.json({ known, ...withFallback(own.data || [], eng.data || [], known) });
}
