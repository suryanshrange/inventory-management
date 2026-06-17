"""Audit logging helper."""
from database import db
from models import AuditLog, User


async def log_audit(user: User, action: str, entity: str, entity_id: str | None = None, details: str = ""):
    log = AuditLog(
        user_id=user.id,
        user_name=user.name,
        action=action,
        entity=entity,
        entity_id=entity_id,
        details=details,
    )
    await db.audit_logs.insert_one(log.model_dump())
