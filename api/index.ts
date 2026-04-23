import { Express, Router } from 'express';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Global instances for reuse across warm lambda invocations
let appInstance: Express | null = null;
let supabase: SupabaseClient | null = null;

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-ktws-library';

// Helper to get Supabase client lazily
const getSupabase = () => {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  
  if (!url || !key) {
    console.warn('[BACKEND] Missing Database Credentials');
    return null;
  }

  try {
    supabase = createClient(url, key);
    return supabase;
  } catch (e) {
    console.error('[BACKEND] Supabase initialization failed:', e);
    return null;
  }
};

const initializeApp = () => {
  if (appInstance) return appInstance;

  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.options('*', cors());
  app.use(express.json());
  app.use(cookieParser());

  const router = Router();

  // --- DIAGNOSTIC HELPERS ---
  router.get('/health', async (req, res) => {
    const client = getSupabase();
    res.json({ 
      status: 'ok', 
      db_connected: !!client,
      env: {
        url: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
        key: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)
      }
    });
  });

  router.get('/troubleshoot', async (req, res) => {
    if (req.query.debug === '1') {
      return res.json({ alive: true, env: Object.keys(process.env).filter(k => k.includes('SUP') || k.includes('JWT')) });
    }
    const client = getSupabase();
    let error = null;
    if (client) {
      const { error: dbErr } = await client.from('profiles').select('id').limit(1);
      error = dbErr?.message;
    } else error = "No DB Client";
    res.json({ status: error ? 'FAILED' : 'SUCCESS', error });
  });

  // --- AUTH ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: 'Forbidden' });
      req.user = user;
      next();
    });
  };

  router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      if (email === 'admin@ktws.com' && password === 'admin123') {
        const token = jwt.sign({ id: 'boot-admin', email, role: 'admin', name: 'Admin' }, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 24 * 3600 * 1000 });
        return res.json({ user: { id: 'boot-admin', name: 'Admin', role: 'admin' } });
      }
      const client = getSupabase();
      if (!client) return res.status(503).json({ error: 'Database Offline' });
      const { data: user, error } = await client.from('profiles').select('*').eq('email', email).single();
      if (error || !user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Invalid credentials' });
      const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 24 * 3600 * 1000 });
      res.json({ user: { id: user.id, name: user.name, role: user.role } });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post('/auth/logout', (req, res) => res.clearCookie('token').json({ ok: true }));
  router.get('/auth/me', authenticate, (req: any, res) => res.json({ user: req.user }));

  // --- CORE LOGIC ---
  router.get('/dashboard/stats', authenticate, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.json({ stats: { totalBooks: 0, issuedBooks: 0, overdueBooks: 0, activeStudents: 0 }, recentActivity: [] });
    try {
      const [books, issued, overdue, students, activity] = await Promise.all([
        client.from('books').select('total_copies'),
        client.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'issued'),
        client.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
        client.from('transactions').select('student_id', { count: 'exact', head: true }),
        client.from('transactions').select('*, students(name), books(title)').order('issue_date', { ascending: false }).limit(10)
      ]);
      res.json({
        stats: {
          totalBooks: books.data?.reduce((acc: number, b: any) => acc + (b.total_copies || 0), 0) || 0,
          issuedBooks: issued.count || 0,
          overdueBooks: overdue.count || 0,
          activeStudents: students.count || 0
        },
        recentActivity: activity.data?.map((a: any) => ({ ...a, student_name: a.students?.name, book_title: a.books?.title })) || []
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  router.get('/students', authenticate, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.json([]);
    const { data, error } = await client.from('students').select('*').order('name', { ascending: true });
    res.json(error ? { error: error.message } : data);
  });

  router.get('/books', authenticate, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.json([]);
    const { data, error } = await client.from('books').select('*').order('title', { ascending: true });
    res.json(error ? { error: error.message } : data);
  });

  router.get('/transactions', authenticate, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.json([]);
    const { data, error } = await client.from('transactions').select('*, students(name, class, section), books(title, author, barcode)').order('issue_date', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data.map((t: any) => ({ ...t, student_name: t.students?.name, student_class: `${t.students?.class}-${t.students?.section}`, book_title: t.books?.title })));
  });

  // Mount at both to be safe
  app.use('/api', router);
  app.use('/', router);

  appInstance = app;
  return app;
};

// Vercel Serverless Entry Point
const handler = async (req: any, res: any) => {
  try {
    const app = initializeApp();
    return app(req, res);
  } catch (err: any) {
    console.error('[VERCEL] Request Failure:', err);
    res.status(500).json({ 
      error: 'CRITICAL_BOOT_ERROR', 
      message: err.message,
      tip: 'The server failed to initialize lazily.' 
    });
  }
};

// Local Development Support
if (!process.env.VERCEL) {
  const devApp = initializeApp();
  const PORT = 3000;
  devApp.listen(PORT, '0.0.0.0', () => {
    console.log(`[DEV] Standalone server running at http://localhost:${PORT}`);
  });
}

export default handler;
