// src/db.ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL!;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY!;
export const supabase = createClient(url, key);

// ---------- CARGA INICIAL (todo junto) ----------
export async function dbLoadAll() {
  const [
    productsQ,
    invQ,
    fabQ,
    planQ,
    cfgQ,
    pricesQ,
    toSewQ,
    sewingQ,
    logsQ,
    usersQ,
  ] = await Promise.all([
    supabase.from('products').select('*').order('name', { ascending: true }),
    supabase.from('inventory').select('*').single(),
    supabase.from('fabric_inventory').select('*').single(),
    supabase.from('plan').select('*'),
    supabase.from('config').select('*').single(),
    supabase.from('prices').select('*').single(),
    supabase.from('to_sew').select('*'),
    supabase.from('sewing').select('*'),
    supabase.from('production_logs').select('*').order('timestamp', { ascending: true }),
    supabase.from('users').select('*'),
  ]);

  return {
    products: productsQ.data || [],
    inv: invQ.data || null,
    fab: fabQ.data || null,
    plan: planQ.data || [],
    cfg: cfgQ.data || null,
    prices: pricesQ.data || null,
    toSew: toSewQ.data || [],
    sewing: sewingQ.data || [],
    logs: logsQ.data || [],
    users: usersQ.data || [],
  };
}

// ---------- INVENTARIO ----------
export async function dbUpdateInventory(inv: {
  id?: number;
  acrylamide_kg: number; glycerin_kg: number; water_l: number; photoinitiator_ml: number; bis_g: number;
}) {
  const id = inv.id ?? 1;
  const { id: _, ...data } = inv;
  return supabase.from('inventory').update(data).eq('id', id);
}

// ---------- TELAS ----------
export async function dbUpdateFabric(fab: {
  id?: number;
  tela_gorro_nariz: number; tela_gorro_detras: number; tela_rodillera_m: number; tela_rodillera_xl: number;
}) {
  const id = fab.id ?? 1;
  const { id: _, ...data } = fab;
  return supabase.from('fabric_inventory').update(data).eq('id', id);
}

// ---------- PLAN ----------
export async function dbSetPlan(productId: string, units: number) {
  // upsert manual
  const { data: exists } = await supabase.from('plan').select('product_id').eq('product_id', productId).maybeSingle();
  if (exists) return supabase.from('plan').update({ units_per_day: units }).eq('product_id', productId);
  return supabase.from('plan').insert({ product_id: productId, units_per_day: units });
}

// ---------- TO SEW / SEWING ----------
export async function dbSetToSew(productId: string, qty: number) {
  const { data: exists } = await supabase.from('to_sew').select('product_id').eq('product_id', productId).maybeSingle();
  if (exists) return supabase.from('to_sew').update({ qty }).eq('product_id', productId);
  return supabase.from('to_sew').insert({ product_id: productId, qty });
}
export async function dbSetSewing(productId: string, qty: number) {
  const { data: exists } = await supabase.from('sewing').select('product_id').eq('product_id', productId).maybeSingle();
  if (exists) return supabase.from('sewing').update({ qty }).eq('product_id', productId);
  return supabase.from('sewing').insert({ product_id: productId, qty });
}

// ---------- LOGS ----------
export async function dbInsertLogs(logs: { id: string; product_id: string; qty: number; timestamp: string }[]) {
  if (!logs.length) return;
  await supabase.from('production_logs').insert(logs);
}

// ---------- USERS (login simple con tu tabla) ----------
export async function dbFindUser(email: string, password: string) {
  const { data } = await supabase.from('users').select('*').eq('email', email).eq('password', password).limit(1);
  return data?.[0] || null;
}

// ---------- CONFIG ----------
export async function dbUpdateConfig(cfg: {
  id?: number;
  acrylamide_per_kg_gel: number;
  glycerin_per_kg_gel: number;
  water_per_kg_gel: number;
  photoinitiator_per_kg_gel: number;
  bis_per_kg_gel: number;
  gel_density: number;
}) {
  const id = cfg.id ?? 1;
  const { id: _, ...data } = cfg;
  return supabase.from('config').update(data).eq('id', id);
}

// ---------- PRICES ----------
export async function dbUpdatePrices(prices: {
  id?: number;
  acrylamide_usd_per_kg?: number;
  glycerin_usd_per_kg?: number;
  water_usd_per_l?: number;
  photoinitiator_usd_per_ml?: number;
  bis_usd_per_g?: number;
  tela_gorro_usd_per_kg?: number;
  tela_rodillera_usd_per_kg?: number;
  iva?: number;
  exchange_rate?: number;
}) {
  const id = prices.id ?? 1;
  const { id: _, ...data } = prices;
  return supabase.from('prices').update(data).eq('id', id);
}

// ---------- PRODUCTS ----------
export async function dbInsertProduct(p: { id: string; name: string; weight_g: number; gel_fraction: number }) {
  return supabase.from('products').insert(p);
}
export async function dbUpdateProduct(p: { id: string; name?: string; weight_g?: number; gel_fraction?: number }) {
  return supabase.from('products').update(p).eq('id', p.id);
}
export async function dbDeleteProduct(id: string) {
  return supabase.from('products').delete().eq('id', id);
}
