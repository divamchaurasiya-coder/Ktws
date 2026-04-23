import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-ktws-library';

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || 'https://pylohojohmtfigagcxzpc.supabase.co';
// Use service role key if available for administrative bypassing of RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // --- Auth Middleware ---
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

  // --- Auth Routes ---
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    // In a real Supabase SaaS, we'd use supabase.auth.signInWithPassword
    // But to keep the existing manual admin logic withbcrypt (if they don't have Supabase Auth users set up):
    // Let's check a 'profiles' or 'users' table in Supabase
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user || !bcrypt.compareSync(password, user.password)) {
      // Emergency fallback for bootstrap admin if table is empty
      if (email === 'admin@ktws.com' && bcrypt.compareSync(password, bcrypt.hashSync('admin123', 10))) {
        const token = jwt.sign({ id: 'bootstrap-admin', email, role: 'admin', name: 'Admin' }, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict' });
        return res.json({ user: { id: 'bootstrap-admin', email, role: 'admin', name: 'Admin' } });
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 24 * 60 * 60 * 1000 });
    res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
  });

  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    res.json({ user: req.user });
  });

  // --- Student Routes ---
  app.get('/api/students', authenticateToken, async (req, res) => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post('/api/students', authenticateToken, isAdmin, async (req, res) => {
    const { name, class: className, section, qr_code } = req.body;
    const { data, error } = await supabase
      .from('students')
      .insert([{ name, class: className, section, qr_code }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.post('/api/students/bulk', authenticateToken, isAdmin, async (req, res) => {
    const { students } = req.body;
    if (!Array.isArray(students)) return res.status(400).json({ error: 'Expected an array of students' });

    try {
      const { data, error } = await supabase
        .from('students')
        .insert(students.map(s => ({
          name: s.name,
          class: s.class,
          section: s.section,
          qr_code: s.qr_code
        })));

      if (error) throw error;
      res.json({ success: true, count: students.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/books/lookup/:code', authenticateToken, async (req, res) => {
    const { code } = req.params;
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('barcode', code)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Book not found' });
    res.json(data);
  });

  // --- Book Routes ---
  app.get('/api/books', authenticateToken, async (req, res) => {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('title', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post('/api/books', authenticateToken, isAdmin, async (req, res) => {
    const { title, author, barcode, total_copies } = req.body;
    const { data, error } = await supabase
      .from('books')
      .insert([{ title, author, barcode, total_copies, available_copies: total_copies }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  // --- Transaction Routes ---
  app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    const [booksRes, transactionsRes, overdueRes, studentsRes] = await Promise.all([
      supabase.from('books').select('total_copies'),
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'issued'),
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
      supabase.from('transactions').select('student_id', { count: 'exact', head: true }),
      supabase.from('transactions').select('*, students(name), books(title)').order('issue_date', { ascending: false }).limit(10)
    ]);

    const totalBooks = booksRes.data?.reduce((acc, b) => acc + (b.total_copies || 0), 0) || 0;
    
    // We need to fetch the activity list properly (the previous Promise.all had 5 items, wait)
    const { data: recentActivity } = await supabase
      .from('transactions')
      .select('*, students!inner(name), books!inner(title)')
      .order('issue_date', { ascending: false })
      .limit(10);

    res.json({
      stats: {
        totalBooks,
        issuedBooks: transactionsRes.count || 0,
        overdueBooks: overdueRes.count || 0,
        activeStudents: studentsRes.count || 0
      },
      recentActivity: recentActivity?.map(a => ({
        ...a,
        student_name: (a.students as any).name,
        book_title: (a.books as any).title
      })) || []
    });
  });

  app.post('/api/issue-book', authenticateToken, async (req: any, res) => {
    const { barcode, studentQR } = req.body;
    
    try {
      const { data: book } = await supabase.from('books').select('*').eq('barcode', barcode).single();
      const { data: student } = await supabase.from('students').select('*').eq('qr_code', studentQR).single();

      if (!book) return res.status(404).json({ error: 'Book not found' });
      if (!student) return res.status(404).json({ error: 'Student not found' });
      if (book.available_copies <= 0) return res.status(400).json({ error: 'Book out of stock' });

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      // Perform updates
      const { error: transError } = await supabase.from('transactions').insert([{
        student_id: student.id,
        book_id: book.id,
        issued_by: req.user.id === 'bootstrap-admin' ? null : req.user.id,
        due_date: dueDate.toISOString(),
        status: 'issued'
      }]);

      if (transError) throw transError;

      const { error: bookError } = await supabase
        .from('books')
        .update({ available_copies: book.available_copies - 1 })
        .eq('id', book.id);

      if (bookError) throw bookError;

      res.json({ success: true, message: `Book "${book.title}" issued to ${student.name}` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/return-book', authenticateToken, async (req, res) => {
    const { barcode, studentQR } = req.body;

    try {
      const { data: book } = await supabase.from('books').select('*').eq('barcode', barcode).single();
      const { data: student } = await supabase.from('students').select('*').eq('qr_code', studentQR).single();

      if (!book) return res.status(404).json({ error: 'Book not found' });
      if (!student) return res.status(404).json({ error: 'Student not found' });

      const { data: activeTransaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('student_id', student.id)
        .eq('book_id', book.id)
        .neq('status', 'returned')
        .order('issue_date', { ascending: false })
        .limit(1)
        .single();

      if (!activeTransaction) return res.status(404).json({ error: 'No active transaction found' });

      const { error: transError } = await supabase
        .from('transactions')
        .update({ status: 'returned', return_date: new Date().toISOString() })
        .eq('id', activeTransaction.id);

      if (transError) throw transError;

      const { error: bookError } = await supabase
        .from('books')
        .update({ available_copies: book.available_copies + 1 })
        .eq('id', book.id);

      if (bookError) throw bookError;

      res.json({ success: true, message: `Book "${book.title}" returned by ${student.name}` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Vite / Static Handling ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
