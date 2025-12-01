-- =====================================================
-- FIX: Agregar columna updated_at a las tablas
-- =====================================================

-- Agregar columna updated_at a inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Agregar columna updated_at a fabric_inventory
ALTER TABLE fabric_inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Agregar columna updated_at a config
ALTER TABLE config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Agregar columna updated_at a prices
ALTER TABLE prices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Actualizar valores para las filas existentes
UPDATE inventory SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE fabric_inventory SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE config SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE prices SET updated_at = NOW() WHERE updated_at IS NULL;

-- Verificar que todas tienen updated_at
SELECT 'inventory' as tabla, id, updated_at FROM inventory WHERE id = 1
UNION ALL
SELECT 'fabric_inventory', id, updated_at FROM fabric_inventory WHERE id = 1
UNION ALL
SELECT 'config', id, updated_at FROM config WHERE id = 1
UNION ALL
SELECT 'prices', id, updated_at FROM prices WHERE id = 1;
