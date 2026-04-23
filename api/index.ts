import { app, bootstrap } from '../server';

let initialized = false;

export default async (req: any, res: any) => {
  try {
    if (!initialized) {
      console.log('[VERCEL] Initializing Serverless Entry...');
      // bootstrap() handles static files/vite, but for serverless we mainly need the app routes
      // which are now mounted synchronously in server.ts
      await bootstrap(); 
      initialized = true;
    }
    return app(req, res);
  } catch (err: any) {
    console.error('[VERCEL] FATAL ERROR:', err);
    res.status(500).json({ 
      error: 'KTWS Vercel Runtime Error', 
      message: err.message,
      tip: 'Check Vercel Deployment Logs for the stack trace'
    });
  }
};
