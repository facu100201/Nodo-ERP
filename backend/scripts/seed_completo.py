#!/usr/bin/env python3
"""
seed_completo.py
Siembra datos realistas en todos los módulos del ERP:
  - 6 usuarios extra (empleados con acceso al sistema)
  - 8 empleados con perfiles completos de RRHH
  - 4 períodos de nómina (Ene–Abr 2026) con detalles por empleado
  - 12 clientes (personas físicas y morales con RFC)
  - Configuración fiscal de la empresa
  - Folio SAT serie A
  - 60 ventas cerradas (Ene–Abr 2026) que alimentan KPIs y reportes
  - 5 cuentas por cobrar + 3 pagos parciales
  - 6 facturas en estado BORRADOR con conceptos e impuestos
  - 30 logs de acceso históricos

Uso:
    python scripts/seed_completo.py
    python scripts/seed_completo.py --limpiar
"""
import sys
import logging
import random
import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).parent.parent))
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

from passlib.context import CryptContext
from sqlalchemy import text
from app.core.database import SessionLocal
from app.models.usuario import Usuario
from app.models.empleado import Empleado, PeriodoNomina, DetalleNomina, LogAcceso
from app.models.cliente import Cliente, CuentaPorCobrar, PagoCuenta
from app.models.venta import Venta, VentaDetalle
from app.models.producto import VarianteProducto
from app.models.factura import (
    Factura, FacturaConcepto, FacturaConceptoImpuesto,
    ConfiguracionFiscal, FolioSAT, FacturaVenta,
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
TZ = timezone(timedelta(hours=-6))   # UTC-6 América/Mexico_City
RNG = random.Random(42)              # semilla fija para reproducibilidad


# ─── Helpers de fechas ────────────────────────────────────────────────────────

def _ts(year: int, month: int, day: int = 1, hour: int = 10, minute: int = 0) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=TZ)


def _rnd_dt(year: int, month: int) -> datetime:
    max_day = {1: 31, 2: 28, 3: 31, 4: 26}.get(month, 28)
    return _ts(year, month, RNG.randint(1, max_day),
               RNG.randint(8, 20), RNG.choice([0, 15, 30, 45]))


def _deduccion(salario: float) -> float:
    """IMSS empleado (6.25 %) + ISR simplificado."""
    imss = salario * 0.0625
    isr  = salario * (0.08 if salario <= 15_000 else 0.12 if salario <= 25_000 else 0.18)
    return round(imss + isr, 2)


def _precio(variante: VarianteProducto, cantidad: int) -> float:
    """Replica lógica del trigger fn_precio_automatico."""
    return float(variante.precio_mayoreo if cantidad >= 12 else variante.precio_menudeo)


# ─── Catálogos de datos ───────────────────────────────────────────────────────

EXTRA_USUARIOS = [
    {"nombre": "Luis Torres Morales",    "email": "ltorres@textilmx.com",  "rol_id": 2},
    {"nombre": "María López Castillo",   "email": "mlopez@textilmx.com",   "rol_id": 2},
    {"nombre": "Roberto Sánchez Vega",   "email": "rsanchez@textilmx.com", "rol_id": 3},
    {"nombre": "Diana Cruz Mendoza",     "email": "dcruz@textilmx.com",    "rol_id": 3},
    {"nombre": "Jorge Pérez Montoya",    "email": "jperez@textilmx.com",   "rol_id": 1},
    {"nombre": "Sofía Ramírez Jiménez",  "email": "sramirez@textilmx.com", "rol_id": 1},
]

