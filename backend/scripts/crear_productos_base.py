#!/usr/bin/env python3
"""
Crea los 15 productos base del catálogo textil (sin variantes).
Se usa antes de subir productos_textil.csv con el endpoint de carga masiva.

Uso:
    cd backend
    python scripts/crear_productos_base.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.models.producto import Producto

PRODUCTOS_BASE = [
    ("Playera Básica Cuello Redondo",          "100% algodón peinado 180g/m², corte regular fit",           "Playeras",   "Urban Basic"),
    ("Playera Polo Slim Fit",                  "Piqué 100% algodón, cuello tipo polo con 2 botones",         "Playeras",   "TrendWear"),
    ("Playera Oversize Lavada",                "Algodón 220g/m² con tratamiento de lavado enzimático",       "Playeras",   "Urban Basic"),
    ("Pantalón de Mezclilla Slim",             "Denim 12oz 98% algodón 2% elastano, corte slim",             "Pantalones", "DeportivoMX"),
    ("Pantalón Cargo Táctico",                 "Ripstop 65% poliéster 35% algodón, 8 bolsillos",             "Pantalones", "ComfortLine"),
    ("Pantalón Jogger Premium",                "Fleece 80% algodón 20% poliéster, puños elastizados",        "Pantalones", "SportFlex"),
    ("Short Deportivo 7 pulgadas",             "100% poliéster con malla interior, largo 7\"",               "Shorts",     "SportFlex"),
    ("Short de Mezclilla 5 pulgadas",          "Denim ligero 8oz, largo 5\", borde deshilachado",            "Shorts",     "TrendWear"),
    ("Sudadera con Capucha Fleece",            "Fleece 320g/m² 80/20 algodón-poliéster, capucha doble capa", "Sudaderas",  "ComfortLine"),
    ("Sudadera Crewneck Clásica",              "Terry 280g/m², cuello redondo ribeteado",                    "Sudaderas",  "Urban Basic"),
    ("Chamarra Bomber Satín",                  "Satín 100% poliéster, forro interior acolchado",             "Chamarras",  "TrendWear"),
    ("Chamarra Cortavientos Ligera",           "Nylon ripstop 100% poliéster, empacable",                    "Chamarras",  "SportFlex"),
    ("Calcetines Deportivos Acolchados Pack 3","75% algodón peinado 20% poliéster 5% elastano",              "Accesorios", "SportFlex"),
    ("Gorra Snapback Estructurada",            "6 paneles, visera plana, cierre snapback ajustable",         "Accesorios", "Urban Basic"),
    ("Gorra de Béisbol Dad Hat",               "Algodón lavado no estructurado, visera curva pre-curvada",   "Accesorios", "TrendWear"),
]


def crear_productos_base() -> None:
    db = SessionLocal()
    try:
        print("\n=== Creando productos base ===\n")
        for i, (nombre, desc, cat, marca) in enumerate(PRODUCTOS_BASE, start=1):
            existente = db.query(Producto).filter(Producto.nombre == nombre).first()
            if existente:
                print(f"  id={existente.id:>2}  (ya existía) {nombre}")
                continue

            producto = Producto(nombre=nombre, descripcion=desc, categoria=cat, marca=marca, activo=True)
            db.add(producto)
            db.flush()
            print(f"  id={producto.id:>2}  ✔ creado      {nombre}")

        db.commit()

        print("\n─── IDs actuales en la base de datos ───")
        for p in db.query(Producto).order_by(Producto.id).all():
            print(f"  {p.id:>2}  {p.nombre}")

        print(f"\nVerifica que los producto_id del CSV coincidan con los IDs mostrados.")
        print("Si difieren, ajusta la columna producto_id del archivo CSV antes de cargarlo.\n")

    except Exception as exc:
        db.rollback()
        print(f"\n✗ Error: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    crear_productos_base()
