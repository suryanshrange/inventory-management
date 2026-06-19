"""Audit log helper (SQL)."""
from sqlalchemy.ext.asyncio import AsyncSession
from models_sql import AuditLog
from schemas import UserOut


async def log_audit(db: AsyncSession, user: UserOut, action: str, entity: str,
                    entity_id: str | None = None, details: str = ""):
    db.add(AuditLog(
        user_id=user.id, user_name=user.name,
        action=action, entity=entity, entity_id=entity_id, details=details,
    ))
    # Flush so it lands in same transaction without committing
    await db.flush()
