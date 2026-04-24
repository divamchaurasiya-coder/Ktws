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

  // --- MIDDLEWARE ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Session expired. Please login again.' });
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: 'Your session is invalid. Please login again.' });
      req.user = user;
      next();
    });
  };

  const checkAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized: Admin access required.' });
    }
    next();
  };

  // --- SECTION: AUTH ---
  const authRouter = Router();
  authRouter.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      if (!email || !password) {
        return res.status(400).json({ error: 'Missing email or password.' });
      }

      // Bootstrap Admin Bypass
      if (email === 'admin@ktws.com' && password === 'admin123') {
        const token = jwt.sign({ id: 'boot-admin', email, role: 'admin', name: 'Admin' }, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 24 * 3600 * 1000 });
        return res.json({ user: { id: 'boot-admin', name: 'Admin', role: 'admin' } });
      }

      const client = getSupabase();
      if (!client) return res.status(503).json({ error: 'Database is currently offline. Please try again later.' });

      const { data: user, error } = await client.from('profiles').select('*').eq('email', email).single();
      if (error || !user) {
        return res.status(401).json({ error: 'Account not found. Contact administrator if you think this is an error.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
         return res.status(401).json({ error: 'Incorrect password. Please check and try again.' });
      }

      const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 24 * 3600 * 1000 });
      res.json({ user: { id: user.id, name: user.name, role: user.role } });
    } catch (err: any) { 
      console.error('[AUTH] Login Crash:', err);
      res.status(500).json({ error: 'An internal error occurred during login. Please contact support.' }); 
    }
  });

  authRouter.post('/logout', (req, res) => res.clearCookie('token').json({ ok: true }));
  authRouter.get('/me', authenticate, (req: any, res) => res.json({ user: req.user }));

  authRouter.get('/profile', authenticate, async (req: any, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database Offline' });
    try {
      if (req.user.id === 'boot-admin') {
        return res.json({ id: 'boot-admin', name: 'System Admin', email: 'admin@ktws.com', role: 'admin' });
      }
      const { data, error } = await client.from('profiles').select('id, name, email, role, avatar_url, bio, created_at').eq('id', req.user.id).single();
      if (error) throw error;
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  authRouter.patch('/profile', authenticate, async (req: any, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database Offline' });
    try {
      if (req.user.id === 'boot-admin') {
         return res.status(403).json({ error: 'System Admin profile cannot be modified.' });
      }
      const { data, error } = await client.from('profiles').update(req.body).eq('id', req.user.id).select().single();
      if (error) throw error;
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- SECTION: DASHBOARD ---
  const dashboardRouter = Router();
  dashboardRouter.get('/stats', authenticate, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.json({ stats: { totalBooks: 0, issuedBooks: 0, overdueBooks: 0, activeStudents: 0 }, recentActivity: [] });
    try {
      const [books, issued, overdue, students, activity] = await Promise.all([
        client.from('books').select('total_copies'),
        client.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'issued'),
        client.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
        client.from('transactions').select('student_id', { count: 'exact', head: true }).neq('status', 'returned'),
        client.from('transactions').select('*, students(name), books(title)').neq('status', 'returned').order('issue_date', { ascending: false }).limit(10)
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
    } catch (e: any) { res.status(500).json({ error: 'Failed to fetch dashboard data.' }); }
  });

  // --- SECTION: STUDENTS ---
  const studentsRouter = Router();
  studentsRouter.get('/', authenticate, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.json([]);
    const { data, error } = await client.from('students').select('*').order('name', { ascending: true });
    res.json(error ? { error: error.message } : data);
  });

  studentsRouter.get('/search', authenticate, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.json([]);
    const q = req.query.q as string;
    if (!q) return res.json([]);
    const { data, error } = await client
      .from('students')
      .select('*')
      .or(`name.ilike.%${q}%,qr_code.ilike.%${q}%,class.ilike.%${q}%`)
      .limit(5);
    res.json(error ? [] : data);
  });

  studentsRouter.post('/', authenticate, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Offline' });
    try {
      const student = req.body;
      const { data, error } = await client.from('students').insert([student]).select().single();
      if (error) throw error;
      res.json(data || {});
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  studentsRouter.patch('/:id', authenticate, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Offline' });
    try {
      const { data, error } = await client.from('students').update(req.body).eq('id', req.params.id).select().single();
      if (error) throw error;
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  studentsRouter.post('/bulk', authenticate, async (req: any, res: any) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Unauthorized: Admin access required.' });
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Offline' });
    const { students } = req.body;
    try {
      const { data, error } = await client.from('students').insert(students);
      if (error) throw error;
      res.json({ success: true, count: students.length });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  studentsRouter.get('/:id', authenticate, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Offline' });
    try {
      const { data: student, error: sErr } = await client.from('students').select('*').eq('id', req.params.id).single();
      if (sErr) throw sErr;
      const { data: history, error: hErr } = await client.from('transactions').select('*, books(title, author, barcode)').eq('student_id', req.params.id).order('issue_date', { ascending: false });
      if (hErr) throw hErr;
      res.json({ ...student, history: history.map((h: any) => ({ ...h, book_title: h.books?.title, book_barcode: h.books?.barcode })) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- SECTION: TEACHERS (Admin Only) ---
  const teachersRouter = Router();
  teachersRouter.get('/', authenticate, checkAdmin, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.json([]);
    const { data, error } = await client.from('profiles').select('*').order('name', { ascending: true });
    res.json(error ? { error: error.message } : data);
  });

  teachersRouter.post('/', authenticate, checkAdmin, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Offline' });
    try {
      const { name, email, password, role } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const { data, error } = await client.from('profiles').insert([{ name, email, password: hashedPassword, role: role || 'teacher' }]).select().single();
      if (error) throw error;
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  teachersRouter.patch('/:id', authenticate, checkAdmin, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Offline' });
    try {
      const updateData = { ...req.body };
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }
      const { data, error } = await client.from('profiles').update(updateData).eq('id', req.params.id).select().single();
      if (error) throw error;
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  teachersRouter.delete('/:id', authenticate, checkAdmin, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Offline' });
    try {
      if (req.params.id === 'boot-admin') return res.status(403).json({ error: 'Cannot delete system admin.' });
      const { error } = await client.from('profiles').delete().eq('id', req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- SECTION: BOOKS ---
  const booksRouter = Router();
  booksRouter.get('/', authenticate, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.json([]);
    const { data, error } = await client.from('books').select('*').order('title', { ascending: true });
    res.json(error ? { error: error.message } : data);
  });

  booksRouter.get('/search', authenticate, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.json([]);
    const q = req.query.q as string;
    if (!q) return res.json([]);
    const { data, error } = await client
      .from('books')
      .select('*')
      .or(`title.ilike.%${q}%,author.ilike.%${q}%,barcode.ilike.%${q}%`)
      .limit(5);
    res.json(error ? [] : data);
  });

  booksRouter.post('/', authenticate, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Offline' });
    try {
      const book = req.body;
      const { data, error } = await client.from('books').insert([book]).select().single();
      if (error) throw error;
      res.json(data || {});
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  booksRouter.patch('/:id', authenticate, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Offline' });
    try {
      const { data, error } = await client.from('books').update(req.body).eq('id', req.params.id).select().single();
      if (error) throw error;
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- SECTION: TRANSACTIONS ---
  const transRouter = Router();
  transRouter.get('/', authenticate, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.json([]);
    const { data, error } = await client.from('transactions').select('*, students(name, class, section, qr_code), books(title, author, barcode)').neq('status', 'returned').order('issue_date', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data.map((t: any) => ({ 
      ...t, 
      student_name: t.students?.name, 
      student_class: `${t.students?.class}-${t.students?.section}`,
      student_qr: t.students?.qr_code,
      book_title: t.books?.title,
      book_barcode: t.books?.barcode
    })));
  });

  transRouter.post('/issue', authenticate, async (req: any, res: any) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database Connection Failed' });
    
    const { barcode, studentQR } = req.body;
    try {
      // 1. Fetch current data
      const { data: book, error: bErr } = await client.from('books').select('*').eq('barcode', barcode).single();
      const { data: student, error: sErr } = await client.from('students').select('*').eq('qr_code', studentQR).single();
      
      if (bErr || !book) return res.status(404).json({ error: `Book [${barcode}] not found in system.` });
      if (sErr || !student) return res.status(404).json({ error: `Student [${studentQR}] not found in system.` });

      // 2. Strict Limit: Check if student already has ANY non-returned book
      const { data: activeTrans } = await client
        .from('transactions')
        .select('id, books(title)')
        .eq('student_id', student.id)
        .neq('status', 'returned')
        .limit(1)
        .maybeSingle();

      if (activeTrans) {
        const activeBookTitle = (activeTrans as any).books?.title || 'an existing book';
        return res.status(400).json({ 
          error: `POLICEY VIOLATION: ${student.name} currently holds "${activeBookTitle}". Library policy allows only 1 active book. Please return it first.` 
        });
      }

      // 3. Inventory Integrity: Check availability rigorously
      if (!book.available_copies || book.available_copies <= 0) {
        return res.status(400).json({ 
          error: `INVENTORY ALERT: "${book.title}" is currently out of stock. (Available: 0)` 
        });
      }
      
      const dueDate = new Date(); 
      dueDate.setDate(dueDate.getDate() + 7);
      
      // 4. Atomic-ish Operations
      // Create transaction record
      const { error: issueErr } = await client.from('transactions').insert([{ 
        student_id: student.id, 
        book_id: book.id, 
        due_date: dueDate.toISOString(), 
        status: 'issued' 
      }]);
      
      if (issueErr) throw issueErr;

      // Decrement copies (with floor check)
      const newCount = Math.max(0, (book.available_copies || 1) - 1);
      const { error: updateErr } = await client.from('books')
        .update({ available_copies: newCount })
        .eq('id', book.id);

      if (updateErr) {
        console.error('[ISSUE] Inventory update failed:', updateErr);
        // We don't rollback here because Supabase lacks multi-table transactions in basic JS SDK
        // But we log it for admin review.
      }

      res.json({ 
        success: true, 
        message: `Hooray! "${book.title}" issued to ${student.name}.`,
        dueDate: dueDate.toDateString()
      });
    } catch (e: any) { 
      console.error('[ISSUE] Critical Error:', e);
      res.status(500).json({ error: e.message || 'The library was unable to process this issuance.' }); 
    }
  });

  transRouter.post('/return', authenticate, async (req, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database Connection Failed' });
    
    const { barcode, studentQR } = req.body;
    try {
      const { data: book } = await client.from('books').select('*').eq('barcode', barcode).single();
      const { data: student } = await client.from('students').select('*').eq('qr_code', studentQR).single();
      
      if (!book || !student) {
        return res.status(404).json({ error: 'Matching records for return not found. Check barcode and student QR.' });
      }

      // Find the specific active transaction
      const { data: trans, error: tErr } = await client.from('transactions')
        .select('*')
        .eq('student_id', student.id)
        .eq('book_id', book.id)
        .neq('status', 'returned')
        .limit(1)
        .maybeSingle();

      if (tErr || !trans) {
        return res.status(400).json({ error: `No active issuance records found for ${student.name} with "${book.title}".` });
      }

      // 1. Update transaction
      await client.from('transactions')
        .update({ status: 'returned', return_date: new Date().toISOString() })
        .eq('id', trans.id);

      // 2. Increment copies with cap check
      const newCount = Math.min(book.total_copies || 999, (book.available_copies || 0) + 1);
      await client.from('books')
        .update({ available_copies: newCount })
        .eq('id', book.id);

      res.json({ 
        success: true, 
        message: `Success! ${student.name} returned "${book.title}". Inventory updated.` 
      });
    } catch (e: any) { 
      res.status(500).json({ error: 'System failure during return processing: ' + e.message }); 
    }
  });

  // --- MOUNTING ---
  const rootRouter = Router();

  // Diagnostics
  rootRouter.get('/health', async (req, res) => {
    const client = getSupabase();
    res.json({ status: 'ok', db: !!client });
  });

  rootRouter.get('/troubleshoot', async (req, res) => {
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

  // Resources
  rootRouter.use('/auth', authRouter);
  rootRouter.use('/dashboard', dashboardRouter);
  rootRouter.use('/students', studentsRouter);
  rootRouter.use('/teachers', teachersRouter);
  rootRouter.use('/books', booksRouter);
  rootRouter.use('/transactions', transRouter);
  
  // Backwards compatibility for the old frontend calls
  // (We'll update the frontend, but keeping these here for safety during turn-over)
  rootRouter.post('/issue-book', (req, res) => res.redirect(307, '/api/transactions/issue'));
  rootRouter.post('/return-book', (req, res) => res.redirect(307, '/api/transactions/return'));

  app.use('/api', rootRouter);
  app.use('/', rootRouter);

  appInstance = app;
  return app;
};

// Main app export
export default appInstance || initializeApp();
