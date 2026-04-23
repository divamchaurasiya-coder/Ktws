import { app, startServer } from '../server';

let initialized = false;

export default async (req: any, res: any) => {
  console.log(`[VERCEL] Incoming request: ${req.method} ${req.url}`);
  if (!initialized) {
    try {
      console.log('[VERCEL] Initializing backend server...');
      await startServer();
      initialized = true;
      console.log('[VERCEL] Backend server initialized.');
    } catch (e) {
      console.error('[VERCEL] FATAL Vercel initialization error:', e);
    }
  }
  return app(req, res);
};
