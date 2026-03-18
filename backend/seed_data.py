"""
Script de datos de prueba para el ERP Nodo.

Inserta datos realistas en todas las tablas para que el Dashboard
muestre KPIs con valores significativos.

Uso (desde la carpeta backend/):
    python seed_data.py

El script es idempotente: verifica si ya existen datos antes de insertar.
"""

import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal
import random

# Asegurar que el path incluya el proyecto
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.core.database import SessionLocal, engine
from app.core.security import get_password_hash
from app.models.producto import Producto, VarianteProducto
from app.models.inventario import Inventario
from app.models.venta import Venta, VentaDetalle
from app.models.cliente import Cliente, CuentaPorCobrar
from app.models.empleado import Empleado, PeriodoNomina, DetalleNomina


# ── Configuración de fechas base ────────────────────────────────────────────
NOW = datetime.now()
MES_ACTUAL = NOW.month
ANIO_ACTUAL = NOW.year


def mes_offset(meses_atras: int) -> datetime:
    """Devuelve una fecha aproximada N meses antes de hoy."""
    m = MES_ACTUAL - meses_atras
    a = ANIO_ACTUAL
    while m <= 0:
        m += 12
        a -= 1
    day = min(NOW.day, 28)
    return datetime(a, m, day, 10, 0, 0)


# ── Datos de productos de ropa ───────────────────────────────────────────────
PRODUCTOS_DATA = [
    {"nombre": "Playera Básica", "categoria": "Camisetas", "marca": "Nodo"},
    {"nombre": "Polo Sport", "categoria": "Camisetas", "marca": "Nodo"},
    {"nombre": "Pantalón Slim", "categoria": "Pantalones", "marca": "Nodo"},
    {"nombre": "Pantalón Cargo", "categoria": "Pantalones", "marca": "Nodo"},
    {"nombre": "Short Deportivo", "categoria": "Shorts", "marca": "Nodo"},
    {"nombre": "Sudadera Clásica", "categoria": "Sudaderas", "marca": "Nodo"},
    {"nombre": "Chamarra Bomber", "categoria": "Chamarras", "marca": "Nodo"},
    {"nombre": "Vestido Casual", "categoria": "Vestidos", "marca": "Nodo"},
    {"nombre": "Falda Midi", "categoria": "Faldas", "marca": "Nodo"},
    {"nombre": "Blusa Floral", "categoria": "Blusas", "marca": "Nodo"},
    {"nombre": "Jeans Skinny", "categoria": "Pantalones", "marca": "Nodo"},
    {"nombre": "Leggings Sport", "categoria": "Deportivo", "marca": "Nodo"},
    {"nombre": "Top Deportivo", "categoria": "Deportivo", "marca": "Nodo"},
    {"nombre": "Hoodie Oversized", "categoria": "Sudaderas", "marca": "Nodo"},
    {"nombre": "Camiseta Estampada", "categoria": "Camisetas", "marca": "Nodo"},
]

TALLAS = ["S", "M", "L"]
COLORES_PRENDA = ["Negro", "Blanco", "Azul marino", "Gris", "Rojo"]

NOMBRES_CLIENTES = [
    "María López García", "Juan Hernández Martínez", "Ana González Pérez",
    "Carlos Ramírez Torres", "Laura Sánchez Flores", "Miguel Ángel Reyes Cruz",
    "Sofía Morales Jiménez", "Diego Ortiz Vargas", "Valentina Castro Mendoza",
    "Roberto Ruiz Medina", "Gabriela Guerrero Salinas", "Alejandro Núñez Castillo",
    "Fernanda Domínguez Vega", "Luis Alvarado Herrera", "Paola Ríos Pacheco",
    "Eduardo Guzmán Serrano", "Carmen Fuentes Aguilar", "Javier Peña Espinoza",
    "Adriana Maldonado Luna", "Ricardo Cabrera Sandoval",
]

NOMBRES_EMPLEADOS = [
    ("Ana Sofía Vega", "ana.vega@nodo.mx", "Ventas", "Cajera"),
    ("Marco Aurelio Reyes", "m.reyes@nodo.mx", "Ventas", "Cajero"),
    ("Claudia Ximena Torres", "c.torres@nodo.mx", "Almacén", "Encargada de Almacén"),
    ("Héctor Manuel Ruiz", "h.ruiz@nodo.mx", "Ventas", "Vendedor"),
    ("Daniela Flores Ortiz", "d.flores@nodo.mx", "Administración", "Contadora"),
    ("Ernesto Salinas Mora", "e.salinas@nodo.mx", "Ventas", "Cajero"),
    ("Patricia Gutiérrez Cano", "p.gutierrez@nodo.mx", "RRHH", "Coordinadora RRHH"),
]