# (email, perfil_empleado) — orden determina posición en nómina
EMPLEADOS_PERFIL = [
    ("admin@local.com",        {"departamento": "Administración",    "puesto": "Director General",        "salario": 42_000.00, "telefono": "+52 55 1234 5678", "direccion": "Av. Insurgentes Sur 1234, CDMX",   "fecha_ingreso": _ts(2022, 1, 15)}),
    ("cajero@local.com",       {"departamento": "Ventas",            "puesto": "Cajera Principal",        "salario": 15_000.00, "telefono": "+52 55 9876 5432", "direccion": "Calle Reforma 567, CDMX",          "fecha_ingreso": _ts(2022, 3, 1)}),
    ("ltorres@textilmx.com",   {"departamento": "Ventas",            "puesto": "Vendedor",                "salario": 13_500.00, "telefono": "+52 55 5555 0101", "direccion": "Col. Doctores 234, CDMX",          "fecha_ingreso": _ts(2022, 6, 1)}),
    ("mlopez@textilmx.com",    {"departamento": "Ventas",            "puesto": "Vendedora",               "salario": 13_500.00, "telefono": "+52 55 5555 0202", "direccion": "Col. Narvarte 890, CDMX",          "fecha_ingreso": _ts(2022, 9, 15)}),
    ("rsanchez@textilmx.com",  {"departamento": "Almacén",           "puesto": "Jefe de Almacén",         "salario": 18_000.00, "telefono": "+52 55 5555 0303", "direccion": "Col. Iztapalapa 123, CDMX",        "fecha_ingreso": _ts(2022, 2, 1)}),
    ("dcruz@textilmx.com",     {"departamento": "Almacén",           "puesto": "Auxiliar de Almacén",     "salario": 10_500.00, "telefono": "+52 55 5555 0404", "direccion": "Col. Tepito 456, CDMX",            "fecha_ingreso": _ts(2023, 1, 10)}),
    ("jperez@textilmx.com",    {"departamento": "Contabilidad",      "puesto": "Contador",                "salario": 22_000.00, "telefono": "+52 55 5555 0505", "direccion": "Col. Polanco 789, CDMX",           "fecha_ingreso": _ts(2022, 4, 1)}),
    ("sramirez@textilmx.com",  {"departamento": "Recursos Humanos",  "puesto": "Jefa de RRHH",            "salario": 20_000.00, "telefono": "+52 55 5555 0606", "direccion": "Col. Roma Sur 321, CDMX",          "fecha_ingreso": _ts(2022, 5, 1)}),
]

CLIENTES = [
    {"nombre": "Distribuidora Textil del Norte SA de CV",  "rfc": "DTN021205HK4", "telefono": "8112345678",  "email": "compras@dtn.mx",              "direccion": "Av. Constitución 100, Monterrey, NL",        "limite_credito": 50_000.00},
    {"nombre": "Ropa y Más SA de CV",                       "rfc": "RYM150320AB3", "telefono": "3398765432",  "email": "pedidos@ropaymas.mx",          "direccion": "Calzada González 200, Guadalajara, JAL",    "limite_credito": 35_000.00},
    {"nombre": "Boutique Elegance SA de CV",                "rfc": "BEL180715CD7", "telefono": "5555557890",  "email": "ventas@boutique-elegance.mx",  "direccion": "Av. Masaryk 150, CDMX",                    "limite_credito": 20_000.00},
    {"nombre": "Almacenes del Bajío SA de CV",              "rfc": "ABA120310EF9", "telefono": "4772345678",  "email": "compras@almacenesbajio.mx",    "direccion": "Blvd. López Mateos 345, León, GTO",         "limite_credito": 40_000.00},
    {"nombre": "Manuel Hernández López",                    "rfc": "HELM870412GH6","telefono": "5511112222",  "email": "manuel.hl@gmail.com",          "direccion": "Calle 5 de Mayo 67, CDMX",                 "limite_credito":  5_000.00},
    {"nombre": "Tiendas Fashion Plus SA de CV",             "rfc": "TFP200101IJ2", "telefono": "6563456789",  "email": "compras@fashionplus.mx",       "direccion": "Blvd. Independencia 890, Juárez, CHI",      "limite_credito": 30_000.00},
    {"nombre": "María Elena Rodríguez Vázquez",             "rfc": "ROVM790523KL8","telefono": "5533334444",  "email": "mary.rodriguez@hotmail.com",   "direccion": "Col. Del Valle 234, CDMX",                 "limite_credito":  3_000.00},
    {"nombre": "Importadora Textil Pacífico SA de CV",      "rfc": "ITP190808MN5", "telefono": "3221234567",  "email": "ventas@textilpacifico.mx",     "direccion": "Av. Juárez 456, Puerto Vallarta, JAL",     "limite_credito": 25_000.00},
    {"nombre": "Carlos Alberto Fuentes Díaz",               "rfc": "FUDC920317OP1","telefono": "5577778888",  "email": "carlos.fuentes@outlook.com",   "direccion": "Col. Satélite 567, Naucalpan, EDOMEX",     "limite_credito":  8_000.00},
    {"nombre": "Grupo Confecciones Unidas SA de CV",        "rfc": "GCU111215QR3", "telefono": "4435678901",  "email": "info@confeccionesunidas.mx",   "direccion": "Av. Madero 100, Morelia, MICH",            "limite_credito": 45_000.00},
    {"nombre": "Patricia Mendoza Gutiérrez",                "rfc": "MEGP850614ST4","telefono": "5599990000",  "email": "patricia.m@yahoo.com.mx",      "direccion": "Col. Portales 789, CDMX",                  "limite_credito":  6_000.00},
    {"nombre": "Ventas y Distribución Hernández SA de CV",  "rfc": "VDH170420UV0", "telefono": "9382345678",  "email": "pedidos@distrib-hdz.mx",       "direccion": "Calle Allende 234, Villahermosa, TAB",     "limite_credito": 28_000.00},
]

