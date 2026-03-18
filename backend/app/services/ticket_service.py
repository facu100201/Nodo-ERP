"""
Servicio para generación de tickets de venta.
"""
from typing import Optional
from datetime import datetime
import qrcode
import io
import base64

from app.models.venta import Venta
from app.models.producto import VarianteProducto


class TicketService:
    """Servicio para generar tickets de venta."""
    
    @staticmethod
    def generar_qr_facturacion(venta_id: int, total: float) -> str:
        """
        Generar código QR para facturación.
        
        El QR contendrá la URL para que el cliente pueda facturar.
        
        Args:
            venta_id: ID de la venta
            total: Total de la venta
            
        Returns:
            QR code como string base64
        """
        # URL de facturación (ajustar según dominio real)
        facturacion_url = f"https://erp.nodo.mx/facturar?venta={venta_id}&total={total}"
        
        # Generar QR
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(facturacion_url)
        qr.make(fit=True)
        
        # Convertir a imagen
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convertir a base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        return qr_base64
    
    @staticmethod
    def generar_ticket_html(venta: Venta, incluir_qr: bool = True) -> str:
        """
        Generar ticket de venta en formato HTML.
        
        Args:
            venta: Objeto Venta con detalles cargados
            incluir_qr: Si incluir QR de facturación
            
        Returns:
            HTML del ticket
        """
        # Generar QR si es necesario
        qr_html = ""
        if incluir_qr:
            qr_base64 = TicketService.generar_qr_facturacion(venta.id, float(venta.total))
            qr_html = f'<img src="data:image/png;base64,{qr_base64}" alt="QR Facturación" style="width:150px;height:150px;">'
        
        # Construir líneas de detalle
        detalles_html = ""
        for detalle in venta.detalles:
            # Obtener info de variante
            variante = detalle.variante if hasattr(detalle, 'variante') else None
            nombre_producto = variante.producto.nombre if variante else "Producto"
            info_variante = ""
            if variante:
                if variante.talla:
                    info_variante += f" Talla: {variante.talla}"
                if variante.color:
                    info_variante += f" Color: {variante.color}"
            
            detalles_html += f"""
            <tr>
                <td>{nombre_producto}{info_variante}</td>
                <td style="text-align:center;">{detalle.cantidad}</td>
                <td style="text-align:right;">${detalle.precio_unitario:.2f}</td>
                <td style="text-align:right;">${detalle.subtotal:.2f}</td>
            </tr>
            """
        
        # Fecha formateada
        fecha_str = venta.creada_en.strftime("%d/%m/%Y %H:%M:%S")
        
        # HTML del ticket
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Ticket #{venta.id}</title>
    <style>
        body {{
            font-family: 'Courier New', monospace;
            max-width: 300px;
            margin: 0 auto;
            padding: 10px;
        }}
        .header {{
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
        }}
        .empresa {{
            font-weight: bold;
            font-size: 18px;
        }}
        .info {{
            font-size: 12px;
            margin: 5px 0;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }}
        th {{
            border-bottom: 1px solid #000;
            padding: 5px 0;
            text-align: left;
        }}
        td {{
            padding: 3px 0;
        }}
        .totales {{
            border-top: 2px dashed #000;
            margin-top: 10px;
            padding-top: 10px;
        }}
        .total {{
            font-weight: bold;
            font-size: 14px;
        }}
        .qr-section {{
            text-align: center;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 2px dashed #000;
        }}
        .footer {{
            text-align: center;
            margin-top: 15px;
            font-size: 11px;
        }}
        @media print {{
            body {{
                width: 80mm;
            }}
        }}
    </style>
</head>
<body>
    <div class="header">
        <div class="empresa">Nodo</div>
        <div class="info">Sistema ERP/POS</div>
        <div class="info">RFC: XAXX010101000</div>
    </div>
    
    <div class="info">
        <strong>Ticket:</strong> #{venta.id}<br>
        <strong>Fecha:</strong> {fecha_str}<br>
        <strong>Método Pago:</strong> {venta.metodo_pago}<br>
        <strong>Punto Venta:</strong> {venta.punto_venta_id}
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Producto</th>
                <th style="text-align:center;">Cant</th>
                <th style="text-align:right;">Precio</th>
                <th style="text-align:right;">Total</th>
            </tr>
        </thead>
        <tbody>
            {detalles_html}
        </tbody>
    </table>
    
    <div class="totales">
        <div class="info">
            Subtotal: <span style="float:right;">${venta.subtotal:.2f}</span><br>
            Descuento: <span style="float:right;">${venta.descuento:.2f}</span><br>
            Impuesto: <span style="float:right;">${venta.impuesto:.2f}</span><br>
        </div>
        <div class="total">
            TOTAL: <span style="float:right;">${venta.total:.2f}</span>
        </div>
    </div>
    
    {f'<div class="qr-section"><div class="info">Escanea para facturar:</div>{qr_html}</div>' if incluir_qr else ''}
    
    <div class="footer">
        ¡Gracias por su compra!<br>
        Conserve su ticket
    </div>
</body>
</html>
"""
        return html
    
    @staticmethod
    def generar_ticket_texto(venta: Venta) -> str:
        """
        Generar ticket de venta en formato texto plano (para impresoras térmicas).
        
        Args:
            venta: Objeto Venta con detalles cargados
            
        Returns:
            Texto del ticket
        """
        lines = []
        lines.append("=" * 40)
        lines.append("          Nodo - Sistema POS")
        lines.append("          RFC: XAXX010101000")
        lines.append("=" * 40)
        lines.append("")
        lines.append(f"Ticket: #{venta.id}")
        lines.append(f"Fecha: {venta.creada_en.strftime('%d/%m/%Y %H:%M:%S')}")
        lines.append(f"Método Pago: {venta.metodo_pago}")
        lines.append(f"Punto Venta: {venta.punto_venta_id}")
        lines.append("-" * 40)
        lines.append("")
        
        # Detalles
        lines.append(f"{'Producto':<20} {'Cant':>5} {'Precio':>7} {'Total':>7}")
        lines.append("-" * 40)
        
        for detalle in venta.detalles:
            variante = detalle.variante if hasattr(detalle, 'variante') else None
            nombre = variante.producto.nombre[:20] if variante else "Producto"
            lines.append(f"{nombre:<20} {detalle.cantidad:>5} ${detalle.precio_unitario:>6.2f} ${detalle.subtotal:>6.2f}")
        
        lines.append("")
        lines.append("-" * 40)
        lines.append(f"{'Subtotal:':<30} ${venta.subtotal:>8.2f}")
        lines.append(f"{'Descuento:':<30} ${venta.descuento:>8.2f}")
        lines.append(f"{'Impuesto:':<30} ${venta.impuesto:>8.2f}")
        lines.append("=" * 40)
        lines.append(f"{'TOTAL:':<30} ${venta.total:>8.2f}")
        lines.append("=" * 40)
        lines.append("")
        lines.append("     ¡Gracias por su compra!")
        lines.append("       Conserve su ticket")
        lines.append("")
        lines.append(f"     Facture en: erp.nodo.mx/facturar")
        lines.append(f"     Ticket: {venta.id}")
        lines.append("")
        
        return "\n".join(lines)
