# Database Schema

The Library Management system uses **Supabase** (PostgreSQL) for data storage. Below is the SQL schema required to set up the database tables.

## 1. Profiles (Teachers)
Stores user information for teachers and staff who access the system.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- Bcrypt hashed
  name TEXT NOT NULL,
  role TEXT DEFAULT 'teacher',
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 2. Students
Stores student records and their unique identification codes.

```sql
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  section TEXT NOT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 3. Books
Stores the library catalog.

```sql
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  barcode TEXT UNIQUE NOT NULL,
  total_copies INTEGER DEFAULT 1,
  available_copies INTEGER DEFAULT 1,
  status TEXT DEFAULT 'Available',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 4. Transactions
Stores the history of book issues and returns.

```sql
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES public.students(id),
  book_id UUID REFERENCES public.books(id),
  issue_date TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ NOT NULL,
  return_date TIMESTAMPTZ,
  status TEXT DEFAULT 'issued', -- issued, returned, overdue
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Core Security Note
All operations are protected by **JWT Authentication**. Ensure your Supabase RLS (Row Level Security) is configured or use a Service Role Key for backend operations as implemented in `api/index.ts`.