FISCAL = {
    "rfc_emisor":         "TEX210615HV7",
    "nombre_emisor":      "Textil MX Distribución SA de CV",
    "razon_social":       "TEXTIL MX DISTRIBUCION SA DE CV",
    "regimen_fiscal":     "601",
    "calle":              "Av. Insurgentes Sur",
    "numero_exterior":    "2453",
    "numero_interior":    "Piso 3",
    "colonia":            "San Ángel",
    "localidad":          "Ciudad de México",
    "municipio":          "Álvaro Obregón",
    "estado":             "CDMX",
    "pais":               "México",
    "codigo_postal":      "01000",
}

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) Firefox/123.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1",
]

IPS = ["192.168.1.10", "192.168.1.11", "192.168.1.12", "10.0.0.5", "10.0.0.8"]


# ─── Sección 1 : Usuarios ─────────────────────────────────────────────────────

def _seed_usuarios(db) -> dict:
    """
    Crea 6 usuarios adicionales usando SQL directo para evitar el error
    NoReferencedTableError en la tabla 'roles' (sin modelo ORM propio).
    Retorna {email: id}.
    """
    print("\n--- Usuarios adicionales ---")
    uid_map = {"admin@local.com": 1, "cajero@local.com": 2}
    for u in EXTRA_USUARIOS:
        row = db.execute(
            text("SELECT id FROM usuarios WHERE email = :email"),
            {"email": u["email"]},
        ).fetchone()
        if row:
            uid_map[u["email"]] = row[0]
            print(f"  skip: {u['email']}")
            continue
        hashed = pwd_context.hash("Temporal123!")
        result = db.execute(
            text("""
                INSERT INTO usuarios (nombre, email, password_hash, rol_id, activo)
                VALUES (:nombre, :email, :hash, :rol_id, true)
                RETURNING id
            """),
            {"nombre": u["nombre"], "email": u["email"],
             "hash": hashed, "rol_id": u["rol_id"]},
        )
        new_id = result.scalar()
        uid_map[u["email"]] = new_id
        print(f"  + {u['nombre']} ({u['email']}) id={new_id}")
    db.commit()
    return uid_map


# ─── Sección 2 : Empleados ────────────────────────────────────────────────────

def _seed_empleados(db, uid_map: dict) -> list:
    """Crea empleados vinculados a usuarios. Retorna [(emp_id, salario)]."""
    print("\n--- Empleados ---")
    result = []
    for email, perfil in EMPLEADOS_PERFIL:
        uid = uid_map[email]
        ex = db.query(Empleado).filter(Empleado.usuario_id == uid).first()
        if ex:
            result.append((ex.id, float(ex.salario_mensual)))
            print(f"  skip: empleado usuario_id={uid} ({perfil['puesto']})")
            continue
        emp = Empleado(
            usuario_id=uid,
            departamento=perfil["departamento"],
            puesto=perfil["puesto"],
            salario_mensual=perfil["salario"],
            fecha_ingreso=perfil["fecha_ingreso"],
            telefono=perfil["telefono"],
            direccion=perfil["direccion"],
            activo=True,
        )
        db.add(emp)
        db.flush()
        result.append((emp.id, perfil["salario"]))
        print(f"  + {perfil['puesto']} — ${perfil['salario']:,.0f}/mes (id={emp.id})")
    db.commit()
    return result


