import os
from motor.motor_asyncio import AsyncIOMotorClient

_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = _client[os.environ["DB_NAME"]]


def get_db():
    return db


async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.datasets.create_index([("workspace_id", 1), ("created_at", -1)])
    await db.reports.create_index("dataset_id")
    await db.feedback.create_index([("dataset_id", 1)])
    await db.embedding_cache.create_index("text_hash", unique=True)
    await db.workspaces.create_index("owner_id")
