"""One-time migration: 67math.db (SQLite) -> Supabase PostgreSQL.

Usage:
  export SUPABASE_DB_URL='postgresql://...'
  python migrate_sqlite_to_supabase.py ./67math.db

The script keeps primary keys so existing deck/card/review relationships remain intact.
It is safe to run after the Supabase schema has been created by core.py.
"""
import os, sqlite3, sys
from pathlib import Path
import psycopg

TABLES = [
    "users", "decks", "cards", "reviews", "exercise_attempts",
    "chat_messages", "auth_sessions", "usage_sessions"
]


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python migrate_sqlite_to_supabase.py path/to/67math.db")
    sqlite_path = Path(sys.argv[1])
    url = os.getenv("SUPABASE_DB_URL", "").strip()
    if not url:
        raise SystemExit("SUPABASE_DB_URL is required.")
    if not sqlite_path.exists():
        raise SystemExit(f"SQLite file not found: {sqlite_path}")

    src = sqlite3.connect(str(sqlite_path))
    src.row_factory = sqlite3.Row
    dst = psycopg.connect(url)
    try:
        # Import the project's schema without starting the web server.
        # core.py creates the same schema when SUPABASE_DB_URL is present.
        os.environ["SUPABASE_DB_URL"] = url
        sys.path.insert(0, str(Path(__file__).parent))
        import core
        core._init_supabase_db()

        with dst.cursor() as cur:
            for table in TABLES:
                rows = src.execute(f"SELECT * FROM {table}").fetchall()
                if not rows:
                    continue
                cols = [d[0] for d in src.execute(f"SELECT * FROM {table} LIMIT 0").description]
                quoted = ",".join('"'+c+'"' for c in cols)
                placeholders = ",".join(["%s"] * len(cols))
                sql = f"INSERT INTO {table} ({quoted}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"
                for row in rows:
                    cur.execute(sql, tuple(row[c] for c in cols))
                print(f"migrated {table}: {len(rows)} rows")

            # Move BIGSERIAL sequences past imported IDs.
            for table in ["users","decks","cards","reviews","exercise_attempts","chat_messages","usage_sessions"]:
                cur.execute(f"SELECT setval(pg_get_serial_sequence(%s,%s), COALESCE((SELECT MAX(id) FROM {table}),0)+1, false)", (table, "id"))
        dst.commit()
        print("Migration complete.")
    finally:
        src.close(); dst.close()

if __name__ == "__main__":
    main()
