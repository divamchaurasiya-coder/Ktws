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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-ktws-library';

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase: any;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.error('Supabase init error:', e);
  }
}

async function startServer() {
  console.log('Starting KTWS Library Server...');
  
  const app = express();
  
  // 1. Core Middlewares
  app.use(cors({ origin: true, credentials: true }));
  app.options('*', cors()); // Enable pre-flight for all routes
  app.use(express.json());
  app.use(cookieParser());
  
  // 2. Request Logging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // 3. API Routes (Mounted FIRST to avoid conflicts)
  const router = express.Router();
  app.use('/api', router);

  // Health check
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', supabase: !!supabase });
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

      if (!supabase) {
        return res.status(503).json({ error: 'Database not connected. Use admin@ktws.com / admin123' });
      }

      const { data: user, error } = await supabase.from('profiles').select('*').eq('email', email).single();
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
    if (!supabase) return res.json([]);
    const { data, error } = await supabase.from('students').select('*').order('name', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  router.post('/students', authenticateToken, isAdmin, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Missing Supabase' });
    const { name, class: className, section, qr_code } = req.body;
    const { data, error } = await supabase.from('students').insert([{ name, class: className, section, qr_code }]).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  router.post('/students/bulk', authenticateToken, isAdmin, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Missing Supabase' });
    const { students } = req.body;
    try {
      const { data, error } = await supabase.from('students').insert(students);
      if (error) throw error;
      res.json({ success: true, count: students.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Book Routes
  router.get('/books/lookup/:code', authenticateToken, async (req, res) => {
    if (!supabase) return res.status(404).json({ error: 'Mock mode: DB not found' });
    const { code } = req.params;
    const { data, error } = await supabase.from('books').select('*').eq('barcode', code).single();
    if (error || !data) return res.status(404).json({ error: 'Book not found' });
    res.json(data);
  });

  router.get('/books', authenticateToken, async (req, res) => {
    if (!supabase) return res.json([]);
    const { data, error } = await supabase.from('books').select('*').order('title', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  router.post('/books', authenticateToken, isAdmin, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Missing Supabase' });
    const { title, author, barcode, total_copies } = req.body;
    const { data, error } = await supabase.from('books').insert([{ title, author, barcode, total_copies, available_copies: total_copies }]).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  // Dashboard Stats
  router.get('/dashboard/stats', authenticateToken, async (req, res) => {
    if (!supabase) return res.json({ stats: { totalBooks: 0, issuedBooks: 0, overdueBooks: 0, activeStudents: 0 }, recentActivity: [] });
    try {
      const [books, issued, overdue, students] = await Promise.all([
        supabase.from('books').select('total_copies'),
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'issued'),
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
        supabase.from('transactions').select('student_id', { count: 'exact', head: true })
      ]);
      const { data: activity } = await supabase.from('transactions').select('*, students(name), books(title)').order('issue_date', { ascending: false }).limit(10);
      
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
    if (!supabase) return res.status(503).json({ error: 'Missing Supabase' });
    const { barcode, studentQR } = req.body;
    try {
      const { data: book } = await supabase.from('books').select('*').eq('barcode', barcode).single();
      const { data: student } = await supabase.from('students').select('*').eq('qr_code', studentQR).single();
      if (!book || !student || book.available_copies <= 0) throw new Error('Invalid book/student or no copies');

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      await supabase.from('transactions').insert([{ student_id: student.id, book_id: book.id, issued_by: req.user.id !== 'bootstrap-admin' ? req.user.id : null, due_date: dueDate.toISOString(), status: 'issued' }]);
      await supabase.from('books').update({ available_copies: book.available_copies - 1 }).eq('id', book.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/return-book', authenticateToken, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Missing Supabase' });
    const { barcode, studentQR } = req.body;
    try {
      const { data: book } = await supabase.from('books').select('*').eq('barcode', barcode).single();
      const { data: student } = await supabase.from('students').select('*').eq('qr_code', studentQR).single();
      const { data: trans } = await supabase.from('transactions').select('*').eq('student_id', student.id).eq('book_id', book.id).neq('status', 'returned').order('issue_date', { ascending: false }).limit(1).single();
      if (!trans) throw new Error('No active transaction');

      await supabase.from('transactions').update({ status: 'returned', return_date: new Date().toISOString() }).eq('id', trans.id);
      await supabase.from('books').update({ available_copies: book.available_copies + 1 }).eq('id', book.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 4. Vite / Static
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[${new Date().toISOString()}] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('SERVER FATAL STARTUP ERROR:', err);
});
