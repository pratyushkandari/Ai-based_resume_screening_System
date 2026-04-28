from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str):
    # ✅ Keep bcrypt safe length limit
    return pwd_context.hash(password[:72])


def verify_password(password: str, hashed: str):
    """
    ✅ Safe verification:
    - Works with hashed passwords (correct case)
    - Also supports old plain-text passwords (temporary fallback)
    - Prevents crashes if hash is invalid/corrupted
    """

    if not hashed:
        return False

    try:
        # ✅ Normal case (hashed password)
        return pwd_context.verify(password[:72], hashed)

    except Exception:
        # ⚠️ Fallback for old/plain passwords (migration safety)
        return password == hashed
