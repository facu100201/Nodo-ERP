"""
Servicio para gestión de productos y variantes.
"""
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status, UploadFile
import csv
import io
from pathlib import Path

from openpyxl import load_workbook, Workbook
from openpyxl.styles import Font, PatternFill, Alignment

from app.models.producto import Producto, VarianteProducto
from app.models.inventario import Inventario
from app.repositories.producto_repository import ProductoRepository


# ── Constantes de validación ──────────────────────────────────────────────────
_EXTENSIONES_VALIDAS = frozenset({'.csv', '.xlsx', '.xls'})

_COLUMNAS_REQUERIDAS = frozenset({
    'producto_id', 'sku', 'talla', 'color',
    'precio_menudeo', 'precio_mayoreo', 'codigo_barras',
})

# Valores que se interpretan como True para la columna "activo"
_VALORES_VERDADERO = frozenset({'1', 'true', 't', 'si', 'sí', 'y', 'yes'})

# Cabecera oficial de la plantilla Excel
_CABECERA_PLANTILLA = [
    'producto_id', 'producto', 'sku', 'talla', 'color',
    'precio_menudeo', 'precio_mayoreo', 'codigo_barras', 'activo',
]


# ── DTOs internos ──────────────────────────────────────────────────────────────
class ProductoCreateRequest:
    """DTO para crear producto."""
    def __init__(self, nombre: str, descripcion: str = None,
                 categoria: str = None, marca: str = None):
        self.nombre = nombre
        self.descripcion = descripcion
        self.categoria = categoria
        self.marca = marca


class VarianteCreateRequest:
    """DTO para crear variante."""
    def __init__(self, producto_id: int, sku: str, codigo_barras: str,
                 talla: str = None, color: str = None,
                 precio_menudeo: float = 0.0, precio_mayoreo: float = 0.0,
                 stock_inicial: int = 0):
        self.producto_id = producto_id
        self.sku = sku
        self.codigo_barras = codigo_barras
        self.talla = talla
        self.color = color
        self.precio_menudeo = precio_menudeo
        self.precio_mayoreo = precio_mayoreo
        self.stock_inicial = stock_inicial


