# backend/app/db.py

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# ------------------------------------------------------------
# PURPOSE OF THIS FILE:
# ------------------------------------------------------------
# This file sets up the database connection for the project
# using SQLAlchemy (a popular ORM — Object Relational Mapper).
#
# - It connects Python code to your PostgreSQL database.
# - It defines a base class for your database models.
# - It creates a "session" that you’ll use to talk to the database.
#
# In short: this is the central setup for all database operations.
# ------------------------------------------------------------

# ------------------------------------------------------------
# 1️ Load environment variables from a .env file
# ------------------------------------------------------------
# This helps you avoid hardcoding passwords and URLs in your code.
# `python-dotenv` reads variables from a `.env` file (e.g. DATABASE_URL)
# and loads them into the system’s environment variables.
# ------------------------------------------------------------
load_dotenv()

# ------------------------------------------------------------
# 2️ Read the database connection string from the environment
# ------------------------------------------------------------
# Example format for PostgreSQL:
#   postgresql://username:password@hostname:port/database_name
#
# If no DATABASE_URL is found in the environment, we use a fallback
# (local PostgreSQL) so your project still runs in development mode.
# ------------------------------------------------------------
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://resume_user1:Resume123@localhost:5432/resume_db1"
)

# ------------------------------------------------------------
# 3️ Create a database engine (the actual connection to PostgreSQL)
# ------------------------------------------------------------
# `create_engine()` is SQLAlchemy’s main function for connecting
# to the database. You can think of it as the “gateway” to your DB.
#
# Once created, this engine object can:
#  - open connections,
#  - run SQL statements,
#  - be used by sessions to manage transactions.
# ------------------------------------------------------------
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# ------------------------------------------------------------
# 4️ Create a session factory (SessionLocal)
# ------------------------------------------------------------
# - Each time you interact with the database, you’ll create a new session
#   using this factory:  `db = SessionLocal()`
#
# - `autocommit=False` → You must call `db.commit()` manually
#   to save changes (gives more control).
#
# - `autoflush=False` → SQLAlchemy won’t automatically push changes
#   to the DB until you commit or query.
#
# - `bind=engine` → attaches this session factory to our engine above.
# ------------------------------------------------------------
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ------------------------------------------------------------
# 5️ Define a base class for your ORM models
# ------------------------------------------------------------
# All database table classes (models) in your project will inherit from this.
# Example:
#     class User(Base):
#         __tablename__ = "users"
#         id = Column(Integer, primary_key=True)
#
# SQLAlchemy uses this base class to keep track of all models so it
# can create the corresponding tables in the database.
# ------------------------------------------------------------
Base = declarative_base()

# ------------------------------------------------------------
# 6️ Helper function to safely print database connection info
# ------------------------------------------------------------
# `_mask_url()` hides your password when printing the DB connection string.
# It’s a simple security measure so logs don’t expose credentials.
# ------------------------------------------------------------
def _mask_url(url: str) -> str:
    try:
        # Try to separate the part before and after '@'
        if "@" in url:
            left, right = url.split("@", 1)
            if "//" in left:
                # Extract the user from the "username:password" part
                userinfo = left.split("//", 1)[1]
                user = userinfo.split(":")[0]
                # Return username + masked password
                return f"{user}:****@{right}"
        return "redacted"
    except Exception:
        # In case of any parsing error, don’t print sensitive info
        return "redacted"

# ------------------------------------------------------------
# 7️ Print (log) a masked DB connection confirmation
# ------------------------------------------------------------
# This shows up in your console when the backend starts,
# letting you know which DB the app is connected to — without
# revealing your password.
#
# Example output:
#   🔗 DB host: resume_user1:****@localhost:5432/resume_db1
# ------------------------------------------------------------
print(f"🔗 DB host: {_mask_url(SQLALCHEMY_DATABASE_URL)}")
