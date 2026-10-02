from typing import Annotated, Optional

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .db import get_db
from .models import User
from .security import decode_token

bearer = HTTPBearer(auto_error=False)


def current_user(
    creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer)],
    db: Session = Depends(get_db),
) -> User:
    if not creds:
        raise HTTPException(401, "Authentification requise")
    try:
        user_id = int(decode_token(creds.credentials)["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(401, "Session expirée ou invalide")
    user = db.get(User, user_id)
    if not user or not user.active:
        raise HTTPException(401, "Compte introuvable ou désactivé")
    return user


def require_roles(*roles: str):
    """Contrôle d'accès par rôle (RBAC) : 403 si le rôle de l'utilisateur n'est pas autorisé."""
    def checker(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, "Accès refusé pour votre rôle")
        return user
    return checker