def seed():
    db = SessionLocal()
    try:
        print("🌱 Iniciando seed de datos de prueba...\n")

        # ── 1. ROLES (tabla sin modelo SQLAlchemy) ───────────────────────────
        print("📋 Verificando roles...")
        result = db.execute(text("SELECT COUNT(*) FROM roles")).scalar()
        if result == 0:
            db.execute(text("""
                INSERT INTO roles (id, nombre) VALUES
                (1, 'ADMIN'),
                (2, 'CAJERO'),
                (3, 'ALMACEN')
                ON CONFLICT (id) DO NOTHING
            """))
            db.commit()
            print("   ✅ Roles insertados")
        else:
            print("   ⏭️  Roles ya existen")

        # ── 2. PUNTOS DE VENTA (tabla sin modelo SQLAlchemy) ─────────────────
        print("🏪 Verificando puntos de venta...")
        result = db.execute(text("SELECT COUNT(*) FROM puntos_venta")).scalar()
        if result == 0:
            db.execute(text("""
                INSERT INTO puntos_venta (id, nombre) VALUES
                (1, 'Sucursal Centro'),
                (2, 'Sucursal Norte')
                ON CONFLICT (id) DO NOTHING
            """))
            db.commit()
            print("   ✅ Puntos de venta insertados")
        else:
            print("   ⏭️  Puntos de venta ya existen")

        # ── 3. USUARIOS ──────────────────────────────────────────────────────
        print("👤 Verificando usuarios...")
        result = db.execute(text("SELECT COUNT(*) FROM usuarios")).scalar()
        if result == 0:
            # Admin
            admin_hash = get_password_hash("Admin123!")
            db.execute(text("""
                INSERT INTO usuarios (nombre, email, password_hash, rol_id, activo)
                VALUES (:nombre, :email, :hash, 1, TRUE)
            """), {"nombre": "Admin Nodo", "email": "admin@nodo.mx", "hash": admin_hash})
            db.commit()

            # Cajeros/empleados
            for nombre, email, _, _ in NOMBRES_EMPLEADOS:
                user_hash = get_password_hash("Cajero123!")
                rol = 2  # CAJERO
                db.execute(text("""
                    INSERT INTO usuarios (nombre, email, password_hash, rol_id, activo)
                    VALUES (:nombre, :email, :hash, :rol, TRUE)
                """), {"nombre": nombre, "email": email, "hash": user_hash, "rol": rol})
            db.commit()
            print("   ✅ Usuarios insertados (admin: Admin123! | cajeros: Cajero123!)")
        else:
            print("   ⏭️  Usuarios ya existen")

        # Obtener ID del admin y primer cajero
        admin_id = db.execute(text("SELECT id FROM usuarios WHERE rol_id = 1 LIMIT 1")).scalar()
        cajero_ids = [r[0] for r in db.execute(text("SELECT id FROM usuarios WHERE rol_id = 2 ORDER BY id")).fetchall()]
        if not cajero_ids:
            cajero_ids = [admin_id]

        # ── 4. PRODUCTOS Y VARIANTES ─────────────────────────────────────────
        print("👕 Verificando productos...")
        existing_products = db.query(Producto).count()
        if existing_products == 0:
            productos_orm = []
            for p_data in PRODUCTOS_DATA:
                prod = Producto(
                    nombre=p_data["nombre"],
                    categoria=p_data["categoria"],
                    marca=p_data["marca"],
                    activo=True,
                )
                db.add(prod)
                productos_orm.append(prod)
            db.flush()

            # Variantes por producto (3 tallas × colores alternados)
            sku_counter = 1000
            variantes_orm = []
            for prod in productos_orm:
                for talla in TALLAS:
                    color = random.choice(COLORES_PRENDA)
                    sku = f"YMY-{sku_counter:04d}"
                    barcode = f"750{sku_counter:010d}"
                    precio_menudeo = Decimal(str(random.choice([199, 249, 299, 349, 399, 499, 599, 699])))
                    precio_mayoreo = precio_menudeo * Decimal("0.65")
                    variante = VarianteProducto(
                        producto_id=prod.id,
                        sku=sku,
                        codigo_barras=barcode,
                        talla=talla,
                        color=color,
                        precio_menudeo=precio_menudeo,
                        precio_mayoreo=precio_mayoreo.quantize(Decimal("0.01")),
                        activo=True,
                    )
                    db.add(variante)
                    variantes_orm.append(variante)
                    sku_counter += 1
            db.commit()
            print(f"   ✅ {len(PRODUCTOS_DATA)} productos con {len(variantes_orm)} variantes insertados")
        else:
            print(f"   ⏭️  Productos ya existen ({existing_products})")

        # ── 5. INVENTARIO ────────────────────────────────────────────────────
        print("📦 Verificando inventario...")
        existing_inv = db.query(Inventario).count()
        if existing_inv == 0:
            variantes = db.query(VarianteProducto).all()
            for i, variante in enumerate(variantes):
                # Algunos con stock bajo (primeros 5 variantes), el resto normal
                if i < 5:
                    stock = random.randint(2, 8)   # stock bajo
                else:
                    stock = random.randint(40, 180)  # stock normal
                inv = Inventario(variante_id=variante.id, stock=stock)
                db.add(inv)
            db.commit()
            total_stock = db.query(Inventario).with_entities(
                db.query(Inventario).statement
            )
            print("   ✅ Inventario insertado (5 variantes con stock bajo ≤ 10)")
        else:
            print(f"   ⏭️  Inventario ya existe ({existing_inv} registros)")

        # ── 6. CLIENTES ──────────────────────────────────────────────────────
        print("👥 Verificando clientes...")
        existing_clientes = db.query(Cliente).count()
        if existing_clientes == 0:
            for i, nombre in enumerate(NOMBRES_CLIENTES):
                partes = nombre.split()
                inicial = partes[0][0].upper() if partes else "X"
                email = f"{partes[0].lower()}.{partes[-1].lower()}@example.com"
                # Primeros 3 clientes creados este mes
                if i < 3:
                    creado = NOW - timedelta(days=random.randint(1, 10))
                else:
                    creado = NOW - timedelta(days=random.randint(30, 365))
                cliente = Cliente(
                    nombre=nombre,
                    email=email,
                    telefono=f"55{random.randint(10000000, 99999999)}",
                    limite_credito=Decimal(str(random.choice([5000, 10000, 20000]))),
                    activo=True,
                    creado_en=creado,
                )
                db.add(cliente)
            db.commit()
            print(f"   ✅ {len(NOMBRES_CLIENTES)} clientes insertados (3 nuevos este mes)")
        else:
            print(f"   ⏭️  Clientes ya existen ({existing_clientes})")

        # ── 7. VENTAS (últimos 6 meses) ──────────────────────────────────────
        print("💰 Verificando ventas...")
        existing_ventas = db.query(Venta).count()
        if existing_ventas == 0:
            variantes = db.query(VarianteProducto).all()
            if not variantes:
                print("   ⚠️  No hay variantes, saltando ventas")
            else:
                # Ingresos objetivo por mes (últimos 6 meses)
                ingresos_objetivo = [88000, 102000, 115000, 98000, 110000, 124500]
                punto_venta_id = 1
                cajero_idx = 0

                for mes_offset_val, objetivo in enumerate(ingresos_objetivo):
                    # Mes correspondiente
                    m = MES_ACTUAL - (5 - mes_offset_val)
                    a = ANIO_ACTUAL
                    while m <= 0:
                        m += 12
                        a -= 1

                    acumulado = 0
                    intentos = 0

                    while acumulado < objetivo and intentos < 200:
                        intentos += 1
                        # Fecha aleatoria dentro del mes
                        dia = random.randint(1, 28)
                        fecha_venta = datetime(a, m, dia, random.randint(9, 20), random.randint(0, 59))

                        # Seleccionar variantes aleatorias para esta venta
                        n_items = random.randint(1, 4)
                        items_venta = random.sample(variantes, min(n_items, len(variantes)))

                        total_venta = Decimal("0")
                        detalles_data = []
                        for variante in items_venta:
                            cantidad = random.randint(1, 3)
                            precio = variante.precio_menudeo
                            subtotal_item = precio * cantidad
                            total_venta += subtotal_item
                            detalles_data.append({
                                "variante_id": variante.id,
                                "cantidad": cantidad,
                                "precio_unitario": precio,
                                "subtotal": subtotal_item,
                            })

                        metodo = random.choice(["EFECTIVO", "TARJETA"])
                        cajero_id = cajero_ids[cajero_idx % len(cajero_ids)]
                        cajero_idx += 1

                        venta = Venta(
                            punto_venta_id=punto_venta_id,
                            usuario_id=cajero_id,
                            subtotal=total_venta,
                            descuento=Decimal("0"),
                            impuesto=Decimal("0"),
                            total=total_venta,
                            estado="CERRADA",
                            metodo_pago=metodo,
                            creada_en=fecha_venta,
                            completed_at=fecha_venta + timedelta(minutes=5),
                        )
                        db.add(venta)
                        db.flush()

                        for det_data in detalles_data:
                            det = VentaDetalle(
                                venta_id=venta.id,
                                variante_id=det_data["variante_id"],
                                cantidad=det_data["cantidad"],
                                precio_unitario=det_data["precio_unitario"],
                                subtotal=det_data["subtotal"],
                            )
                            db.add(det)

                        acumulado += float(total_venta)

                # Agregar ventas ABIERTAS del mes actual (órdenes pendientes)
                for _ in range(12):
                    fecha_v = NOW - timedelta(hours=random.randint(1, 48))
                    n_items = random.randint(1, 3)
                    items_venta = random.sample(variantes, min(n_items, len(variantes)))
                    total_venta = Decimal("0")
                    detalles_data = []
                    for variante in items_venta:
                        cantidad = random.randint(1, 2)
                        precio = variante.precio_menudeo
                        subtotal_item = precio * cantidad
                        total_venta += subtotal_item
                        detalles_data.append({
                            "variante_id": variante.id,
                            "cantidad": cantidad,
                            "precio_unitario": precio,
                            "subtotal": subtotal_item,
                        })
                    cajero_id = cajero_ids[0]
                    venta_abierta = Venta(
                        punto_venta_id=1,
                        usuario_id=cajero_id,
                        subtotal=total_venta,
                        descuento=Decimal("0"),
                        impuesto=Decimal("0"),
                        total=total_venta,
                        estado="ABIERTA",
                        metodo_pago=random.choice(["EFECTIVO", "TARJETA"]),
                        creada_en=fecha_v,
                    )
                    db.add(venta_abierta)
                    db.flush()
                    for det_data in detalles_data:
                        det = VentaDetalle(
                            venta_id=venta_abierta.id,
                            variante_id=det_data["variante_id"],
                            cantidad=det_data["cantidad"],
                            precio_unitario=det_data["precio_unitario"],
                            subtotal=det_data["subtotal"],
                        )
                        db.add(det)

                db.commit()
                total_ventas = db.query(Venta).count()
                print(f"   ✅ {total_ventas} ventas insertadas (6 meses de histórico + 12 abiertas)")
        else:
            print(f"   ⏭️  Ventas ya existen ({existing_ventas})")

        # ── 8. CUENTAS POR COBRAR ────────────────────────────────────────────
        print("📄 Verificando cuentas por cobrar...")
        existing_cpc = db.query(CuentaPorCobrar).count()
        if existing_cpc == 0:
            clientes = db.query(Cliente).limit(5).all()
            ventas_cerradas = db.query(Venta).filter(Venta.estado == "CERRADA").limit(5).all()
            if clientes and ventas_cerradas:
                for i, (cliente, venta) in enumerate(zip(clientes, ventas_cerradas)):
                    monto = venta.total
                    pagado = monto * Decimal("0.3") if i > 2 else Decimal("0")
                    saldo = monto - pagado
                    cpc = CuentaPorCobrar(
                        venta_id=venta.id,
                        cliente_id=cliente.id,
                        monto_total=monto,
                        monto_pagado=pagado,
                        saldo_pendiente=saldo,
                        fecha_vencimiento=NOW + timedelta(days=30),
                        estado="PENDIENTE",
                    )
                    db.add(cpc)
                db.commit()
                print("   ✅ 5 cuentas por cobrar insertadas")
        else:
            print(f"   ⏭️  Cuentas por cobrar ya existen ({existing_cpc})")

        # ── 9. EMPLEADOS ─────────────────────────────────────────────────────
        print("🧑‍💼 Verificando empleados...")
        existing_emp = db.query(Empleado).count()
        if existing_emp == 0:
            usuario_ids = [r[0] for r in db.execute(
                text("SELECT id FROM usuarios ORDER BY id")
            ).fetchall()]

            salarios = [18000, 16000, 14500, 15000, 22000, 15500, 20000]
            for i, (usr_id, (nombre, _, dept, puesto)) in enumerate(
                zip(usuario_ids, NOMBRES_EMPLEADOS)
            ):
                emp = Empleado(
                    usuario_id=usr_id,
                    departamento=dept,
                    puesto=puesto,
                    salario_mensual=Decimal(str(salarios[i % len(salarios)])),
                    fecha_ingreso=NOW - timedelta(days=random.randint(180, 1800)),
                    activo=True,
                )
                db.add(emp)
            db.commit()
            print(f"   ✅ {len(NOMBRES_EMPLEADOS)} empleados insertados")
        else:
            print(f"   ⏭️  Empleados ya existen ({existing_emp})")

        # ── 10. PERÍODO DE NÓMINA ────────────────────────────────────────────
        print("💵 Verificando nóminas...")
        existing_nom = db.query(PeriodoNomina).count()
        if existing_nom == 0:
            # Primer día del mes actual
            inicio = datetime(ANIO_ACTUAL, MES_ACTUAL, 1)
            # Quincena: día 15 del mes
            fin = datetime(ANIO_ACTUAL, MES_ACTUAL, 15)

            empleados = db.query(Empleado).all()
            total_bruto = sum(float(e.salario_mensual) for e in empleados) / 2  # quincena

            periodo = PeriodoNomina(
                nombre=f"Quincena 1 - {MES_ACTUAL:02d}/{ANIO_ACTUAL}",
                fecha_inicio=inicio,
                fecha_fin=fin,
                estado="BORRADOR",
                total_bruto=Decimal(str(round(total_bruto, 2))),
                total_empleados=len(empleados),
                creado_por=admin_id,
            )
            db.add(periodo)
            db.flush()

            for emp in empleados:
                salario_base = emp.salario_mensual / 2  # quincena
                deducciones = salario_base * Decimal("0.12")  # 12% deducciones
                neto = salario_base - deducciones
                detalle = DetalleNomina(
                    periodo_id=periodo.id,
                    empleado_id=emp.id,
                    salario_base=salario_base.quantize(Decimal("0.01")),
                    deducciones=deducciones.quantize(Decimal("0.01")),
                    salario_neto=neto.quantize(Decimal("0.01")),
                )
                db.add(detalle)
            db.commit()
            print(f"   ✅ Período de nómina insertado (próxima: {fin.day} del mes)")
        else:
            print(f"   ⏭️  Nóminas ya existen ({existing_nom})")

        # ── Resumen final ────────────────────────────────────────────────────
        print("\n" + "=" * 55)
        print("✅ SEED COMPLETADO")
        print("=" * 55)
        print(f"  Productos:      {db.query(Producto).count()}")
        print(f"  Variantes:      {db.query(VarianteProducto).count()}")
        print(f"  Inventario:     {db.query(Inventario).count()} registros")
        print(f"  Ventas:         {db.query(Venta).count()}")
        print(f"  Clientes:       {db.query(Cliente).count()}")
        print(f"  Empleados:      {db.query(Empleado).count()}")
        print(f"  Nóminas:        {db.query(PeriodoNomina).count()}")
        from sqlalchemy import func
        stock_total = db.query(func.sum(Inventario.stock)).scalar() or 0
        ventas_mes = db.query(func.sum(Venta.total)).filter(
            Venta.estado == 'CERRADA',
            Venta.creada_en >= datetime(ANIO_ACTUAL, MES_ACTUAL, 1)
        ).scalar() or 0
        print(f"\n  Stock total:    {int(stock_total):,} prendas")
        print(f"  Ingresos mes:   ${float(ventas_mes):,.2f} MXN")
        print("\n  Credenciales de prueba:")
        print("    admin@nodo.mx     → Admin123!")
        print("    ana.vega@nodo.mx  → Cajero123!")
        print("=" * 55)

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error durante el seed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed()
