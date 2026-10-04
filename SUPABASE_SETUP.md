# 67Math → Supabase

## 1. Create the database

Create a Supabase project, then copy the **Postgres connection string** from:
`Supabase Dashboard → Connect → Session pooler` (or the recommended server-side Postgres connection).

Do **not** put a Supabase `service_role` key or database password in frontend JavaScript or GitHub.

## 2. Render environment variable

Add this to Render → Environment:

`SUPABASE_DB_URL=postgresql://...`

The application automatically uses Supabase when `SUPABASE_DB_URL` is present. If it is absent, local development falls back to SQLite.

## 3. Deploy

Keep the existing Render commands:

`pip install -r requirements.txt`

`uvicorn app:app --host 0.0.0.0 --port $PORT`

No frontend change is required.

## 4. Existing SQLite data

If you already have `67math.db`, run the one-time migration locally:

```bash
export SUPABASE_DB_URL='postgresql://...'
python migrate_sqlite_to_supabase.py ./67math.db
```

The migration keeps the existing IDs and relationships between users, decks, cards, reviews, exercises, chat history, sessions, and online-time records.

## 5. After migration

Once you verify the Supabase data, do not commit `67math.db` to GitHub. Render will use Supabase directly and the local SQLite file is no longer needed in production.
