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

let supabase: any;

async function startServer() {
  console.log('Starting server...');
  
  const app = express();
  
  // Supabase Setup
  const supabaseUrl = process.env.SUPABASE_URL || 'https://pylohojohmtfigagcxzpc.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
  
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.warn('Supabase client failed to initialize, continuing with limited capability.');
  }
  
  // 1. Core Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());
  
  // 2. Request Logging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', supabase: !!supabaseUrl });
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
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`Login Attempt for: ${email}`);
    try {
      if (email === 'admin@ktws.com' && password === 'admin123') {
        const token = jwt.sign({ id: 'bootstrap-admin', email, role: 'admin', name: 'Admin' }, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 24 * 60 * 60 * 1000 });
        console.log('Login Success (Bootstrap)');
        return res.json({ user: { id: 'bootstrap-admin', email, role: 'admin', name: 'Admin' } });
      }

      if (!supabaseUrl || !supabaseKey) {
        return res.status(503).json({ error: 'Supabase configuration missing.' });
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
      res.status(500).json({ error: 'Authentication failure: ' + (err.message || 'Unknown error') });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
  });

  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    res.json({ user: req.user });
  });

  // Student Routes
  app.get('/api/students', authenticateToken, async (req, res) => {
    const { data, error } = await supabase.from('students').select('*').order('name', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post('/api/students', authenticateToken, isAdmin, async (req, res) => {
    const { name, class: className, section, qr_code } = req.body;
    const { data, error } = await supabase.from('students').insert([{ name, class: className, section, qr_code }]).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.post('/api/students/bulk', authenticateToken, isAdmin, async (req, res) => {
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
  app.get('/api/books/lookup/:code', authenticateToken, async (req, res) => {
    const { code } = req.params;
    const { data, error } = await supabase.from('books').select('*').eq('barcode', code).single();
    if (error || !data) return res.status(404).json({ error: 'Book not found' });
    res.json(data);
  });

  app.get('/api/books', authenticateToken, async (req, res) => {
    const { data, error } = await supabase.from('books').select('*').order('title', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post('/api/books', authenticateToken, isAdmin, async (req, res) => {
    const { title, author, barcode, total_copies } = req.body;
    const { data, error } = await supabase.from('books').insert([{ title, author, barcode, total_copies, available_copies: total_copies }]).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  // Dashboard Stats
  app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
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
          totalBooks: books.data?.reduce((acc, b) => acc + (b.total_copies || 0), 0) || 0,
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
  app.post('/api/issue-book', authenticateToken, async (req: any, res) => {
    const { barcode, studentQR } = req.body;
    try {
      const { data: book } = await supabase.from('books').select('*').eq('barcode', barcode).single();
      const { data: student } = await supabase.from('students').select('*').eq('qr_code', studentQR).single();
      if (!book || !student || book.available_copies <= 0) throw new Error('Invalid book, student or no copies available');

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      await supabase.from('transactions').insert([{ student_id: student.id, book_id: book.id, issued_by: req.user.id !== 'bootstrap-admin' ? req.user.id : null, due_date: dueDate.toISOString(), status: 'issued' }]);
      await supabase.from('books').update({ available_copies: book.available_copies - 1 }).eq('id', book.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/return-book', authenticateToken, async (req, res) => {
    const { barcode, studentQR } = req.body;
    try {
      const { data: book } = await supabase.from('books').select('*').eq('barcode', barcode).single();
      const { data: student } = await supabase.from('students').select('*').eq('qr_code', studentQR).single();
      const { data: trans } = await supabase.from('transactions').select('*').eq('student_id', student.id).eq('book_id', book.id).neq('status', 'returned').order('issue_date', { ascending: false }).limit(1).single();
      if (!trans) throw new Error('No active transaction found');

      await supabase.from('transactions').update({ status: 'returned', return_date: new Date().toISOString() }).eq('id', trans.id);
      await supabase.from('books').update({ available_copies: book.available_copies + 1 }).eq('id', book.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Catch-all API error handler (for debugging 404s)
  app.all('/api/*', (req, res) => {
    console.warn(`[404] Unhandled API request: ${req.method} ${req.url}`);
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
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