# ─── Sección 3 : Nóminas ─────────────────────────────────────────────────────

def _seed_nominas(db, emp_salary: list, admin_id: int):
    """Crea 4 períodos de nómina (3 cerrados + 1 borrador) con detalles."""
    print("\n--- Períodos de nómina ---")
    periodos = [
        ("Enero 2026",   _ts(2026, 1, 1),  _ts(2026, 1, 31),  "CERRADO"),
        ("Febrero 2026", _ts(2026, 2, 1),  _ts(2026, 2, 28),  "CERRADO"),
        ("Marzo 2026",   _ts(2026, 3, 1),  _ts(2026, 3, 31),  "CERRADO"),
        ("Abril 2026",   _ts(2026, 4, 1),  _ts(2026, 4, 30),  "BORRADOR"),
    ]
    for nombre, f_ini, f_fin, estado in periodos:
        if db.query(PeriodoNomina).filter(PeriodoNomina.nombre == nombre).first():
            print(f"  skip: {nombre}")
            continue
        total_bruto = sum(s for _, s in emp_salary)
        periodo = PeriodoNomina(
            nombre=nombre,
            fecha_inicio=f_ini,
            fecha_fin=f_fin,
            estado=estado,
            total_bruto=round(total_bruto, 2),
            total_empleados=len(emp_salary),
            creado_por=admin_id,
        )
        db.add(periodo)
        db.flush()
        for emp_id, salario in emp_salary:
            ded = _deduccion(salario)
            db.add(DetalleNomina(
                periodo_id=periodo.id,
                empleado_id=emp_id,
                salario_base=salario,
                deducciones=ded,
                salario_neto=round(salario - ded, 2),
                notas="Nómina mensual regular",
            ))
        db.flush()
        print(f"  + {nombre} ({estado}) — {len(emp_salary)} empleados, bruto ${total_bruto:,.2f}")
    db.commit()


# ─── Sección 4 : Clientes ────────────────────────────────────────────────────

def _seed_clientes(db) -> list:
    """Crea 12 clientes. Retorna lista de IDs."""
    print("\n--- Clientes ---")
    ids = []
    for c in CLIENTES:
        ex = db.query(Cliente).filter(Cliente.nombre == c["nombre"]).first()
        if ex:
            ids.append(ex.id)
            print(f"  skip: {c['nombre'][:40]}")
            continue
        cli = Cliente(
            nombre=c["nombre"],
            rfc=c["rfc"],
            telefono=c["telefono"],
            email=c["email"],
            direccion=c["direccion"],
            limite_credito=c["limite_credito"],
            activo=True,
        )
        db.add(cli)
        db.flush()
        ids.append(cli.id)
        print(f"  + {c['nombre'][:45]} (id={cli.id})")
    db.commit()
    return ids


# ─── Sección 5 : Configuración fiscal ────────────────────────────────────────

def _seed_config_fiscal(db) -> ConfiguracionFiscal:
    print("\n--- Configuración fiscal ---")
    ex = db.query(ConfiguracionFiscal).filter(
        ConfiguracionFiscal.rfc_emisor == FISCAL["rfc_emisor"]
    ).first()
    if ex:
        print(f"  skip: {FISCAL['rfc_emisor']}")
        return ex
    cfg = ConfiguracionFiscal(**FISCAL, activo=True)
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    print(f"  + {FISCAL['nombre_emisor']} RFC={FISCAL['rfc_emisor']}")
    return cfg


