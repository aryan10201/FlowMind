from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool
from loguru import logger
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./genai.db")

# Configure engine with connection pooling and error handling
engine_kwargs = {
    "echo": False,  # Set to True for SQL debugging
    "pool_pre_ping": True,  # Verify connections before use
}

# For SQLite, use StaticPool to avoid connection issues
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs.update({
        "poolclass": StaticPool,
        "connect_args": {"check_same_thread": False}
    })

try:
    engine = create_engine(DATABASE_URL, **engine_kwargs)
    logger.info(f"Database engine created successfully: {DATABASE_URL}")
except Exception as e:
    logger.error(f"Failed to create database engine: {e}")
    raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db_health():
    """Check database health"""
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
