#!/usr/bin/env python3
"""
Seed: Catálogo Textil de Prueba
Crea 15 productos con ~222 variantes e inventario inicial.

Uso:
    cd backend
    python scripts/seed_textil.py

    # Para limpiar primero y re-sembrar:
    python scripts/seed_textil.py --limpiar
"""
import sys
import argparse
from pathlib import Path

# Fuerza UTF-8 en la consola de Windows para evitar UnicodeEncodeError
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Agrega el directorio backend al path para importar módulos del proyecto
sys.path.insert(0, str(Path(__file__).parent.parent))

# Silencia los logs SQL de SQLAlchemy para output limpio en Docker
import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

from sqlalchemy.exc import IntegrityError
from app.core.database import SessionLocal
from app.models.producto import Producto, VarianteProducto
from app.models.inventario import Inventario


# ── Catálogo textil ───────────────────────────────────────────────────────────

CATALOGO = [
    {
        "nombre": "Playera Básica Cuello Redondo",
        "descripcion": "100% algodón peinado 180g/m², corte regular fit, cuello ribeteado con tela reforzada",
        "categoria": "Playeras",
        "marca": "Urban Basic",
        "prefijo": "PLY-BAS",
        "precio_menudeo": 249.00,
        "precio_mayoreo": 185.00,
        "colores": [
            ("Negro",     "NEG"),
            ("Blanco",    "BLN"),
            ("Gris",      "GRS"),
            ("Azul Navy", "AZN"),
        ],
        "tallas": ["S", "M", "L", "XL", "XXL"],
        "stock": 50,
    },
    {
        "nombre": "Playera Polo Slim Fit",
        "descripcion": "Piqué 100% algodón, cuello tipo polo con 2 botones, corte slim entallado",
        "categoria": "Playeras",
        "marca": "TrendWear",
        "prefijo": "PLY-POL",
        "precio_menudeo": 349.00,
        "precio_mayoreo": 265.00,
        "colores": [
            ("Blanco",    "BLN"),
            ("Azul Navy", "AZN"),
            ("Negro",     "NEG"),
            ("Rojo",      "ROJ"),
        ],
        "tallas": ["S", "M", "L", "XL", "XXL"],
        "stock": 40,
    },
    {
        "nombre": "Playera Oversize Lavada",
        "descripcion": "Algodón 220g/m² con tratamiento de lavado enzimático, caída holgada, boxy cut",
        "categoria": "Playeras",
        "marca": "Urban Basic",
        "prefijo": "PLY-OVR",
        "precio_menudeo": 299.00,
        "precio_mayoreo": 225.00,
        "colores": [
            ("Gris",         "GRS"),
            ("Beige",        "BGE"),
            ("Negro",        "NEG"),
            ("Verde Olivo",  "VRO"),
        ],
        "tallas": ["S", "M", "L", "XL"],
        "stock": 35,
    },
    {
        "nombre": "Pantalón de Mezclilla Slim",
        "descripcion": "Denim 12oz 98% algodón 2% elastano, corte slim con ligero stretch, 5 bolsillos",
        "categoria": "Pantalones",
        "marca": "DeportivoMX",
        "prefijo": "PNT-MEZ",
        "precio_menudeo": 549.00,
        "precio_mayoreo": 420.00,
        "colores": [
            ("Azul Oscuro", "AZO"),
            ("Negro",       "NEG"),
            ("Gris Claro",  "GRC"),
        ],
        "tallas": ["28", "30", "32", "34", "36"],
        "stock": 30,
    },
    {
        "nombre": "Pantalón Cargo Táctico",
        "descripcion": "Ripstop 65% poliéster 35% algodón, 8 bolsillos funcionales, cintura ajustable con cordón",
        "categoria": "Pantalones",
        "marca": "ComfortLine",
        "prefijo": "PNT-CAR",
        "precio_menudeo": 499.00,
        "precio_mayoreo": 380.00,
        "colores": [
            ("Negro",       "NEG"),
            ("Verde Olivo", "VRO"),
            ("Beige",       "BGE"),
        ],
        "tallas": ["S", "M", "L", "XL", "XXL"],
        "stock": 25,
    },
    {
        "nombre": "Pantalón Jogger Premium",
        "descripcion": "Fleece 80% algodón 20% poliéster, puños elastizados, cintura con cordón plano",
        "categoria": "Pantalones",
        "marca": "SportFlex",
        "prefijo": "PNT-JOG",
        "precio_menudeo": 399.00,
        "precio_mayoreo": 300.00,
        "colores": [
            ("Negro",     "NEG"),
            ("Gris",      "GRS"),
            ("Azul Navy", "AZN"),
        ],
        "tallas": ["S", "M", "L", "XL", "XXL"],
        "stock": 40,
    },
    {
        "nombre": "Short Deportivo 7 pulgadas",
        "descripcion": "100% poliéster con malla interior, largo 7\", cintura elástica con cordón, bolsillos laterales",
        "categoria": "Shorts",
        "marca": "SportFlex",
        "prefijo": "SHT-DEP",
        "precio_menudeo": 279.00,
        "precio_mayoreo": 210.00,
        "colores": [
            ("Negro",     "NEG"),
            ("Azul Navy", "AZN"),
            ("Gris",      "GRS"),
            ("Rojo",      "ROJ"),
        ],
        "tallas": ["S", "M", "L", "XL", "XXL"],
        "stock": 45,
    },
    {
        "nombre": "Short de Mezclilla 5 pulgadas",
        "descripcion": "Denim ligero 8oz, largo 5\", borde deshilachado, 4 bolsillos, cierre metálico",
        "categoria": "Shorts",
        "marca": "TrendWear",
        "prefijo": "SHT-MEZ",
        "precio_menudeo": 349.00,
        "precio_mayoreo": 265.00,
        "colores": [
            ("Azul Claro",  "AZC"),
            ("Negro",       "NEG"),
            ("Blanco Roto", "BLR"),
        ],
        "tallas": ["28", "30", "32", "34"],
        "stock": 20,
    },
    {
        "nombre": "Sudadera con Capucha Fleece",
        "descripcion": "Fleece 320g/m² 80/20 algodón-poliéster, capucha doble capa, bolsillo canguro",
        "categoria": "Sudaderas",
        "marca": "ComfortLine",
        "prefijo": "SUD-CAP",
        "precio_menudeo": 649.00,
        "precio_mayoreo": 490.00,
        "colores": [
            ("Negro",       "NEG"),
            ("Gris",        "GRS"),
            ("Azul Navy",   "AZN"),
            ("Verde Olivo", "VRO"),
        ],
        "tallas": ["S", "M", "L", "XL", "XXL"],
        "stock": 30,
    },
    {
        "nombre": "Sudadera Crewneck Clásica",
        "descripcion": "Terry 280g/m², cuello redondo ribeteado, puños y basta elásticos de 2x2",
        "categoria": "Sudaderas",
        "marca": "Urban Basic",
        "prefijo": "SUD-CRW",
        "precio_menudeo": 549.00,
        "precio_mayoreo": 415.00,
        "colores": [
            ("Negro", "NEG"),
            ("Blanco", "BLN"),
            ("Gris",   "GRS"),
            ("Beige",  "BGE"),
        ],
        "tallas": ["S", "M", "L", "XL", "XXL"],
        "stock": 25,
    },
    {
        "nombre": "Chamarra Bomber Satín",
        "descripcion": "Satín 100% poliéster, forro interior acolchado, ribetes elásticos en puños y basta",
        "categoria": "Chamarras",
        "marca": "TrendWear",
        "prefijo": "CHA-BOM",
        "precio_menudeo": 899.00,
        "precio_mayoreo": 680.00,
        "colores": [
            ("Negro",       "NEG"),
            ("Verde Olivo", "VRO"),
            ("Azul Navy",   "AZN"),
        ],
        "tallas": ["S", "M", "L", "XL", "XXL"],
        "stock": 20,
    },
    {
        "nombre": "Chamarra Cortavientos Ligera",
        "descripcion": "Nylon ripstop 100% poliéster, empacable en su propio bolsillo, costuras selladas",
        "categoria": "Chamarras",
        "marca": "SportFlex",
        "prefijo": "CHA-COR",
        "precio_menudeo": 749.00,
        "precio_mayoreo": 565.00,
        "colores": [
            ("Negro",     "NEG"),
            ("Azul Navy", "AZN"),
            ("Rojo",      "ROJ"),
            ("Gris",      "GRS"),
        ],
        "tallas": ["S", "M", "L", "XL", "XXL"],
        "stock": 15,
    },
    {
        "nombre": "Calcetines Deportivos Acolchados Pack 3",
        "descripcion": "75% algodón peinado 20% poliéster 5% elastano, acolchado en talón y punta, tobillero",
        "categoria": "Accesorios",
        "marca": "SportFlex",
        "prefijo": "CAL-DEP",
        "precio_menudeo": 159.00,
        "precio_mayoreo": 120.00,
        "colores": [
            ("Blanco", "BLN"),
            ("Negro",  "NEG"),
            ("Gris",   "GRS"),
        ],
        "tallas": ["26-28", "29-31"],
        "stock": 60,
    },
    {
        "nombre": "Gorra Snapback Estructurada",
        "descripcion": "6 paneles, visera plana, cierre snapback plástico ajustable, bordado frontal 3D",
        "categoria": "Accesorios",
        "marca": "Urban Basic",
        "prefijo": "GOR-SNP",
        "precio_menudeo": 299.00,
        "precio_mayoreo": 225.00,
        "colores": [
            ("Negro",     "NEG"),
            ("Azul Navy", "AZN"),
            ("Rojo",      "ROJ"),
            ("Gris",      "GRS"),
        ],
        "tallas": ["Única"],
        "stock": 35,
    },
    {
        "nombre": "Gorra de Béisbol Dad Hat",
        "descripcion": "Algodón lavado no estructurado, visera curva pre-curvada, cierre metálico ajustable",
        "categoria": "Accesorios",
        "marca": "TrendWear",
        "prefijo": "GOR-DAD",
        "precio_menudeo": 249.00,
        "precio_mayoreo": 185.00,
        "colores": [
            ("Beige",       "BGE"),
            ("Negro",       "NEG"),
            ("Blanco",      "BLN"),
            ("Verde Olivo", "VRO"),
        ],
        "tallas": ["Única"],
        "stock": 40,
    },
]


