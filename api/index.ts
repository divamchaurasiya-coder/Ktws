import { app, bootstrap } from '../server';

let initialized = false;

export default async (req: any, res: any) => {
  // --- LOW-LEVEL DEBUG INTERCEPT ---
  // If this works, the crash is inside the server.ts imports/logic.
  // If this also fails, the crash is in the dependencies or Vercel config.
  if (req.url.includes('debug=1')) {
    return res.status(200).json({ 
      status: 'DEBUG_OK', 
      msg: 'The Vercel Function is alive!', 
      env_keys: Object.keys(process.env).filter(k => k.includes('SUPABASE')) 
    });
  }

  try {
    return app(req, res);
  } catch (err: any) {
    console.error('[VERCEL] FATAL ERROR:', err);
    res.status(500).json({ 
      error: 'KTWS Vercel Runtime Error', 
      message: err.message
    });
  }
};