def _seed_folios_sat(db):
    print("\n--- Folios SAT ---")
    for serie in ["A", "B"]:
        ex = db.query(FolioSAT).filter(FolioSAT.serie == serie).first()
        if ex:
            print(f"  skip: serie {serie}")
            continue
        db.add(FolioSAT(serie=serie, folio_actual=0, activo=(serie == "A")))
        print(f"  + serie {serie}")
    db.commit()


# ─── Sección 6 : Ventas ───────────────────────────────────────────────────────

def _seed_ventas(db, cajero_ids: list) -> list:
    """
    Crea 60 ventas cerradas distribuidas en Ene–Abr 2026.
    Retorna lista de dicts con metadatos de cada venta para facturas / cobranza.
    """
    print("\n--- Ventas ---")

    # Cargar variantes activas con stock disponible
    variantes = (
        db.query(VarianteProducto)
        .filter(VarianteProducto.activo == True)
        .all()
    )
    if not variantes:
        print("  AVISO: no hay variantes activas, omitiendo ventas.")
        return []

    # Stock en memoria para evitar superar inventario disponible
    from app.models.inventario import Inventario as Inv
    stock_map: dict[int, int] = {}
    for v in variantes:
        inv = db.query(Inv).filter(Inv.variante_id == v.id).first()
        stock_map[v.id] = int(inv.stock) if inv else 0

    variantes_con_stock = [v for v in variantes if stock_map.get(v.id, 0) >= 1]

    # Distribución por mes (año, mes, num_ventas)
    distribucion = [
        (2026, 1, 12),
        (2026, 2, 18),
        (2026, 3, 22),
        (2026, 4,  8),
    ]
    metodos = ["EFECTIVO"] * 7 + ["TARJETA"] * 3  # 70/30

    ventas_meta = []  # retorno para facturas/cobranza

    for year, month, n_ventas in distribucion:
        mes_total = 0.0
        for _ in range(n_ventas):
            # Elegir cajero y método de pago
            uid = RNG.choice(cajero_ids)
            metodo = RNG.choice(metodos)
            fecha = _rnd_dt(year, month)

            # Armar 2-4 líneas de venta
            n_lineas = RNG.randint(2, 4)
            pool = [v for v in variantes_con_stock if stock_map.get(v.id, 0) >= 1]
            if not pool:
                break
            seleccion = RNG.sample(pool, min(n_lineas, len(pool)))

            lineas = []
            for variante in seleccion:
                max_qty = min(5, stock_map.get(variante.id, 1))
                if max_qty < 1:
                    continue
                qty = RNG.randint(1, max_qty)
                precio = _precio(variante, qty)
                subtotal_linea = round(qty * precio, 2)
                lineas.append((variante, qty, precio, subtotal_linea))
                stock_map[variante.id] = stock_map.get(variante.id, 0) - qty

            if not lineas:
                continue

            # Totales de la venta
            subtotal = round(sum(s for _, _, _, s in lineas), 2)
            impuesto  = round(subtotal * 0.16, 2)
            total     = round(subtotal + impuesto, 2)

            # SQL directo: Venta referencia puntos_venta (sin modelo ORM)
            res = db.execute(text("""
                INSERT INTO ventas
                    (punto_venta_id, usuario_id, subtotal, descuento,
                     impuesto, total, estado, metodo_pago, creada_en, completed_at)
                VALUES
                    (:pvid, :uid, :sub, 0, :imp, :tot,
                     'CERRADA', :metodo, :fecha, :fecha)
                RETURNING id
            """), {"pvid": 1, "uid": uid, "sub": subtotal,
                   "imp": impuesto, "tot": total,
                   "metodo": metodo, "fecha": fecha})
            venta_id = res.scalar()

            # VentaDetalle vía SQL directo (activa triggers de precio y stock)
            for variante, qty, precio, subtotal_linea in lineas:
                db.execute(text("""
                    INSERT INTO venta_detalle
                        (venta_id, variante_id, cantidad, precio_unitario, subtotal)
                    VALUES (:vid, :varid, :qty, :precio, :sub)
                """), {"vid": venta_id, "varid": variante.id,
                       "qty": qty, "precio": precio, "sub": subtotal_linea})

            mes_total += total
            ventas_meta.append({
                "id": venta_id,
                "total": total,
                "subtotal": subtotal,
                "metodo": metodo,
                "lineas": [(v.id, qty, precio, sub) for v, qty, precio, sub in lineas],
            })

        print(f"  {year}-{month:02d}: {n_ventas} ventas — ${mes_total:,.2f}")

    db.commit()
    print(f"  Total ventas creadas: {len(ventas_meta)}")
    return ventas_meta


