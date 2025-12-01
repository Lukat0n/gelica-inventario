-- =====================================================
-- SCRIPT: Insertar datos iniciales mínimos
-- Ejecuta esto en Supabase SQL Editor
-- =====================================================

-- Deshabilitar RLS temporalmente para insertar
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE config DISABLE ROW LEVEL SECURITY;
ALTER TABLE prices DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Insertar productos
INSERT INTO products (id, name, weight_g, gel_fraction) VALUES
  ('gorro', 'Gorro Migraña', 800, 1.0),
  ('rodilleraXL', 'Rodillera XL', 700, 1.0),
  ('rodilleraM', 'Rodillera M', 500, 1.0)
ON CONFLICT (id) DO NOTHING;

-- Insertar inventario inicial (fila con id=1)
INSERT INTO inventory (id, acrylamide_kg, glycerin_kg, water_l, photoinitiator_ml, bis_g) VALUES
  (1, 0, 0, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Insertar telas inicial (fila con id=1)
INSERT INTO fabric_inventory (id, tela_gorro_nariz, tela_gorro_detras, tela_rodillera_m, tela_rodillera_xl) VALUES
  (1, 0, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Insertar configuración inicial (fila con id=1)
INSERT INTO config (id, acrylamide_per_kg_gel, glycerin_per_kg_gel, water_per_kg_gel, photoinitiator_per_kg_gel, bis_per_kg_gel, gel_density) VALUES
  (1, 0.15, 0.45, 0.4, 0.19, 0.9, 1.0)
ON CONFLICT (id) DO NOTHING;

-- Insertar precios inicial (fila con id=1)
INSERT INTO prices (id, acrylamide_usd_per_kg, glycerin_usd_per_kg, water_usd_per_l, photoinitiator_usd_per_ml, bis_usd_per_g, tela_gorro_usd_per_kg, tela_rodillera_usd_per_kg, iva, exchange_rate) VALUES
  (1, 0, 0, 0, 0, 0, 0, 0, 0.21, 1380)
ON CONFLICT (id) DO NOTHING;

-- Verificar que se insertaron
SELECT 'inventory' as tabla, count(*) as filas FROM inventory
UNION ALL
SELECT 'fabric_inventory', count(*) FROM fabric_inventory
UNION ALL
SELECT 'config', count(*) FROM config
UNION ALL
SELECT 'prices', count(*) FROM prices
UNION ALL
SELECT 'products', count(*) FROM products;
