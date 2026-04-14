"""
Run this script once to create all database tables:
    python -m backend.create_tables
"""
from backend.database import engine
from backend.models import Base

if __name__ == "__main__":
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Done — all tables created.")
