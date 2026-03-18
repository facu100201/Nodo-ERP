-- Migración 001: Agregar campos de control a ventas
-- Fecha: 2026-01-21
-- Propósito: Alinear tabla ventas con requisitos del documento Nodo

-- 1. Agregar campos de control a tabla ventas
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 0;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS descuento NUMERIC(12,2) DEFAULT 0;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS impuesto NUMERIC(12,2) DEFAULT 0;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'ABIERTA';
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- 2. Agregar constraint para estado
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ventas_estado_check'
    ) THEN
        ALTER TABLE ventas ADD CONSTRAINT ventas_estado_check 
        CHECK (estado IN ('ABIERTA', 'CERRADA', 'CANCELADA'));
    END IF;
END $$;

-- 3. Agregar constraints para montos no negativos
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_subtotal_check') THEN
        ALTER TABLE ventas ADD CONSTRAINT ventas_subtotal_check CHECK (subtotal >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_descuento_check') THEN
        ALTER TABLE ventas ADD CONSTRAINT ventas_descuento_check CHECK (descuento >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_impuesto_check') THEN
        ALTER TABLE ventas ADD CONSTRAINT ventas_impuesto_check CHECK (impuesto >= 0);
    END IF;
END $$;

-- 4. Actualizar ventas existentes con valores por defecto
UPDATE ventas SET 
    subtotal = COALESCE(total, 0),
    descuento = 0,
    impuesto = 0,
    estado = 'CERRADA'
WHERE subtotal IS NULL;

-- 5. Agregar índice para consultas por estado
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_estado ON ventas(creada_en, estado);

COMMENT ON COLUMN ventas.estado IS 'Estado de la venta: ABIERTA (en proceso), CERRADA (completada), CANCELADA';
COMMENT ON COLUMN ventas.subtotal IS 'Suma de todos los items antes de descuentos e impuestos';
COMMENT ON COLUMN ventas.descuento IS 'Descuento aplicado a la venta completa';
COMMENT ON COLUMN ventas.impuesto IS 'Impuestos calculados (IVA u otros)';
