export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(501).json({
    error: 'Server-side MPD-to-MP4 conversion is intentionally disabled in this Vercel demo. Use the local converter with FFmpeg for non-DRM media, or use your provider’s authorized export/download workflow for protected media.'
  });
}
