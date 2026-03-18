from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Any

import anthropic

from app.core.config import settings
from app.api.dependencies import get_current_active_user
from app.models.usuario import Usuario

router = APIRouter(prefix="/ai", tags=["IA"])

SYSTEM_PROMPT = """Eres el asistente inteligente integrado en un ERP empresarial llamado Nodo.
Tu rol es ayudar a los usuarios a navegar el sistema, interpretar datos del negocio y dar recomendaciones accionables.

Módulos disponibles en el ERP:
- Dashboard: KPIs y métricas generales (ventas del día, semana, mes; stock bajo; alertas)
- Punto de Venta (POS): Ventas en mostrador, búsqueda por código de barras
- Almacén: Control de inventario, movimientos de stock, niveles de existencias
- Reportes: Análisis detallados de ventas, almacén y movimientos, exportación a Excel
- Analítica: Dashboards interactivos con Metabase (ventas, inventario, general)
- Facturación: Facturas y documentos fiscales (integración SAT/CFDI)
- Cobranza: Cuentas por cobrar, clientes con crédito, registro de pagos
- Recursos Humanos (RRHH): Empleados, nóminas, control de acceso y ventas por sesión

Reglas:
- Responde SIEMPRE en español
- Sé conciso y directo (máximo 3-4 oraciones a menos que el usuario pida detalle)
- Si el usuario pregunta por datos específicos que no tienes, indícale en qué módulo encontrarlos
- Si recibes datos del contexto del ERP, úsalos para dar respuestas precisas y personalizadas
- No inventes datos; basa tus respuestas en la información proporcionada
"""


class ChatRequest(BaseModel):
    message: str
    context: Optional[dict[str, Any]] = None
    history: Optional[list[dict]] = None  # [{role: "user"|"assistant", content: "..."}]


class ChatResponse(BaseModel):
    response: str
    tokens_used: int


@router.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    current_user: Usuario = Depends(get_current_active_user),
):
    """
    Endpoint del asistente IA del ERP.
    Recibe un mensaje del usuario y contexto opcional del ERP,
    devuelve la respuesta de Claude.
    """
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="El asistente IA no está configurado. Verifica ANTHROPIC_API_KEY en el .env.",
        )

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        user_content = request.message
        if request.context:
            context_lines = "\n".join(
                f"- {k}: {v}" for k, v in request.context.items()
            )
            user_content = f"{request.message}\n\nDatos actuales del ERP:\n{context_lines}"

        messages = []
        if request.history:
            messages.extend(request.history)
        messages.append({"role": "user", "content": user_content})

        message = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=messages,
        )

        return ChatResponse(
            response=message.content[0].text,
            tokens_used=message.usage.input_tokens + message.usage.output_tokens,
        )

    except anthropic.AuthenticationError:
        raise HTTPException(status_code=503, detail="API Key de Anthropic inválida o expirada.")
    except anthropic.RateLimitError:
        raise HTTPException(
            status_code=429, detail="Límite de peticiones alcanzado. Intenta en un momento."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al contactar el asistente IA: {str(e)}"
        )
