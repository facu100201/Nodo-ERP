from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Annotated

from app.core.database import get_db
from app.schemas.auth import Token, UsuarioResponse
from app.services.auth_service import AuthService
from app.services.rrhh_service import RRHHService
from app.api.dependencies import get_current_active_user
from app.models.usuario import Usuario

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=Token)
def login(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
):
    """
    Login de usuario.

    Retorna un token JWT para autenticación.

    Ejemplo:
    ```
    POST /api/v1/auth/login
    Content-Type: application/x-www-form-urlencoded

    username=admin&password=secreto123
    ```
    """
    auth_service = AuthService(db)
    token = auth_service.login(form_data.username, form_data.password)

    # Registrar log de acceso
    try:
        usuario = auth_service.get_current_user(form_data.username)
        if usuario:
            ip = request.client.host if request.client else None
            ua = request.headers.get("user-agent", "")[:255]
            rrhh_service = RRHHService(db)
            rrhh_service.registrar_log(
                usuario_id=usuario.id,
                accion="LOGIN",
                ip_address=ip,
                user_agent=ua,
            )
    except Exception:
        pass  # El log nunca debe bloquear el login

    return token


@router.get("/me", response_model=UsuarioResponse)
def get_me(
    current_user: Annotated[Usuario, Depends(get_current_active_user)]
):
    """
    Obtener información del usuario actual.
    
    Requiere autenticación con token JWT.
    """
    return current_user
