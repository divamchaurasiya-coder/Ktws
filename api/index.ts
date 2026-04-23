import { app, startServer } from '../server';

let initialized = false;

export default async (req: any, res: any) => {
  try {
    if (!initialized) {
      console.log('[VERCEL] Starting serverless initialization...');
      await startServer();
      initialized = true;
    }
    return app(req, res);
  } catch (err: any) {
    console.error('[VERCEL] Global Handler Catch:', err);
    res.status(500).json({ 
      error: 'Vercel Function Error', 
      message: err.message,
      path: req.url 
    });
  }
};
