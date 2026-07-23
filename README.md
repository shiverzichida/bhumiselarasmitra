# Bhumi Docs Workspace

Modern full-stack JavaScript/TypeScript workspace untuk:

- Bill of Lading
- Shipping Instruction
- Invoice

Stack utama:

- Next.js App Router
- React
- TypeScript
- Supabase Auth + Postgres
- Vercel-ready deployment target

## Local development

1. Pastikan file `.env.local` sudah ada.
2. Install dependency:

```bash
npm install
```

3. Jalankan local dev server:

```bash
npm run dev
```

4. Buka:

```text
http://127.0.0.1:3000
```

## Environment

File `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ocpjomvbjtlowvnmzglm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_zbODHZCExUR6gUffH-btWg_Zi2IWl56
```

## Demo login

- Email: `ops-demo@bhumidocs.app`
- Password: `BhumiDocs#2026`

Catatan:

- Jika signup masih kena rate limit Supabase, tunggu sebentar lalu coba lagi.
- Schema database ada di [supabase/schema.sql](C:/Users/shive/Documents/work/bhumi/supabase/schema.sql).

## Quality checks

```bash
npm run typecheck
npm run build
```

## Project structure

- [app/page.tsx](C:/Users/shive/Documents/work/bhumi/app/page.tsx): entry page
- [components/workspace.tsx](C:/Users/shive/Documents/work/bhumi/components/workspace.tsx): app client workspace
- [components/workspace.module.css](C:/Users/shive/Documents/work/bhumi/components/workspace.module.css): UI styles
- [lib/supabase.ts](C:/Users/shive/Documents/work/bhumi/lib/supabase.ts): Supabase browser client
- [lib/shipment-mappers.ts](C:/Users/shive/Documents/work/bhumi/lib/shipment-mappers.ts): DB mapping helpers
- [supabase/schema.sql](C:/Users/shive/Documents/work/bhumi/supabase/schema.sql): schema dan RLS policy

## Production notes

- Sudah siap untuk deploy ke Vercel.
- Gunakan env var yang sama di Vercel project settings.
- Untuk hardening tahap berikutnya, kita bisa tambah generated Supabase types, server-side auth helpers, audit log, dan template PDF/export formal.