# ─── Sección 7 : Cobranza (crédito + pagos) ──────────────────────────────────

def _seed_cobranza(db, ventas_meta: list, cliente_ids: list, admin_uid: int):
    """Convierte 5 ventas a crédito y registra pagos parciales en 3 de ellas."""
    print("\n--- Cuentas por cobrar ---")
    if not ventas_meta or not cliente_ids:
        print("  sin datos, omitiendo.")
        return

    # Usar las últimas 5 ventas (más recientes, más realistas)
    candidatas = ventas_meta[-5:]
    clientes_rotativos = (cliente_ids * 3)[:5]  # cicla si hay pocos

    for i, (venta_m, cliente_id) in enumerate(zip(candidatas, clientes_rotativos)):
        venta_id = venta_m["id"]
        if db.query(CuentaPorCobrar).filter(CuentaPorCobrar.venta_id == venta_id).first():
            print(f"  skip: venta_id={venta_id}")
            continue

        monto = venta_m["total"]
        vencimiento = _ts(2026, 5, 15 + i * 3)
        cuenta = CuentaPorCobrar(
            venta_id=venta_id,
            cliente_id=cliente_id,
            monto_total=monto,
            monto_pagado=0,
            saldo_pendiente=monto,
            fecha_vencimiento=vencimiento,
            estado="PENDIENTE",
        )
        db.add(cuenta)
        db.flush()
        print(f"  + cuenta venta_id={venta_id} cliente_id={cliente_id} ${monto:,.2f}")

        # Las primeras 3 cuentas reciben un pago parcial
        if i < 3:
            abono = round(monto * RNG.uniform(0.3, 0.6), 2)
            db.add(PagoCuenta(
                cuenta_id=cuenta.id,
                monto=abono,
                metodo_pago=RNG.choice(["EFECTIVO", "TRANSFERENCIA"]),
                referencia=f"REF-{cuenta.id:04d}-ABONO",
                notas="Pago parcial recibido",
                usuario_id=admin_uid,
            ))
            cuenta.monto_pagado = abono
            cuenta.saldo_pendiente = round(monto - abono, 2)
            cuenta.estado = "PENDIENTE"
            db.flush()
            print(f"    + abono ${abono:,.2f}")

    db.commit()


# ─── Sección 8 : Facturas (BORRADOR) ─────────────────────────────────────────

