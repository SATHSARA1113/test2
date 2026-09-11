# StreamForge — MPD to MP4

A small Express website that:
- accepts an MPEG-DASH `.mpd` URL,
- inspects the manifest,
- detects common DRM/content-protection markers,
- converts non-DRM DASH media to MP4 using ffmpeg,
- refuses DRM-protected manifests rather than bypassing/decrypting them.

## Requirements
- Node.js 18+
- ffmpeg in PATH
- curl in PATH

## Run
```bash
npm install
npm start
```
Then open http://localhost:3000

## Notes
This is intentionally not a DRM circumvention tool. For media you own, integrate your provider's authorized export/download workflow before running conversion.
