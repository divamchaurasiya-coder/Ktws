import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cors from 'cors';

import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-ktws-library';

// Initialize app instance
const app = express();

// Supabase Setup (Better detection)
let supabase: any;
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

let routesMounted = false;

async function startServer() {
  if (routesMounted) return;
  
  console.log('Mounting KTWS Library Server Routes...');
  
  // 1. Core Middlewares
  app.use(cors({ origin: true, credentials: true }));
  app.options('*', cors());
  app.use(express.json());
  app.use(cookieParser());
  
  // 2. Request Logging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // 3. API Routes (Mounted FIRST)
  const router = express.Router();

  // Health check
  router.get('/health', async (req, res) => {
    const client = getSupabase();
    let dbWorking = false;
    let dbMsg = 'No Client';

    if (client) {
      try {
        const { error } = await client.from('profiles').select('count', { count: 'exact', head: true }).limit(1);
        if (error) {
          dbMsg = error.message;
        } else {
          dbWorking = true;
          dbMsg = 'Healthy';
        }
      } catch (e: any) {
        dbMsg = e.message;
      }
    }

    res.json({ 
      status: 'ok', 
      supabase: !!client,
      working: dbWorking,
      msg: dbMsg,
      timestamp: new Date().toISOString(),
      env: {
        hasUrl: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
        hasKey: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
        hasJwt: !!process.env.JWT_SECRET
      }
    });
  });

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: 'Forbidden' });
      req.user = user;
      next();
    });
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
  };

  // Auth Routes
  router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt: ${email}`);

    try {
      // Emergency Bootstrap Admin (Always works)
      if (email === 'admin@ktws.com' && password === 'admin123') {
        const token = jwt.sign({ id: 'bootstrap-admin', email, role: 'admin', name: 'Admin' }, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 24 * 60 * 60 * 1000 });
        return res.json({ user: { id: 'bootstrap-admin', email, role: 'admin', name: 'Admin' } });
      }

      const client = getSupabase();
      if (!client) {
        return res.status(503).json({ error: 'Database not connected. Check environment variables (Error 69)' });
      }

      const { data: user, error } = await client.from('profiles').select('*').eq('email', email).single();
      if (error || !user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 24 * 60 * 60 * 1000 });
      res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name } });
    } catch (err: any) {
      console.error('Login Error:', err);
      res.status(500).json({ error: 'Critical failure: ' + err.message });
    }
  });

  router.post('/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
  });

  router.get('/auth/me', authenticateToken, (req: any, res) => {
    res.json({ user: req.user });
  });

  // Student Routes
  router.get('/students', authenticateToken, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.json([]);
    const { data, error } = await client.from('students').select('*').order('name', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  router.post('/students', authenticateToken, isAdmin, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Missing Supabase' });
    const { name, class: className, section, qr_code } = req.body;
    const { data, error } = await client.from('students').insert([{ name, class: className, section, qr_code }]).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  router.post('/students/bulk', authenticateToken, isAdmin, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Missing Supabase' });
    const { students } = req.body;
    try {
      const { data, error } = await client.from('students').insert(students);
      if (error) throw error;
      res.json({ success: true, count: students.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Book Routes
  router.get('/books/lookup/:code', authenticateToken, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.status(404).json({ error: 'Mock mode: DB not found' });
    const { code } = req.params;
    const { data, error } = await client.from('books').select('*').eq('barcode', code).single();
    if (error || !data) return res.status(404).json({ error: 'Book not found' });
    res.json(data);
  });

  router.get('/books', authenticateToken, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.json([]);
    const { data, error } = await client.from('books').select('*').order('title', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  router.post('/books', authenticateToken, isAdmin, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Missing Supabase' });
    const { title, author, barcode, total_copies } = req.body;
    const { data, error } = await client.from('books').insert([{ title, author, barcode, total_copies, available_copies: total_copies }]).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  // Dashboard Stats
  router.get('/dashboard/stats', authenticateToken, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.json({ stats: { totalBooks: 0, issuedBooks: 0, overdueBooks: 0, activeStudents: 0 }, recentActivity: [] });
    try {
      const [books, issued, overdue, students] = await Promise.all([
        client.from('books').select('total_copies'),
        client.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'issued'),
        client.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
        client.from('transactions').select('student_id', { count: 'exact', head: true })
      ]);
      const { data: activity } = await client.from('transactions').select('*, students(name), books(title)').order('issue_date', { ascending: false }).limit(10);
      
      res.json({
        stats: {
          totalBooks: books.data?.reduce((acc: number, b: any) => acc + (b.total_copies || 0), 0) || 0,
          issuedBooks: issued.count || 0,
          overdueBooks: overdue.count || 0,
          activeStudents: students.count || 0
        },
        recentActivity: activity?.map((a: any) => ({ ...a, student_name: a.students?.name, book_title: a.books?.title })) || []
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Transaction Routes
  router.post('/issue-book', authenticateToken, async (req: any, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Missing Supabase' });
    const { barcode, studentQR } = req.body;
    try {
      const { data: book } = await client.from('books').select('*').eq('barcode', barcode).single();
      const { data: student } = await client.from('students').select('*').eq('qr_code', studentQR).single();
      if (!book || !student || book.available_copies <= 0) throw new Error('Invalid book/student or no copies');

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      await client.from('transactions').insert([{ student_id: student.id, book_id: book.id, issued_by: req.user.id !== 'bootstrap-admin' ? req.user.id : null, due_date: dueDate.toISOString(), status: 'issued' }]);
      await client.from('books').update({ available_copies: book.available_copies - 1 }).eq('id', book.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/return-book', authenticateToken, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Missing Supabase' });
    const { barcode, studentQR } = req.body;
    try {
      const { data: book } = await client.from('books').select('*').eq('barcode', barcode).single();
      const { data: student } = await client.from('students').select('*').eq('qr_code', studentQR).single();
      const { data: trans } = await client.from('transactions').select('*').eq('student_id', student.id).eq('book_id', book.id).neq('status', 'returned').order('issue_date', { ascending: false }).limit(1).single();
      if (!trans) throw new Error('No active transaction');

      await client.from('transactions').update({ status: 'returned', return_date: new Date().toISOString() }).eq('id', trans.id);
      await client.from('books').update({ available_copies: book.available_copies + 1 }).eq('id', book.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Mount API router
  app.use('/api', router);
  routesMounted = true;

  // 4. Vite / Static (Only in local/standard environments)
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    // Note: On Vercel, static files are handled by the rewriter, 
    // but we keep this for standalone production builds
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
    }
  }

  // Only listen if explicitly called as a main module (not via Vercel)
  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[${new Date().toISOString()}] Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

// Export app and startup for Vercel
export { app, startServer };

// Auto-start if running locally
if (!process.env.VERCEL) {
  startServer().catch(err => {
    console.error('SERVER FATAL STARTUP ERROR:', err);
  });
}