def _seed_facturas(db, ventas_meta: list, cfg: ConfiguracionFiscal, cliente_ids: list):
    """Crea 6 facturas en BORRADOR vinculadas a ventas cerradas."""
    print("\n--- Facturas (BORRADOR) ---")
    if not ventas_meta or not cliente_ids:
        print("  sin datos, omitiendo.")
        return
    if not cfg:
        print("  sin config fiscal, omitiendo.")
        return

    # Obtener folio A
    folio_obj = db.query(FolioSAT).filter(FolioSAT.serie == "A", FolioSAT.activo == True).first()
    folio_num = (folio_obj.folio_actual if folio_obj else 0)

    receptores = [
        {"rfc": CLIENTES[0]["rfc"], "nombre": CLIENTES[0]["nombre"], "regimen": "601", "uso": "G01"},
        {"rfc": CLIENTES[1]["rfc"], "nombre": CLIENTES[1]["nombre"], "regimen": "601", "uso": "G01"},
        {"rfc": CLIENTES[3]["rfc"], "nombre": CLIENTES[3]["nombre"], "regimen": "601", "uso": "G01"},
        {"rfc": CLIENTES[4]["rfc"], "nombre": CLIENTES[4]["nombre"], "regimen": "605", "uso": "G03"},
        {"rfc": CLIENTES[5]["rfc"], "nombre": CLIENTES[5]["nombre"], "regimen": "601", "uso": "G01"},
        {"rfc": "XAXX010101000", "nombre": "Público en General",    "regimen": "616", "uso": "S01"},
    ]

    # Primeras 6 ventas como base para las facturas
    candidatas = ventas_meta[:6]

    for i, venta_m in enumerate(candidatas):
        venta_id = venta_m["id"]
        if db.query(FacturaVenta).filter(FacturaVenta.venta_id == venta_id).first():
            print(f"  skip: factura para venta_id={venta_id}")
            continue

        receptor = receptores[i % len(receptores)]
        folio_num += 1
        subtotal   = venta_m["subtotal"]
        iva        = round(subtotal * 0.16, 2)
        total_fac  = round(subtotal + iva, 2)
        forma_pago = "01" if venta_m["metodo"] == "EFECTIVO" else "04"

        factura = Factura(
            fecha=_ts(2026, 1, 10 + i * 15),
            serie="A",
            folio=folio_num,
            estado="BORRADOR",
            rfc_emisor=cfg.rfc_emisor,
            nombre_emisor=cfg.nombre_emisor,
            regimen_fiscal_emisor=cfg.regimen_fiscal,
            lugar_expedicion=cfg.codigo_postal,
            rfc_receptor=receptor["rfc"],
            nombre_receptor=receptor["nombre"],
            regimen_fiscal_receptor=receptor["regimen"],
            uso_cfdi=receptor["uso"],
            tipo_comprobante="I",
            moneda="MXN",
            forma_pago=forma_pago,
            metodo_pago="PUE",
            subtotal=subtotal,
            descuento=0,
            total=total_fac,
            iva_trasladado=iva,
            observaciones="Generada por seed — pendiente de timbrar",
        )
        db.add(factura)
        db.flush()

        # Relación factura-venta
        db.add(FacturaVenta(factura_id=factura.id, venta_id=venta_id))

        # Conceptos (una línea por variante en la venta)
        for linea_num, (variante_id, qty, precio, subtotal_linea) in enumerate(venta_m["lineas"], start=1):
            variante = db.query(VarianteProducto).filter(VarianteProducto.id == variante_id).first()
            desc = f"{variante.color} talla {variante.talla}" if variante else "Producto textil"
            iva_linea = round(subtotal_linea * 0.16, 2)
            concepto = FacturaConcepto(
                factura_id=factura.id,
                clave_prod_serv="43231501",  # SAT: Ropa exterior para adulto
                no_identificacion=variante.sku if variante else f"VAR-{variante_id}",
                cantidad=qty,
                clave_unidad="H87",          # Pieza
                unidad="Pieza",
                descripcion=desc[:200],
                precio_unitario=precio,
                importe=subtotal_linea,
                descuento=0,
                objeto_impuesto="02",
                numero_linea=linea_num,
            )
            db.add(concepto)
            db.flush()
            db.add(FacturaConceptoImpuesto(
                concepto_id=concepto.id,
                tipo_movimiento="TRASLADO",
                base=subtotal_linea,
                impuesto="002",   # IVA
                tipo_factor="Tasa",
                tasa_o_cuota=0.160000,
                importe=iva_linea,
            ))

        db.flush()
        if folio_obj:
            folio_obj.folio_actual = folio_num
        print(f"  + Factura A-{folio_num:04d} venta_id={venta_id} RFC={receptor['rfc'][:15]} ${total_fac:,.2f}")

    db.commit()


# ─── Sección 9 : Logs de acceso ───────────────────────────────────────────────

def _seed_logs_acceso(db, uid_map: dict):
    """Crea ~30 entradas de LOGIN/LOGOUT históricas."""
    print("\n--- Logs de acceso ---")
    count = db.query(LogAcceso).count()
    if count >= 20:
        print(f"  skip: ya existen {count} logs")
        return

    uids = list(uid_map.values())
    for _ in range(30):
        uid = RNG.choice(uids)
        fecha = _rnd_dt(RNG.choice([2026, 2026]), RNG.randint(1, 4))
        db.add(LogAcceso(
            usuario_id=uid,
            accion="LOGIN",
            ip_address=RNG.choice(IPS),
            user_agent=RNG.choice(USER_AGENTS),
            detalles="Acceso desde ERP web",
            timestamp=fecha,
        ))
        db.add(LogAcceso(
            usuario_id=uid,
            accion="LOGOUT",
            ip_address=RNG.choice(IPS),
            user_agent=RNG.choice(USER_AGENTS),
            detalles=None,
            timestamp=fecha + timedelta(hours=RNG.randint(1, 8)),
        ))
    db.commit()
    print(f"  + 60 eventos de acceso (30 LOGIN + 30 LOGOUT)")


