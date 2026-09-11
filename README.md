# StreamForge — Vercel-fixed MPD Inspector

This version fixes the Vercel `FUNCTION_INVOCATION_FAILED` problem by using Vercel serverless API functions instead of starting an Express server with `app.listen()`.

## Deploy to Vercel
1. Upload this folder to GitHub, or import the ZIP into a repository.
2. In Vercel, import the repository.
3. Framework preset: **Other**.
4. Build command: leave empty.
5. Output directory: leave empty.
6. Deploy.

The homepage is `public/index.html` and the API endpoint is `/api/inspect`.

## Local
Use Node 18+ and run a simple static server for the frontend. The API files are intended for Vercel.

## Conversion note
Vercel serverless functions are not a good place for arbitrary, long-running FFmpeg conversion jobs. This deployment therefore provides MPD inspection and DRM detection. The project intentionally does not bypass or decrypt DRM.
