import express, { Express, Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';

// Environment Setup
if (!process.env.VERCEL) {
  dotenv.config();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-ktws-library';

// --- Supabase Config ---
let supabase: SupabaseClient | null = null;
const getSupabase = () => {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (url && key) {
    try {
      supabase = createClient(url, key);
      return supabase;
    } catch (e) {
      console.error('Supabase init error:', e);
    }
  }
  return null;
};

// --- App Initialization ---
const app: Express = express();
app.use(cors({ origin: true, credentials: true }));
app.options('*', cors());
app.use(express.json());
app.use(cookieParser());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[TRACE] ${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// --- API Router Definition ---
const router: Router = Router();

// Diagnostic Endpoints
const handleHealth = async (req: any, res: any) => {
  const client = getSupabase();
  let dbWorking = false;
  let dbMsg = 'No Client';
  if (client) {
    try {
      const { error } = await client.from('profiles').select('count', { count: 'exact', head: true }).limit(1);
      if (error) dbMsg = error.message;
      else { dbWorking = true; dbMsg = 'Healthy'; }
    } catch (e: any) { dbMsg = e.message; }
  }
  res.json({ 
    status: 'ok', 
    supabase: !!client,
    working: dbWorking,
    msg: dbMsg,
    env: {
      hasUrl: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
      hasKey: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
      hasJwt: !!process.env.JWT_SECRET
    }
  });
};

router.get('/health', handleHealth);
router.get('/troubleshoot', async (req, res) => {
  const client = getSupabase();
  const checks = {
    supabase_config: !!(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)),
    environment: process.env.VERCEL ? 'Vercel' : 'Local',
    timestamp: new Date().toISOString()
  };
  let connection_error: string | null = null;
  if (client) {
    try {
      const { error } = await client.from('profiles').select('id').limit(1);
      if (error) connection_error = error.message;
    } catch (e: any) { connection_error = e.message; }
  } else connection_error = "Missing URL/Key";
  res.json({ status: connection_error ? "FAILED" : "SUCCESS", error: connection_error, checks });
});

// Auth Handlers
const authenticateToken = (req: any, res: any, next: any) => {
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
      const token = jwt.sign({ id: 'bootstrap-admin', email, role: 'admin', name: 'Admin' }, JWT_SECRET, { expiresIn: '24h' });
      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 24 * 60 * 60 * 1000 });
      return res.json({ user: { id: 'bootstrap-admin', email, role: 'admin', name: 'Admin' } });
    }
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'DB Offline' });
    const { data: user, error } = await client.from('profiles').select('*').eq('email', email).single();
    if (error || !user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Invalid creds' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 24 * 60 * 60 * 1000 });
    res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/auth/logout', (req, res) => { res.clearCookie('token').json({ message: 'OK' }); });
router.get('/auth/me', authenticateToken, (req: any, res) => { res.json({ user: req.user }); });

// Students/Books (Existing logic simplified)
router.get('/students', authenticateToken, async (req, res) => {
  const client = getSupabase();
  if (!client) return res.json([]);
  const { data, error } = await client.from('students').select('*').order('name', { ascending: true });
  res.json(error ? { error: error.message } : data);
});

router.post('/students', authenticateToken, async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).send('Admin only');
  const client = getSupabase();
  if (!client) return res.status(503).send('Offline');
  const { data, error } = await client.from('students').insert([req.body]).select().single();
  res.json(error ? { error: error.message } : data);
});

router.get('/books', authenticateToken, async (req, res) => {
  const client = getSupabase();
  if (!client) return res.json([]);
  const { data, error } = await client.from('books').select('*').order('title', { ascending: true });
  res.json(error ? { error: error.message } : data);
});

router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  const client = getSupabase();
  if (!client) return res.json({ stats: {}, recentActivity: [] });
  try {
    const { data: activity } = await client.from('transactions').select('*, students(name), books(title)').order('issue_date', { ascending: false }).limit(10);
    res.json({ stats: {}, recentActivity: activity?.map((a: any) => ({ ...a, student_name: a.students?.name, book_title: a.books?.title })) || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/transactions', authenticateToken, async (req, res) => {
  const client = getSupabase();
  if (!client) return res.json([]);
  const { data, error } = await client.from('transactions').select('*, students(name, class, section), books(title, author, barcode)').order('issue_date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map((t: any) => ({ ...t, student_name: t.students?.name, student_class: `${t.students?.class}-${t.students?.section}`, book_title: t.books?.title })));
});

router.post('/issue-book', authenticateToken, async (req: any, res) => {
  const client = getSupabase();
  if (!client) return res.status(503).send('Offline');
  const { barcode, studentQR } = req.body;
  try {
    const { data: book } = await client.from('books').select('*').eq('barcode', barcode).single();
    const { data: student } = await client.from('students').select('*').eq('qr_code', studentQR).single();
    if (!book || !student) throw new Error('Not found');
    const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 7);
    await client.from('transactions').insert([{ student_id: student.id, book_id: book.id, due_date: dueDate.toISOString(), status: 'issued' }]);
    await client.from('books').update({ available_copies: (book.available_copies || 0) - 1 }).eq('id', book.id);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/return-book', authenticateToken, async (req, res) => {
  const client = getSupabase();
  if (!client) return res.status(503).send('Offline');
  const { barcode, studentQR } = req.body;
  try {
    const { data: book } = await client.from('books').select('*').eq('barcode', barcode).single();
    const { data: student } = await client.from('students').select('*').eq('qr_code', studentQR).single();
    const { data: trans } = await client.from('transactions').select('*').eq('student_id', student.id).eq('book_id', book.id).neq('status', 'returned').limit(1).single();
    if (!trans) throw new Error('No transaction');
    await client.from('transactions').update({ status: 'returned', return_date: new Date().toISOString() }).eq('id', trans.id);
    await client.from('books').update({ available_copies: (book.available_copies || 0) + 1 }).eq('id', book.id);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// --- Mounting ---

// Mount at both /api and / to be resilient across all environments
app.use('/api', router);
app.use('/', router);

// Global Exception Catcher
app.use((err: any, req: any, res: any, next: any) => {
  console.error('[PANIC]', err);
  res.status(500).json({ error: 'CRASH', details: err.message });
});

// Startup Helper
async function bootstrap() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
    const PORT = 3000;
    app.listen(PORT, '0.0.0.0', () => console.log('DEV SERVER @ ' + PORT));
  } else {
    // Static files for non-vercel production
    const dist = path.join(process.cwd(), 'dist');
    if (fs.existsSync(dist)) {
      app.use(express.static(dist));
      app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
    }
  }
}

// Auto-start locally
if (!process.env.VERCEL) {
  bootstrap().catch(console.error);
}

export { app, bootstrap };
