const TRACKING_PARAMS = new Set([
  'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
  'ref','fbclid','gclid','mc_cid','mc_eid','igshid','source',
]);

const ordinal = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function canonicalizeUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  url.hash = '';
  url.hostname = url.hostname.toLowerCase();
  url.username = '';
  url.password = '';
  if (
    (url.protocol === 'https:' && url.port === '443') ||
    (url.protocol === 'http:' && url.port === '80')
  ) {
    url.port = '';
  }

  const kept = [...url.searchParams.entries()]
    .filter(([k]) => !TRACKING_PARAMS.has(k.toLowerCase()))
    .sort(([ak, av], [bk, bv]) => ordinal(ak, bk) || ordinal(av, bv));
  url.search = '';
  for (const [k, v] of kept) url.searchParams.append(k, v);

  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}
