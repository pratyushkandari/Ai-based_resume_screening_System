# backend/app/db.py

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker


load_dotenv()


SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://resume_user1:Resume123@localhost:5432/resume_db1"
)


engine = create_engine(SQLALCHEMY_DATABASE_URL)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


Base = declarative_base()


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


print(f"🔗 DB host: {_mask_url(SQLALCHEMY_DATABASE_URL)}")
