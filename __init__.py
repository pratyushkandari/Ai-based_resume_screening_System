# backend/app/__init__.py

# -------------------------------------------------------------------
#  PURPOSE OF THIS FILE:
# -------------------------------------------------------------------
# This file tells Python that the folder `app/` is a **package**.
# Without it, you could NOT import modules like:
#     from app import models, db, main
#
# In short — `__init__.py` marks a directory as a valid importable package.
# -------------------------------------------------------------------

# -------------------------------------------------------------------
#  Why "Keep package init minimal"?
# -------------------------------------------------------------------
# When building medium-sized projects, it's a best practice to **keep
# this file simple** and avoid doing heavy imports or running logic here.
#
# Why? Because circular imports can occur easily.
# Example:
#   - If `models.py` imports something from `main.py`
#   - and `main.py` imports `models` via `__init__.py`
#   → Python gets stuck in a circular dependency loop.
#
# To prevent that, we only expose high-level modules that other parts
# of the project might want to import — without running any startup code.
# -------------------------------------------------------------------

# -------------------------------------------------------------------
#  __all__:
# -------------------------------------------------------------------
# The __all__ variable defines what gets imported when someone does:
#     from app import *
#
# It’s a list of module names (as strings) that this package exports.
#
# In this case, we explicitly make these submodules importable:
#   - models.py     → defines all SQLAlchemy ORM classes
#   - schemas.py    → defines Pydantic request/response models
#   - ml_utils.py   → helper functions for ML/NLP tasks
#   - db.py         → database engine & session setup
#   - main.py       → FastAPI application entrypoint
#
# This makes the structure clear and easy to navigate.
# -------------------------------------------------------------------

__all__ = ["models", "schemas", "ml_utils", "db", "main"]

# -------------------------------------------------------------------
#  In summary:
# -------------------------------------------------------------------
# - Marks `app/` as a Python package.
# - Lists which modules should be accessible when imported.
# - Keeps startup lightweight (no database connections or imports here).
#
# This file looks small, but it’s essential for keeping imports clean
# and preventing circular dependency problems in the FastAPI backend.
# -------------------------------------------------------------------
