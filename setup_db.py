"""
Creates the sarkari_jobs PostgreSQL database and all tables.
Run this once before starting the server:
    python setup_db.py
"""
import os
import re
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Parse DATABASE_URL from backend/.env
_env_path = os.path.join(os.path.dirname(__file__), "backend", ".env")
_db_url = ""
if os.path.exists(_env_path):
    for line in open(_env_path):
        if line.startswith("DATABASE_URL="):
            _db_url = line.strip().split("=", 1)[1]
            break

# postgresql://user:pass@host:port/dbname
_match = re.match(r"postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)", _db_url)
if _match:
    DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME = (
        _match.group(1), _match.group(2), _match.group(3),
        int(_match.group(4)), _match.group(5),
    )
else:
    print(f"Could not parse DATABASE_URL from {_env_path}")
    print("Expected format: postgresql://user:pass@host:port/dbname")
    sys.exit(1)


def create_database():
    try:
        conn = psycopg2.connect(
            user=DB_USER, password=DB_PASS, host=DB_HOST, port=DB_PORT, dbname="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
        if cur.fetchone():
            print(f"Database '{DB_NAME}' already exists.")
        else:
            cur.execute(f'CREATE DATABASE "{DB_NAME}"')
            print(f"Database '{DB_NAME}' created.")
        cur.close()
        conn.close()
    except psycopg2.OperationalError as e:
        print(f"Could not connect to PostgreSQL: {e}")
        print(f"\nUsing credentials from {_env_path}")
        print("Make sure PostgreSQL is running and the credentials are correct.")
        sys.exit(1)


def create_tables():
    root = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, root)
    os.chdir(os.path.join(root, "backend"))

    from backend.database import engine
    from backend.models import Base

    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("All tables created.")


if __name__ == "__main__":
    print(f"Connecting as {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
    create_database()
    create_tables()
    print("\nSetup complete. Start the server with:")
    print("  cd backend && uvicorn main:app --reload --port 8000")