# ── Generador de códigos de barras EAN-13 (formato Mexico 750) ─────────────────

def _ean13(n: int) -> str:
    """Genera un EAN-13 sintético con prefijo 750 (México) y dígito verificador."""
    base = f"750{n:09d}"
    total = sum(
        int(d) * (1 if i % 2 == 0 else 3)
        for i, d in enumerate(base)
    )
    check = (10 - (total % 10)) % 10
    return base + str(check)


# ── Lógica de seed ─────────────────────────────────────────────────────────────

def seed(limpiar: bool = False) -> None:
    db = SessionLocal()
    barcode_seq = 1

    try:
        if limpiar:
            print("⚠  Limpiando datos anteriores...")
            db.query(Inventario).delete()
            db.query(VarianteProducto).delete()
            db.query(Producto).delete()
            db.commit()
            print("   Tablas vaciadas.\n")

        total_productos = 0
        total_variantes = 0
        total_inventario = 0

        for item in CATALOGO:
            # ── Crear o recuperar producto ──────────────────────────────────
            existente = (
                db.query(Producto)
                .filter(Producto.nombre == item["nombre"])
                .first()
            )
            if existente:
                producto = existente
                print(f"  ↩  Producto ya existe: {item['nombre']}")
            else:
                producto = Producto(
                    nombre=item["nombre"],
                    descripcion=item["descripcion"],
                    categoria=item["categoria"],
                    marca=item["marca"],
                    activo=True,
                )
                db.add(producto)
                db.flush()
                total_productos += 1
                print(f"  ✔  Producto creado: {item['nombre']} (id={producto.id})")

            # ── Crear variantes ─────────────────────────────────────────────
            variantes_del_producto = 0
            for color_nombre, color_cod in item["colores"]:
                for talla in item["tallas"]:
                    talla_cod = talla.replace("-", "").replace(" ", "")
                    sku = f"{item['prefijo']}-{color_cod}-{talla_cod}"
                    barcode = _ean13(barcode_seq)
                    barcode_seq += 1

                    # Verificar si ya existe
                    if db.query(VarianteProducto).filter(VarianteProducto.sku == sku).first():
                        continue

                    try:
                        variante = VarianteProducto(
                            producto_id=producto.id,
                            sku=sku,
                            codigo_barras=barcode,
                            talla=talla,
                            color=color_nombre,
                            precio_menudeo=item["precio_menudeo"],
                            precio_mayoreo=item["precio_mayoreo"],
                            activo=True,
                        )
                        db.add(variante)
                        db.flush()

                        inv = Inventario(
                            variante_id=variante.id,
                            stock=item["stock"],
                        )
                        db.add(inv)
                        db.flush()

                        variantes_del_producto += 1
                        total_variantes += 1
                        total_inventario += 1

                    except IntegrityError:
                        db.rollback()
                        print(f"     ⚠  Conflicto en SKU {sku}, se omite")

            print(f"     → {variantes_del_producto} variantes · stock {item['stock']} c/u")

        db.commit()

        print("\n" + "─" * 55)
        print(f"  Productos creados  : {total_productos}")
        print(f"  Variantes creadas  : {total_variantes}")
        print(f"  Registros inventario: {total_inventario}")
        print("─" * 55)
        print("  Seed completado exitosamente.\n")

    except Exception as exc:
        db.rollback()
        print(f"\n✗ Error durante el seed: {exc}")
        raise
    finally:
        db.close()


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed del catálogo textil")
    parser.add_argument(
        "--limpiar",
        action="store_true",
        help="Elimina todos los productos/variantes/inventario antes de insertar",
    )
    args = parser.parse_args()

    print("\n=== Seed: Catálogo Textil ===\n")
    seed(limpiar=args.limpiar)
