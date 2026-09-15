import os

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
JWT_SECRET = os.environ.get("JWT_SECRET", "change-me")
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "analyst@vocis.ai")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "vocis2026")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "")
LLM_MODEL = os.environ.get("LLM_MODEL", "gpt-5.4")