# ── Servicio ───────────────────────────────────────────────────────────────────
class ProductoService:
    """Servicio de gestión de productos y variantes."""

    def __init__(self, db: Session):
        self.db = db
        self.producto_repo = ProductoRepository(db)

    # ── Operaciones individuales ───────────────────────────────────────────────

    def crear_producto(self, producto_data: ProductoCreateRequest) -> Producto:
        """Crear un nuevo producto."""
        try:
            producto = Producto(
                nombre=producto_data.nombre,
                descripcion=producto_data.descripcion,
                categoria=producto_data.categoria,
                marca=producto_data.marca,
                activo=True,
            )
            self.db.add(producto)
            self.db.commit()
            self.db.refresh(producto)
            return producto
        except IntegrityError as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error al crear producto: {str(e)}",
            )

    def crear_variante(self, variante_data: VarianteCreateRequest) -> VarianteProducto:
        """
        Crear una nueva variante de producto.
        Si se proporciona stock_inicial > 0, crea también el registro de inventario.
        """
        try:
            producto = self.db.query(Producto).filter(
                Producto.id == variante_data.producto_id
            ).first()
            if not producto:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Producto {variante_data.producto_id} no encontrado",
                )

            variante = VarianteProducto(
                producto_id=variante_data.producto_id,
                sku=variante_data.sku,
                codigo_barras=variante_data.codigo_barras,
                talla=variante_data.talla,
                color=variante_data.color,
                precio_menudeo=variante_data.precio_menudeo,
                precio_mayoreo=variante_data.precio_mayoreo,
                activo=True,
            )
            self.db.add(variante)
            self.db.flush()

            if variante_data.stock_inicial > 0:
                self.db.add(Inventario(
                    variante_id=variante.id,
                    stock=variante_data.stock_inicial,
                ))

            self.db.commit()
            self.db.refresh(variante)
            return variante

        except IntegrityError as e:
            self.db.rollback()
            err = str(e).lower()
            if 'codigo_barras' in err:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Código de barras '{variante_data.codigo_barras}' ya existe",
                )
            if 'sku' in err:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"SKU '{variante_data.sku}' ya existe",
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error al crear variante: {str(e)}",
            )

    def actualizar_producto(self, producto_id: int, producto_data: dict) -> Producto:
        """Actualizar campos de un producto existente."""
        producto = self.db.query(Producto).filter(Producto.id == producto_id).first()
        if not producto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Producto {producto_id} no encontrado",
            )
        for key, value in producto_data.items():
            if hasattr(producto, key):
                setattr(producto, key, value)
        self.db.commit()
        self.db.refresh(producto)
        return producto

    def eliminar_producto(self, producto_id: int) -> bool:
        """Desactivar un producto y sus variantes (soft delete)."""
        producto = self.db.query(Producto).filter(Producto.id == producto_id).first()
        if not producto:
            return False
        producto.activo = False
        self.db.query(VarianteProducto).filter(
            VarianteProducto.producto_id == producto_id
        ).update({'activo': False})
        self.db.commit()
        return True

    # ── Carga masiva ───────────────────────────────────────────────────────────

    def carga_masiva_csv(self, file: UploadFile) -> dict:
        """
        Carga masiva de variantes desde un archivo CSV o Excel (.xlsx / .xls).

        Columnas requeridas (en cualquier orden):
            producto_id, sku, talla, color, precio_menudeo, precio_mayoreo, codigo_barras

        Columnas opcionales:
            producto  – nombre descriptivo (informativo, se ignora en la lógica)
            activo    – true/false/1/0/si/no  (default: true si se omite)

        Comportamiento:
            - Los errores por fila se acumulan sin detener el proceso.
            - Las filas válidas se guardan aunque otras fallen.
            - Se usa SAVEPOINT por cada fila para aislar errores de integridad.
            - producto_id debe corresponder a un producto existente.
            - SKU y código de barras deben ser únicos en la BD.
        """
        ext = Path(file.filename).suffix.lower()
        if ext not in _EXTENSIONES_VALIDAS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Formato '{ext}' no soportado. Use .csv, .xlsx o .xls",
            )

        try:
            contenido = file.file.read()

            if ext == '.csv':
                filas, error = self._leer_csv(contenido)
            else:
                filas, error = self._leer_excel(contenido)

            if error:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=error,
                )

            headers, rows = filas

            faltantes = _COLUMNAS_REQUERIDAS - set(headers)
            if faltantes:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Columnas faltantes en el archivo: {', '.join(sorted(faltantes))}",
                )

            variantes_creadas = 0
            errores = []

            for idx, row in enumerate(rows, start=2):
                creada, error_fila = self._procesar_fila(row, idx)
                if error_fila:
                    errores.append(error_fila)
                elif creada:
                    variantes_creadas += 1

            self.db.commit()

            return {
                'variantes_creadas': variantes_creadas,
                'errores': errores,
                'exitoso': len(errores) == 0,
            }

        except HTTPException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error inesperado procesando el archivo: {str(e)}",
            )
        finally:
            file.file.close()

    def _leer_csv(self, contenido: bytes) -> tuple:
        """
        Parsea el contenido de un CSV.
        Maneja UTF-8-BOM (que Excel genera al exportar a CSV) y fallback a latin-1.

        Returns:
            ((headers, rows), None)  en caso de éxito
            (None, mensaje_error)    en caso de fallo
        """
        try:
            try:
                texto = contenido.decode('utf-8-sig')   # elimina BOM de Excel
            except UnicodeDecodeError:
                texto = contenido.decode('latin-1')

            reader = csv.DictReader(io.StringIO(texto))
            if not reader.fieldnames:
                return None, "El archivo CSV está vacío o no tiene encabezado"

            headers = [h.strip().lower() for h in reader.fieldnames]
            rows = [
                {k.strip().lower(): (v.strip() if v else '') for k, v in row.items()}
                for row in reader
            ]
            return (headers, rows), None

        except Exception as e:
            return None, f"Error leyendo CSV: {str(e)}"

    def _leer_excel(self, contenido: bytes) -> tuple:
        """
        Parsea el contenido de un Excel (.xlsx / .xls).
        Usa data_only=True para leer valores calculados en lugar de fórmulas.
        Omite filas completamente vacías.

        Returns:
            ((headers, rows), None)  en caso de éxito
            (None, mensaje_error)    en caso de fallo
        """
        try:
            wb = load_workbook(io.BytesIO(contenido), data_only=True)
            ws = wb.active
            all_rows = list(ws.iter_rows(values_only=True))
            wb.close()

            if not all_rows:
                return None, "El archivo Excel está vacío"

            headers = [
                str(c).strip().lower() if c is not None else ''
                for c in all_rows[0]
            ]

            rows = []
            for fila in all_rows[1:]:
                # Omitir filas enteramente vacías
                if all(v is None or str(v).strip() == '' for v in fila):
                    continue
                row = {
                    headers[i]: (str(v).strip() if v is not None else '')
                    for i, v in enumerate(fila)
                    if i < len(headers)
                }
                rows.append(row)

            return (headers, rows), None

        except Exception as e:
            return None, f"Error leyendo Excel: {str(e)}"

    def _procesar_fila(self, row: dict, idx: int) -> tuple:
        """
        Valida y persiste una fila de la carga masiva.

        Usa begin_nested() (SAVEPOINT de PostgreSQL) para que un error de
        integridad en esta fila no descarte el trabajo realizado en las demás.

        Returns:
            (True, None)        – variante creada correctamente
            (False, error_dict) – fila rechazada con detalle del error
        """
        sku = row.get('sku', '').strip()

        # ── Validaciones de campo (sin acceder a la BD) ──────────────────────
        pid_raw = row.get('producto_id', '').strip()
        if not pid_raw:
            return False, {'linea': idx, 'sku': sku or 'N/A', 'error': 'producto_id vacío'}

        try:
            producto_id = int(float(pid_raw))
        except (ValueError, TypeError):
            return False, {
                'linea': idx, 'sku': sku or 'N/A',
                'error': f"producto_id inválido: '{pid_raw}'",
            }

        if not sku:
            return False, {'linea': idx, 'sku': 'N/A', 'error': 'sku vacío'}

        codigo_barras = row.get('codigo_barras', '').strip()
        if not codigo_barras:
            return False, {'linea': idx, 'sku': sku, 'error': 'codigo_barras vacío'}

        try:
            precio_menudeo = float(row.get('precio_menudeo', '') or 0)
            precio_mayoreo = float(row.get('precio_mayoreo', '') or 0)
        except (ValueError, TypeError) as e:
            return False, {'linea': idx, 'sku': sku, 'error': f"Precio inválido: {e}"}

        activo_raw = row.get('activo', '').strip().lower()
        activo = (activo_raw in _VALORES_VERDADERO) if activo_raw else True

        # ── Inserción con SAVEPOINT ──────────────────────────────────────────
        try:
            with self.db.begin_nested():
                producto = self.db.query(Producto).filter(
                    Producto.id == producto_id
                ).first()
                if not producto:
                    raise ValueError(f"Producto con id={producto_id} no existe")

                variante = VarianteProducto(
                    producto_id=producto_id,
                    sku=sku,
                    codigo_barras=codigo_barras,
                    talla=row.get('talla', '').strip() or None,
                    color=row.get('color', '').strip() or None,
                    precio_menudeo=precio_menudeo,
                    precio_mayoreo=precio_mayoreo,
                    activo=activo,
                )
                self.db.add(variante)
                self.db.flush()

            return True, None

        except IntegrityError as e:
            err_str = str(e).lower()
            if 'sku' in err_str:
                msg = f"SKU '{sku}' ya existe"
            elif 'codigo_barras' in err_str:
                msg = f"Código de barras '{codigo_barras}' ya existe"
            else:
                msg = f"Conflicto de integridad: {str(e)}"
            return False, {'linea': idx, 'sku': sku, 'error': msg}

        except ValueError as e:
            return False, {'linea': idx, 'sku': sku, 'error': str(e)}

    # ── Plantilla Excel ────────────────────────────────────────────────────────

    def generar_plantilla_excel(self) -> bytes:
        """
        Genera y devuelve en bytes una plantilla Excel lista para descargar.
        Incluye encabezados con estilo corporativo y una fila de ejemplo.
        """
        wb = Workbook()
        ws = wb.active
        ws.title = "Variantes"

        header_fill = PatternFill(start_color="2F4156", end_color="2F4156", fill_type="solid")
        header_font = Font(color="FFFFFF", bold=True)
        header_align = Alignment(horizontal='center', vertical='center')

        for col, nombre in enumerate(_CABECERA_PLANTILLA, start=1):
            cell = ws.cell(row=1, column=col, value=nombre)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = header_align

        # Fila de ejemplo
        ejemplo = [1, 'Playera Básica', 'PLY-M-NEG-001', 'M', 'Negro',
                   600.00, 500.00, '7501234567890', 'true']
        for col, val in enumerate(ejemplo, start=1):
            ws.cell(row=2, column=col, value=val)

        # Anchos de columna
        anchos = [12, 25, 20, 8, 12, 16, 16, 18, 8]
        for col_idx, ancho in enumerate(anchos, start=1):
            letra = ws.cell(row=1, column=col_idx).column_letter
            ws.column_dimensions[letra].width = ancho

        ws.row_dimensions[1].height = 22

        buf = io.BytesIO()
        wb.save(buf)
        return buf.getvalue()
