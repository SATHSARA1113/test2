const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const OUTPUTS = path.join(ROOT, 'outputs');
fs.mkdirSync(OUTPUTS, { recursive: true });

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(ROOT, 'public')));

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

function detectDrm(xml) {
  const lower = xml.toLowerCase();
  const indicators = [
    'contentprotection',
    'widevine',
    'playready',
    'fairplay',
    'cenc:default_kid',
    'clearkey'
  ];
  const found = indicators.filter(x => lower.includes(x));
  return { protected: found.length > 0, indicators: [...new Set(found)] };
}

function fetchManifest(url) {
  return new Promise((resolve, reject) => {
    const temp = path.join(os.tmpdir(), `manifest-${crypto.randomBytes(8).toString('hex')}.mpd`);
    const args = ['-hide_banner', '-loglevel', 'error', '-i', url, '-map', '0:0', '-f', 'data', '-'];
    // We don't use ffmpeg output as the manifest parser. Curl is used if available for predictable MPD text retrieval.
    const curl = spawn('curl', ['-L', '--fail', '--max-time', '20', '-sS', url]);
    let data = '';
    let err = '';
    curl.stdout.on('data', c => data += c.toString());
    curl.stderr.on('data', c => err += c.toString());
    curl.on('close', code => {
      if (code !== 0 || !data.trim()) return reject(new Error(err || 'Could not download MPD manifest'));
      resolve(data);
    });
    curl.on('error', reject);
  });
}

app.post('/api/inspect', async (req, res) => {
  const { url } = req.body || {};
  if (!isHttpUrl(url)) return res.status(400).json({ error: 'Enter a valid http(s) MPD URL.' });
  try {
    const xml = await fetchManifest(url);
    const drm = detectDrm(xml);
    const dynamic = /type=["']dynamic["']/i.test(xml);
    const videoTracks = (xml.match(/contentType=["']video["']/gi) || []).length;
    const audioTracks = (xml.match(/contentType=["']audio["']/gi) || []).length;
    res.json({ ok: true, drm, dynamic, videoTracks, audioTracks, size: Buffer.byteLength(xml) });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.post('/api/convert', async (req, res) => {
  const { url } = req.body || {};
  if (!isHttpUrl(url)) return res.status(400).json({ error: 'Enter a valid http(s) MPD URL.' });
  let manifest;
  try { manifest = await fetchManifest(url); } catch (e) { return res.status(502).json({ error: e.message }); }
  const drm = detectDrm(manifest);
  if (drm.protected) {
    return res.status(403).json({
      error: 'This MPD declares DRM/content protection. This demo will not bypass or decrypt DRM.',
      drm: drm.indicators
    });
  }

  const id = crypto.randomBytes(10).toString('hex');
  const outName = `${id}.mp4`;
  const outPath = path.join(OUTPUTS, outName);

  const ffmpeg = spawn('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', url,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    outPath
  ]);
  let err = '';
  ffmpeg.stderr.on('data', c => err += c.toString());
  ffmpeg.on('error', e => {
    if (e.code === 'ENOENT') return res.status(500).json({ error: 'ffmpeg is not installed on the server.' });
    return res.status(500).json({ error: e.message });
  });
  ffmpeg.on('close', code => {
    if (code !== 0 || !fs.existsSync(outPath)) {
      return res.status(500).json({ error: err || 'Conversion failed.' });
    }
    res.json({ ok: true, file: `/download/${outName}` });
  });
});

app.get('/download/:name', (req, res) => {
  const safe = path.basename(req.params.name);
  const file = path.join(OUTPUTS, safe);
  if (!fs.existsSync(file)) return res.status(404).send('File not found');
  res.download(file, safe);
});

app.listen(PORT, () => console.log(`MPD Converter running at http://localhost:${PORT}`));
