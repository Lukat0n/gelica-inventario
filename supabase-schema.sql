-- =====================================================
-- GELICA INVENTARIO - SUPABASE DATABASE SCHEMA
-- =====================================================
-- Ejecuta este script en el SQL Editor de Supabase
-- para crear todas las tablas necesarias

-- Habilitar Row Level Security por defecto
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- =====================================================
-- TABLA: profiles
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'CEO', 'EMPLEADO')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver su propio perfil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Permitir inserción de perfiles"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- TABLA: products
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  weight_g NUMERIC NOT NULL,
  gel_fraction NUMERIC NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar productos por defecto
INSERT INTO products (id, name, weight_g, gel_fraction) VALUES
  ('gorro', 'Gorro Migraña', 800, 1.0),
  ('rodilleraXL', 'Rodillera XL', 700, 1.0),
  ('rodilleraM', 'Rodillera M', 500, 1.0)
ON CONFLICT (id) DO NOTHING;

-- RLS para products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer productos"
  ON products FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Solo CEO y ADMIN pueden modificar productos"
  ON products FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('ADMIN', 'CEO')
    )
  );

-- =====================================================
-- TABLA: inventory (materias primas)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY DEFAULT 1,
  acrylamide_kg NUMERIC NOT NULL DEFAULT 0,
  glycerin_kg NUMERIC NOT NULL DEFAULT 0,
  water_l NUMERIC NOT NULL DEFAULT 0,
  photoinitiator_ml NUMERIC NOT NULL DEFAULT 0,
  bis_g NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar fila inicial
