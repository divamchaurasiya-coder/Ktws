import { app, startServer } from '../server';

let initialized = false;

export default async (req: any, res: any) => {
  if (!initialized) {
    try {
      await startServer();
      initialized = true;
    } catch (e) {
      console.error('Vercel initialization error:', e);
    }
  }
  return app(req, res);
};
