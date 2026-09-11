export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const input = String(body.url || '').trim();
    let parsed;
    try { parsed = new URL(input); } catch { return res.status(400).json({ error: 'Enter a valid http(s) MPD URL.' }); }
    if (!['http:', 'https:'].includes(parsed.protocol)) return res.status(400).json({ error: 'Only http(s) URLs are supported.' });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let response;
    try {
      response = await fetch(parsed.toString(), {
        signal: controller.signal,
        headers: { 'User-Agent': 'MPD-Safe-Converter/2.0' }
      });
    } finally { clearTimeout(timer); }

    if (!response.ok) return res.status(502).json({ error: `The MPD server returned HTTP ${response.status}.` });
    const xml = await response.text();
    if (!xml.trim()) return res.status(502).json({ error: 'The MPD response was empty.' });

    const lower = xml.toLowerCase();
    const markers = [
      ['contentprotection', 'ContentProtection'],
      ['widevine', 'Widevine'],
      ['playready', 'PlayReady'],
      ['fairplay', 'FairPlay'],
      ['cenc:default_kid', 'CENC default_KID'],
      ['com.widevine.alpha', 'Widevine system ID'],
      ['9a04f079-9840-4286-ab92-e65be0885f95', 'PlayReady system ID']
    ];
    const found = markers.filter(([needle]) => lower.includes(needle)).map(([, label]) => label);
    const protectedStream = found.length > 0;

    const videoTracks = (xml.match(/contentType=["']video["']/gi) || []).length;
    const audioTracks = (xml.match(/contentType=["']audio["']/gi) || []).length;

    return res.status(200).json({
      ok: true,
      drm: { protected: protectedStream, indicators: [...new Set(found)] },
      dynamic: /type=["']dynamic["']/i.test(xml),
      videoTracks,
      audioTracks,
      bytes: Buffer.byteLength(xml, 'utf8')
    });
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'The MPD server took too long to respond.'
      : (error?.message || 'Unable to inspect the MPD.');
    return res.status(502).json({ error: message });
  }
}