INSERT INTO inventory (id, acrylamide_kg, glycerin_kg, water_l, photoinitiator_ml, bis_g) VALUES
  (1, 0, 0, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- RLS para inventory
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer inventario"
  ON inventory FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Todos pueden actualizar inventario"
  ON inventory FOR UPDATE
  USING (auth.role() = 'authenticated');

-- =====================================================
-- TABLA: fabric_inventory (telas)
-- =====================================================
CREATE TABLE IF NOT EXISTS fabric_inventory (
  id INTEGER PRIMARY KEY DEFAULT 1,
  tela_gorro_nariz NUMERIC NOT NULL DEFAULT 0,
  tela_gorro_detras NUMERIC NOT NULL DEFAULT 0,
  tela_rodillera_m NUMERIC NOT NULL DEFAULT 0,
  tela_rodillera_xl NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar fila inicial
INSERT INTO fabric_inventory (id, tela_gorro_nariz, tela_gorro_detras, tela_rodillera_m, tela_rodillera_xl) VALUES
  (1, 0, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- RLS para fabric_inventory
ALTER TABLE fabric_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer inventario de telas"
  ON fabric_inventory FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Todos pueden actualizar inventario de telas"
  ON fabric_inventory FOR UPDATE
  USING (auth.role() = 'authenticated');

-- =====================================================
-- TABLA: plan (unidades por día)
-- =====================================================
CREATE TABLE IF NOT EXISTS plan (
  product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  units_per_day NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para plan
ALTER TABLE plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer plan"
  ON plan FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Todos pueden modificar plan"
  ON plan FOR ALL
  USING (auth.role() = 'authenticated');

-- =====================================================
-- TABLA: config (coeficientes de producción)
-- =====================================================
CREATE TABLE IF NOT EXISTS config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  acrylamide_per_kg_gel NUMERIC NOT NULL DEFAULT 0.15,
  glycerin_per_kg_gel NUMERIC NOT NULL DEFAULT 0.45,
  water_per_kg_gel NUMERIC NOT NULL DEFAULT 0.4,
  photoinitiator_per_kg_gel NUMERIC NOT NULL DEFAULT 0.19,
  bis_per_kg_gel NUMERIC NOT NULL DEFAULT 0.9,
  gel_density NUMERIC NOT NULL DEFAULT 1.0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar configuración inicial
INSERT INTO config (id, acrylamide_per_kg_gel, glycerin_per_kg_gel, water_per_kg_gel, photoinitiator_per_kg_gel, bis_per_kg_gel, gel_density) VALUES
  (1, 0.15, 0.45, 0.4, 0.19, 0.9, 1.0)
ON CONFLICT (id) DO NOTHING;

-- RLS para config
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer config"
  ON config FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Solo CEO y ADMIN pueden modificar config"
  ON config FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('ADMIN', 'CEO')
    )
  );

-- =====================================================
-- TABLA: prices (precios de materiales)
-- =====================================================
CREATE TABLE IF NOT EXISTS prices (
  id INTEGER PRIMARY KEY DEFAULT 1,
  acrylamide_usd_per_kg NUMERIC NOT NULL DEFAULT 0,
  glycerin_usd_per_kg NUMERIC NOT NULL DEFAULT 0,
  water_usd_per_l NUMERIC NOT NULL DEFAULT 0,
  photoinitiator_usd_per_ml NUMERIC NOT NULL DEFAULT 0,
  bis_usd_per_g NUMERIC NOT NULL DEFAULT 0,
  tela_gorro_usd_per_kg NUMERIC NOT NULL DEFAULT 0,
  tela_rodillera_usd_per_kg NUMERIC NOT NULL DEFAULT 0,
  iva NUMERIC NOT NULL DEFAULT 0.21,
  exchange_rate NUMERIC NOT NULL DEFAULT 1380,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar precios iniciales
INSERT INTO prices (id, acrylamide_usd_per_kg, glycerin_usd_per_kg, water_usd_per_l, photoinitiator_usd_per_ml, bis_usd_per_g, tela_gorro_usd_per_kg, tela_rodillera_usd_per_kg, iva, exchange_rate) VALUES
  (1, 0, 0, 0, 0, 0, 0, 0, 0.21, 1380)
ON CONFLICT (id) DO NOTHING;

-- RLS para prices
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer prices"
  ON prices FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Solo CEO y ADMIN pueden modificar prices"
  ON prices FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('ADMIN', 'CEO')
    )
  );

-- =====================================================
-- TABLA: to_sew (pendientes de coser)
-- =====================================================
CREATE TABLE IF NOT EXISTS to_sew (
  product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  qty NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para to_sew
ALTER TABLE to_sew ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer to_sew"
  ON to_sew FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Todos pueden modificar to_sew"
  ON to_sew FOR ALL
  USING (auth.role() = 'authenticated');

-- =====================================================
-- TABLA: sewing (en proceso de costura)
-- =====================================================
CREATE TABLE IF NOT EXISTS sewing (
  product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  qty NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para sewing
ALTER TABLE sewing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer sewing"
  ON sewing FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Todos pueden modificar sewing"
  ON sewing FOR ALL
  USING (auth.role() = 'authenticated');

-- =====================================================
-- TABLA: production_logs (registro de producción)
-- =====================================================
CREATE TABLE IF NOT EXISTS production_logs (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_production_logs_timestamp ON production_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_production_logs_product ON production_logs(product_id);

-- RLS para production_logs
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer logs"
  ON production_logs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Todos pueden insertar logs"
  ON production_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- TABLA: users (legacy - opcional, si necesitas login personalizado)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'CEO', 'EMPLEADO')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo ADMIN puede ver usuarios"
  ON users FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'ADMIN'
    )
  );

CREATE POLICY "Solo ADMIN puede modificar usuarios"
  ON users FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'ADMIN'
    )
  );

-- =====================================================
-- TRIGGERS para updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fabric_inventory_updated_at BEFORE UPDATE ON fabric_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_updated_at BEFORE UPDATE ON plan
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_config_updated_at BEFORE UPDATE ON config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prices_updated_at BEFORE UPDATE ON prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_to_sew_updated_at BEFORE UPDATE ON to_sew
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sewing_updated_at BEFORE UPDATE ON sewing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCIÓN para crear perfil automáticamente al registrarse
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    'EMPLEADO'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automático
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- GRANTS
-- =====================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- FIN DEL SCHEMA
-- =====================================================