# ─── Limpieza ────────────────────────────────────────────────────────────────

def _limpiar(db):
    print("\n=== Limpiando datos de seed_completo ===")
    T = text
    tablas = [
        "logs_acceso", "pagos_cuenta", "cuentas_por_cobrar",
        "factura_concepto_impuestos", "factura_conceptos",
        "factura_ventas", "facturas", "folios_sat",
        "configuracion_fiscal", "detalles_nomina", "periodos_nomina",
        "empleados",
    ]
    # Eliminar usuarios extra (no los dos originales)
    db.execute(T("DELETE FROM usuarios WHERE email NOT IN ('admin@local.com','cajero@local.com')"))
    for tabla in tablas:
        db.execute(T(f"DELETE FROM {tabla}"))
    # Limpiar ventas (en cascada elimina venta_detalle y afecta movimientos)
    db.execute(T("DELETE FROM ventas"))
    db.execute(T("DELETE FROM clientes"))
    db.execute(T("DELETE FROM movimientos_inventario"))
    # Restaurar stock (seed_textil lo maneja)
    db.commit()
    print("  Tablas limpiadas.\n")


# ─── Main ─────────────────────────────────────────────────────────────────────

def seed(limpiar: bool = False):
    db = SessionLocal()
    try:
        if limpiar:
            _limpiar(db)

        # 1. Usuarios
        uid_map = _seed_usuarios(db)

        # 2. Empleados
        emp_salary = _seed_empleados(db, uid_map)

        # 3. Nóminas
        _seed_nominas(db, emp_salary, admin_id=uid_map["admin@local.com"])

        # 4. Clientes
        cliente_ids = _seed_clientes(db)

        # 5. Config fiscal + folios
        fiscal_cfg = _seed_config_fiscal(db)
        _seed_folios_sat(db)

        # 6. Ventas (requiere variantes de seed_textil)
        cajero_ids = [uid_map["cajero@local.com"],
                      uid_map["ltorres@textilmx.com"],
                      uid_map["mlopez@textilmx.com"]]
        ventas_meta = _seed_ventas(db, cajero_ids)

        # 7. Cobranza
        _seed_cobranza(db, ventas_meta, cliente_ids, uid_map["admin@local.com"])

        # 8. Facturas
        _seed_facturas(db, ventas_meta, fiscal_cfg, cliente_ids)

        # 9. Logs de acceso
        _seed_logs_acceso(db, uid_map)

        # Resumen
        print("\n" + "─" * 60)
        print("  SEED COMPLETO EXITOSO")
        print(f"  Usuarios totales    : {db.query(Usuario).count()}")
        print(f"  Empleados           : {db.query(Empleado).count()}")
        print(f"  Períodos nómina     : {db.query(PeriodoNomina).count()}")
        print(f"  Clientes            : {db.query(Cliente).count()}")
        print(f"  Ventas              : {db.query(Venta).count()}")
        print(f"  Cuentas por cobrar  : {db.query(CuentaPorCobrar).count()}")
        print(f"  Facturas            : {db.query(Factura).count()}")
        print(f"  Logs de acceso      : {db.query(LogAcceso).count()}")
        print("─" * 60 + "\n")

    except Exception as exc:
        db.rollback()
        print(f"\n✗ Error en seed_completo: {exc}")
        import traceback; traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed completo del ERP")
    parser.add_argument("--limpiar", action="store_true",
                        help="Elimina datos previos antes de sembrar")
    args = parser.parse_args()
    print("\n=== Seed Completo ERP ===\n")
    seed(limpiar=args.limpiar)
