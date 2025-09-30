// src/App.tsx
import React, { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabaseClient";

import {
  dbLoadAll,
  dbUpdateInventory,
  dbUpdateFabric,
  dbSetPlan,
  dbSetToSew,
  dbSetSewing,
  dbInsertLogs,
  dbInsertProduct,
  dbUpdateProduct,
  dbDeleteProduct,
} from "./db";

/** Tipos */
type Inventory = { acrylamideKg: number; glycerinKg: number; waterL: number; photoinitiatorMl: number; bisG: number };
type FabricInventory = { telaGorroNariz: number; telaGorroDetras: number; telaRodilleraM: number; telaRodilleraXL: number };
type Product = { id: string; name: string; weightG: number; gelFraction: number };
type Plan = Record<string, number>;
type Produced = Record<string, number>;
type Coeff = { acrylamideKgPerKgGel: number; glycerinKgPerKgGel: number; waterLPerKgGel: number; photoinitiatorMlPerKgGel: number; bisGPerKgGel: number };
type ProductionLog = { id: string; productId: string; qty: number; timestamp: string };
type DailyFabricUsage = { telaGorroNariz: number; telaGorroDetras: number; telaRodilleraM: number; telaRodilleraXL: number };
type ProductRunway = { id: string; name: string; days: number; bottleneck: string };

type PriceConfig = {
  acrylamideUsdPerKg: number;
  glycerinUsdPerKg: number;
  waterUsdPerL: number;
  photoinitiatorUsdPerMl: number;
  bisUsdPerG: number;
  telaGorroUsdPerKg: number;      // gorro total (nariz + detrás)
  telaRodilleraUsdPerKg: number;
  IVA: number;                    // ej. 0.21
  exchangeRate: number;           // ARS por USD
};

export type Role = "ADMIN" | "CEO" | "EMPLEADO";

/** Defaults */
const DEFAULT_PRODUCTS: Product[] = [
  { id: "gorro", name: "Gorro Migraña", weightG: 800, gelFraction: 1.0 },
  { id: "rodilleraXL", name: "Rodillera XL", weightG: 700, gelFraction: 1.0 },
  { id: "rodilleraM", name: "Rodillera M", weightG: 500, gelFraction: 1.0 },
];
const DEFAULT_INVENTORY: Inventory = { acrylamideKg: 0, glycerinKg: 0, waterL: 0, photoinitiatorMl: 0, bisG: 0 };
const DEFAULT_FABRIC: FabricInventory = { telaGorroNariz: 0, telaGorroDetras: 0, telaRodilleraM: 0, telaRodilleraXL: 0 };
const DEFAULT_COEFF: Coeff = { acrylamideKgPerKgGel: 0.15, glycerinKgPerKgGel: 0.45, waterLPerKgGel: 0.4, photoinitiatorMlPerKgGel: 0.19, bisGPerKgPerKgGel: 0 as never, bisGPerKgGel: 0.9 } as any;
const DEFAULT_PRICES: PriceConfig = {
  acrylamideUsdPerKg: 0,
  glycerinUsdPerKg: 0,
  waterUsdPerL: 0,
  photoinitiatorUsdPerMl: 0,
  bisUsdPerG: 0,
  telaGorroUsdPerKg: 0,
  telaRodilleraUsdPerKg: 0,
  IVA: 0.21,
  exchangeRate: 1380,
};

/** Helpers de tabs/permisos */
function canSeeTab(role: Role | null, tab: string) {
  if (!role) return false;
  if (role === "ADMIN") return tab === "empleados";
  if (role === "CEO") return ["produccion","stock","costura","config","compras"].includes(tab);
  return ["produccion","stock","costura","compras"].includes(tab);
}

/** Formato */
const fmtInt = (n: number) => Math.ceil(n).toLocaleString("es-AR");
const fmtMoney = (n: number) => Math.ceil(n).toLocaleString("es-AR");
const fmtDays = (n: number) => (n === Infinity ? "—" : n.toFixed(1));

export default function App() {
  const [booting, setBooting] = useState(true);

  // === AUTH (Supabase) ===
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<{ id: string; email: string; name: string; role: Role } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setSession(data.session ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingProfile(true);
      if (!session?.user) { setProfile(null); setLoadingProfile(false); return; }

      const { data, error } = await supabase
        .from("profiles")
        .select("id,name,role")
        .eq("id", session.user.id)
        .single();

      if (!error && data) {
        setProfile({ id: data.id, name: data.name, role: data.role as Role, email: session.user.email || "" });
      } else {
        // si no existe perfil, creamos uno básico como EMPLEADO
        await supabase.from("profiles").insert({
          id: session.user.id,
          name: session.user.email?.split("@")[0] || "Usuario",
          role: "EMPLEADO",
        });
        const again = await supabase.from("profiles").select("id,name,role").eq("id", session.user.id).single();
        if (!again.error && again.data) {
          setProfile({ id: again.data.id, name: again.data.name, role: again.data.role as Role, email: session.user.email || "" });
        }
      }
      setLoadingProfile(false);
    })();
  }, [session]);

  // === Estado de negocio (igual que tenías) ===
  const [activeTab, setActiveTab] = useState<"produccion" | "stock" | "costura" | "config" | "empleados" | "compras">("produccion");
  const [inventory, setInventory] = useState<Inventory>(DEFAULT_INVENTORY);
  const [fabric, setFabric] = useState<FabricInventory>(DEFAULT_FABRIC);
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [plan, setPlan] = useState<Plan>({});
  const [produced, setProduced] = useState<Produced>({});
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [gelDensity, setGelDensity] = useState<number>(1.0);
  const [coeff, setCoeff] = useState<Coeff>(DEFAULT_COEFF);
  const [toSew, setToSew] = useState<Record<string, number>>({});
  const [sewing, setSewing] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<PriceConfig>(DEFAULT_PRICES);

  // Carga inicial desde DB (si usás tus helpers db*)
  useEffect(() => {
    (async () => {
      const { products, inv, fab, plan, cfg, prices, toSew, sewing, logs } = await dbLoadAll();

      setProducts(products.length ? products.map((p:any)=>({ id:p.id, name:p.name, weightG:Number(p.weight_g), gelFraction:Number(p.gel_fraction) })) : DEFAULT_PRODUCTS);

      setInventory(inv ? {
        acrylamideKg: Number(inv.acrylamide_kg),
        glycerinKg: Number(inv.glycerin_kg),
        waterL: Number(inv.water_l),
        photoinitiatorMl: Number(inv.photoinitiator_ml),
        bisG: Number(inv.bis_g),
      } : DEFAULT_INVENTORY);

      setFabric(fab ? {
        telaGorroNariz: Number(fab.tela_gorro_nariz),
        telaGorroDetras: Number(fab.tela_gorro_detras),
        telaRodilleraM: Number(fab.tela_rodillera_m),
        telaRodilleraXL: Number(fab.tela_rodillera_xl),
      } : DEFAULT_FABRIC);

      const planMap: Record<string, number> = {};
      (plan||[]).forEach((r:any)=> planMap[r.product_id] = Number(r.units_per_day));
      setPlan(planMap);

      if (cfg) {
        setCoeff({
          acrylamideKgPerKgGel: Number(cfg.acrylamide_per_kg_gel),
          glycerinKgPerKgGel: Number(cfg.glycerin_per_kg_gel),
          waterLPerKgGel: Number(cfg.water_per_kg_gel),
          photoinitiatorMlPerKgGel: Number(cfg.photoinitiator_per_kg_gel),
          bisGPerKgGel: Number(cfg.bis_per_kg_gel),
        });
        setGelDensity(Number(cfg.gel_density));
      }

      const toSewMap: Record<string, number> = {};
      (toSew||[]).forEach((r:any)=> toSewMap[r.product_id] = Number(r.qty));
      setToSew(toSewMap);

      const sewingMap: Record<string, number> = {};
      (sewing||[]).forEach((r:any)=> sewingMap[r.product_id] = Number(r.qty));
      setSewing(sewingMap);

      setLogs((logs||[]).map((l:any)=>({ id:l.id, productId:l.product_id, qty:Number(l.qty), timestamp:l.timestamp })));

      if (prices) {
        setPrices({
          acrylamideUsdPerKg: Number(prices.acrylamide_usd_per_kg ?? 0),
          glycerinUsdPerKg: Number(prices.glycerin_usd_per_kg ?? 0),
          waterUsdPerL: Number(prices.water_usd_per_l ?? 0),
          photoinitiatorUsdPerMl: Number(prices.photoinitiator_usd_per_ml ?? 0),
          bisUsdPerG: Number(prices.bis_usd_per_g ?? 0),
          telaGorroUsdPerKg: Number(prices.tela_gorro_usd_per_kg ?? 0),
          telaRodilleraUsdPerKg: Number(prices.tela_rodillera_usd_per_kg ?? 0),
          IVA: Number(prices.iva ?? 0.21),
          exchangeRate: Number(prices.exchange_rate ?? 1380),
        });
      }

      setBooting(false);
    })();
  }, []);

  // derivadas
  const productGelKg = (p:Product)=>(p.weightG/1000)*p.gelFraction;
  const usagePerUnit = (p:Product)=>{ const kgGel=productGelKg(p); return { acrylamideKg: kgGel*coeff.acrylamideKgPerKgGel, glycerinKg: kgGel*coeff.glycerinKgPerKgGel, waterL: kgGel*coeff.waterLPerKgGel, photoinitiatorMl: kgGel*coeff.photoinitiatorMlPerKgGel, bisG: kgGel*coeff.bisGPerKgGel }};
  const dailyUsage = useMemo(()=>{
    const t = { acrylamideKg:0, glycerinKg:0, waterL:0, photoinitiatorMl:0, bisG:0 };
    products.forEach(p=>{ const u=usagePerUnit(p); const q=plan[p.id]||0; t.acrylamideKg+=u.acrylamideKg*q; t.glycerinKg+=u.glycerinKg*q; t.waterL+=u.waterL*q; t.photoinitiatorMl+=u.photoinitiatorMl*q; t.bisG+=u.bisG*q; });
    return t;
  }, [plan, products, coeff]);
  const dailyFabricUsage = useMemo(()=>({ telaGorroNariz: plan["gorro"]||0, telaGorroDetras: plan["gorro"]||0, telaRodilleraM: plan["rodilleraM"]||0, telaRodilleraXL: plan["rodilleraXL"]||0 }), [plan]);

  const productRunway = useMemo(()=>{
    const res: ProductRunway[] = [];
    products.forEach(p=>{
      const qtyPerDay = plan[p.id]||0;
      if(qtyPerDay<=0){ res.push({id:p.id,name:p.name,days:Infinity,bottleneck:"—"}); return; }
      const u = usagePerUnit(p);
      const mats: {label:string;stock:number;daily:number}[] = [
        {label:"Acrilamida (kg)", stock: inventory.acrylamideKg, daily: u.acrylamideKg*qtyPerDay},
        {label:"Glicerina (kg)", stock: inventory.glycerinKg, daily: u.glycerinKg*qtyPerDay},
        {label:"Agua destilada (L)", stock: inventory.waterL, daily: u.waterL*qtyPerDay},
        {label:"Fotoiniciador 1173 (mL)", stock: inventory.photoinitiatorMl, daily: u.photoinitiatorMl*qtyPerDay},
        {label:"Bisacrilamida (g)", stock: inventory.bisG, daily: u.bisG*qtyPerDay},
      ];
      if(p.id==="gorro"){ mats.push({label:"Tela gorro nariz (unid.)", stock:fabric.telaGorroNariz, daily:1*qtyPerDay}); mats.push({label:"Tela gorro detrás (unid.)", stock:fabric.telaGorroDetras, daily:1*qtyPerDay}); }
      else if(p.id==="rodilleraM"){ mats.push({label:"Tela rodillera M (unid.)", stock:fabric.telaRodilleraM, daily:1*qtyPerDay}); }
      else if(p.id==="rodilleraXL"){ mats.push({label:"Tela rodillera XL (unid.)", stock:fabric.telaRodilleraXL, daily:1*qtyPerDay}); }
      const daysList = mats.map(m=>({label:m.label, days: m.daily<=0?Infinity:m.stock/m.daily}));
      const bottleneck = daysList.reduce((a,b)=> a.days<b.days?a:b, {label:"—", days:Infinity} as any);
      res.push({id:p.id, name:p.name, days:bottleneck.days, bottleneck:bottleneck.label});
    });
    return res;
  }, [products, plan, inventory, fabric, coeff]);

  const runway = useMemo(()=>{
    const daysPerMat: {key:keyof Inventory; days:number}[] = [];
    const push=(k:keyof Inventory, stock:number, daily:number)=>{ const d = daily<=0?Infinity:stock/daily; daysPerMat.push({key:k, days:d}) };
    push("acrylamideKg", inventory.acrylamideKg, dailyUsage.acrylamideKg);
    push("glycerinKg", inventory.glycerinKg, dailyUsage.glycerinKg);
    push("waterL", inventory.waterL, dailyUsage.waterL);
    push("photoinitiatorMl", inventory.photoinitiatorMl, dailyUsage.photoinitiatorMl);
    push("bisG", inventory.bisG, dailyUsage.bisG);
    const bottleneck = daysPerMat.reduce((m,x)=>(x.days<m.days?x:m), {key:"acrylamideKg" as keyof Inventory, days: Infinity});
    return { daysPerMat, minDays: bottleneck.days, bottleneck: bottleneck.key };
  }, [inventory, dailyUsage]);

  // Persistencia
  const addStock = (delta: Partial<Inventory>) => {
    setInventory(prev => {
      const next = {
        acrylamideKg: prev.acrylamideKg + (delta.acrylamideKg||0),
        glycerinKg: prev.glycerinKg + (delta.glycerinKg||0),
        waterL: prev.waterL + (delta.waterL||0),
        photoinitiatorMl: prev.photoinitiatorMl + (delta.photoinitiatorMl||0),
        bisG: prev.bisG + (delta.bisG||0),
      };
      dbUpdateInventory({
        acrylamide_kg: next.acrylamideKg,
        glycerin_kg: next.glycerinKg,
        water_l: next.waterL,
        photoinitiator_ml: next.photoinitiatorMl,
        bis_g: next.bisG,
      });
      return next;
    });
  };
  const addFabric = (delta: Partial<FabricInventory>) => {
    setFabric(prev => {
      const next = {
        telaGorroNariz:  prev.telaGorroNariz  + (delta.telaGorroNariz||0),
        telaGorroDetras: prev.telaGorroDetras + (delta.telaGorroDetras||0),
        telaRodilleraM:  prev.telaRodilleraM  + (delta.telaRodilleraM||0),
        telaRodilleraXL: prev.telaRodilleraXL + (delta.telaRodilleraXL||0),
      };
      dbUpdateFabric({
        tela_gorro_nariz: next.telaGorroNariz,
        tela_gorro_detras: next.telaGorroDetras,
        tela_rodillera_m: next.telaRodilleraM,
        tela_rodillera_xl: next.telaRodilleraXL,
      });
      return next;
    });
  };

  const consumeForProduction = (qty:Produced):{ok:boolean;lacks?:string[]}=>{
    let needed:Inventory={ acrylamideKg:0,glycerinKg:0,waterL:0,photoinitiatorMl:0,bisG:0 };
    let fabricNeeded:FabricInventory={ ...DEFAULT_FABRIC };
    products.forEach(p=>{
      const u=usagePerUnit(p); const n=qty[p.id]||0;
      needed.acrylamideKg+=u.acrylamideKg*n; needed.glycerinKg+=u.glycerinKg*n; needed.waterL+=u.waterL*n; needed.photoinitiatorMl+=u.photoinitiatorMl*n; needed.bisG+=u.bisG*n;
      if(p.id==="gorro"){ fabricNeeded.telaGorroNariz+=1*n; fabricNeeded.telaGorroDetras+=1*n; }
      else if(p.id==="rodilleraM"){ fabricNeeded.telaRodilleraM+=1*n; }
      else if(p.id==="rodilleraXL"){ fabricNeeded.telaRodilleraXL+=1*n; }
    });
    const lacks:string[]=[];
    if(needed.acrylamideKg>inventory.acrylamideKg+1e-9) lacks.push("Acrilamida");
    if(needed.glycerinKg>inventory.glycerinKg+1e-9) lacks.push("Glicerina");
    if(needed.waterL>inventory.waterL+1e-9) lacks.push("Agua destilada");
    if(needed.photoinitiatorMl>inventory.photoinitiatorMl+1e-9) lacks.push("1173");
    if(needed.bisG>inventory.bisG+1e-9) lacks.push("Bisacrilamida");
    if(fabricNeeded.telaGorroNariz>fabric.telaGorroNariz) lacks.push("Tela gorro nariz");
    if(fabricNeeded.telaGorroDetras>fabric.telaGorroDetras) lacks.push("Tela gorro detrás");
    if(fabricNeeded.telaRodilleraM>fabric.telaRodilleraM) lacks.push("Tela rodillera M");
    if(fabricNeeded.telaRodilleraXL>fabric.telaRodilleraXL) lacks.push("Tela rodillera XL");
    if(lacks.length){ return { ok:false, lacks } }

    const invAfter = {
      acrylamideKg: inventory.acrylamideKg-needed.acrylamideKg,
      glycerinKg: inventory.glycerinKg-needed.glycerinKg,
      waterL: inventory.waterL-needed.waterL,
      photoinitiatorMl: inventory.photoinitiatorMl-needed.photoinitiatorMl,
      bisG: inventory.bisG-needed.bisG,
    };
    const fabAfter = {
      telaGorroNariz: fabric.telaGorroNariz - fabricNeeded.telaGorroNariz,
      telaGorroDetras: fabric.telaGorroDetras - fabricNeeded.telaGorroDetras,
      telaRodilleraM: fabric.telaRodilleraM - fabricNeeded.telaRodilleraM,
      telaRodilleraXL: fabric.telaRodilleraXL - fabricNeeded.telaRodilleraXL,
    };

    setInventory(invAfter);
    setFabric(fabAfter);

    dbUpdateInventory({
      acrylamide_kg: invAfter.acrylamideKg,
      glycerin_kg: invAfter.glycerinKg,
      water_l: invAfter.waterL,
      photoinitiator_ml: invAfter.photoinitiatorMl,
      bis_g: invAfter.bisG,
    });
    dbUpdateFabric({
      tela_gorro_nariz: fabAfter.telaGorroNariz,
      tela_gorro_detras: fabAfter.telaGorroDetras,
      tela_rodillera_m: fabAfter.telaRodilleraM,
      tela_rodillera_xl: fabAfter.telaRodilleraXL,
    });

    const ts=new Date().toISOString(); const newLogs:ProductionLog[]=[];
    Object.entries(qty).forEach(([productId,q])=>{ const num = Number(q||0); if(num>0){ newLogs.push({ id:`${ts}-${productId}-${Math.random().toString(36).slice(2,8)}`, productId, qty:num, timestamp: ts }) } });
    if(newLogs.length){
      setLogs(prev=>[...prev, ...newLogs]);
      dbInsertLogs(newLogs.map(l=>({ id:l.id, product_id:l.productId, qty:l.qty, timestamp:l.timestamp })));
    }
    return { ok:true };
  };

  const moveToSewing=(dispatch:Record<string,number>)=>{
    const updatedToSew={...toSew}; const updatedSewing={...sewing};
    products.forEach(p=>{
      const n=Math.max(0, Math.floor(dispatch[p.id]||0));
      const avail=updatedToSew[p.id]||0;
      const send=Math.min(avail,n);
      if(send>0){
        updatedToSew[p.id]=avail-send;
        updatedSewing[p.id]=(updatedSewing[p.id]||0)+send;
        dbSetToSew(p.id, updatedToSew[p.id]);
        dbSetSewing(p.id, updatedSewing[p.id]);
      }
    });
    setToSew(updatedToSew); setSewing(updatedSewing);
  };
  const moveAllToSewing=()=>{ const d:Record<string,number>={}; products.forEach(p=>d[p.id]=toSew[p.id]||0); moveToSewing(d) };
  const retireFromSewing=(dispatch:Record<string,number>)=>{
    const updated={...sewing};
    products.forEach(p=>{
      const n=Math.max(0, Math.floor(dispatch[p.id]||0));
      const avail=updated[p.id]||0;
      const newQty=Math.max(0, avail-n);
      updated[p.id]=newQty;
      dbSetSewing(p.id, newQty);
    });
    setSewing(updated);
  };
  const retireAll=()=>{ const d:Record<string,number>={}; products.forEach(p=>d[p.id]=sewing[p.id]||0); retireFromSewing(d) };

  // Redirección de tab según rol
  useEffect(() => {
    if (!profile) return;
    if (!canSeeTab(profile.role, activeTab)) {
      const fallback = (profile.role === "ADMIN") ? "empleados" : "produccion";
      setActiveTab(fallback as any);
    }
  }, [profile, activeTab]);

  // === Render ===
  if (booting || loadingProfile) return <div className="p-6">Cargando…</div>;

  if (!session) {
    return <Login onLogin={async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }} />;
  }

  if (!profile) return <div className="p-6">Cargando perfil…</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="GÉLICA" className="h-8 w-auto" />
            <h1 className="text-2xl font-bold">Inventario</h1>
          </div>
          <nav className="flex items-center gap-1">
            {canSeeTab(profile.role, "produccion") && <TabButton active={activeTab==="produccion"} onClick={()=>setActiveTab("produccion")}>Producción</TabButton>}
            {canSeeTab(profile.role, "stock") && <TabButton active={activeTab==="stock"} onClick={()=>setActiveTab("stock")}>Stock</TabButton>}
            {canSeeTab(profile.role, "costura") && <TabButton active={activeTab==="costura"} onClick={()=>setActiveTab("costura")}>Costura</TabButton>}
            {canSeeTab(profile.role, "compras") && <TabButton active={activeTab==="compras"} onClick={()=>setActiveTab("compras")}>Compras</TabButton>}
            {canSeeTab(profile.role, "config") && <TabButton active={activeTab==="config"} onClick={()=>setActiveTab("config")}>Configuración</TabButton>}
            {canSeeTab(profile.role, "empleados") && <TabButton active={activeTab==="empleados"} onClick={()=>setActiveTab("empleados")}>Rangos/Empleados</TabButton>}
            <div className="ml-3 text-sm text-slate-500">{profile.name} ({profile.role})</div>
            <button type="button" className="ml-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800" onClick={async ()=>{ await supabase.auth.signOut(); }}>
              Salir
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab==="produccion" && (
          <ProductionTab
            products={products}
            produced={produced}
            setProduced={setProduced}
            onProduce={()=>{
              const total = Object.values(produced||{}).reduce((s,n)=>s + (Number.isFinite(n as number)?(n as number):0), 0);
              if(total<=0){ alert("Ingresá cantidades para producir."); return; }
              const res = consumeForProduction(produced);
              if(!res.ok){ const list = (res.lacks && res.lacks.length)? res.lacks.join(", ") : "(detalle no disponible)"; alert("Stock de materiales/telas insuficientes: " + list); return; }
              setToSew(prev=>{ const next={...prev} as Record<string,number>; Object.keys(produced).forEach(k=>{ const q=Math.max(0, Math.floor((produced as any)[k]||0)); if(q>0){ next[k]=(next[k]||0)+q; dbSetToSew(k, next[k]); } }); return next; });
              alert("Producción registrada ✔️\nStock actualizado.");
              setProduced({});
            }}
            plan={plan}
            setPlan={(p)=>{ setPlan(p); /* dbSetPlan se llama en PlanEditor */ }}
            dailyUsage={dailyUsage}
            dailyFabricUsage={dailyFabricUsage}
            productRunway={productRunway}
            runway={runway}
            logs={logs}
            toSew={toSew}
            onSendAllToSew={moveAllToSewing}
            onSendToSew={moveToSewing}
          />
        )}

        {activeTab==="stock" && (<StockTab inventory={inventory} setInventory={setInventory} fabric={fabric} setFabric={setFabric} addStock={addStock} addFabric={addFabric} />)}
        {activeTab==="costura" && (<SewingTab products={products} sewing={sewing} onRetire={(d)=>retireFromSewing(d)} onRetireAll={()=>retireAll()} />)}
        {activeTab==="compras" && (<ComprasTab products={products} usagePerUnit={(p)=>usagePerUnit(p)} prices={prices} setPrices={setPrices} />)}
        {activeTab==="config" && (<ConfigTab products={products} setProducts={setProducts} coeff={coeff} setCoeff={setCoeff} gelDensity={gelDensity} setGelDensity={setGelDensity} />)}
        {activeTab==="empleados" && (<UsersTabSupabase />)}
      </main>
    </div>
  );
}

/** UI genérica */
function TabButton({ active, onClick, children }:{active:boolean; onClick:()=>void; children:React.ReactNode}){
  return <button className={`px-3 py-1.5 rounded-xl border text-sm ${active?"bg-slate-900 text-white border-slate-900":"bg-white hover:bg-slate-100"}`} onClick={onClick}>{children}</button>;
}

function InventoryEditor({ inventory, setInventory, matLabel }:{ inventory:Inventory; setInventory:(v:Inventory)=>void; matLabel:Record<keyof Inventory,string> }){
  return (<div className="grid grid-cols-1 gap-2">
    {(Object.keys(inventory) as (keyof Inventory)[]).map(k=>(
      <label key={k} className="text-sm">{matLabel[k]}
        <input type="number" step={0.001} value={inventory[k]} onChange={e=>setInventory({ ...inventory, [k]: parseFloat(e.target.value || "0") })} className="mt-1 w-full border rounded-lg px-3 py-2" />
      </label>
    ))}
  </div>);
}

function FabricEditor({ fabric, setFabric }:{ fabric:FabricInventory; setFabric:(f:FabricInventory)=>void }){
  const fields:{key:keyof FabricInventory; label:string}[]=[
    { key:"telaGorroNariz", label:"Tela gorro – nariz (unid.)" },
    { key:"telaGorroDetras", label:"Tela gorro – detrás (unid.)" },
    { key:"telaRodilleraM", label:"Tela rodillera M (unid.)" },
    { key:"telaRodilleraXL", label:"Tela rodillera XL (unid.)" },
  ];
  return (<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
    {fields.map(f=>(
      <label key={f.key} className="text-sm">{f.label}
        <input type="number" step={1} min={0} value={fabric[f.key]} onChange={e=>setFabric({ ...fabric, [f.key]: Number(e.target.value || 0) })} className="mt-1 w-full border rounded-lg px-3 py-2" />
      </label>
    ))}
  </div>);
}

function AddStockForm({ onAdd, onAddFabric }:{ onAdd:(d:Partial<Inventory>)=>void; onAddFabric:(d:Partial<FabricInventory>)=>void }){
  const [deltaInv, setDeltaInv] = useState<Partial<Inventory>>({});
  const [deltaFab, setDeltaFab] = useState<Partial<FabricInventory>>({});
  const uInv=(k:keyof Inventory, v:number)=>setDeltaInv({ ...deltaInv, [k]: v });
  const uFab=(k:keyof FabricInventory, v:number)=>setDeltaFab({ ...deltaFab, [k]: v });
  const clear=()=>{ setDeltaInv({}); setDeltaFab({}) };
  const addAll=()=>{ onAdd(deltaInv); onAddFabric(deltaFab); clear() };
  return (<div>
    <div className="grid grid-cols-1 gap-2">
      <NumberField label="Acrilamida (kg)" value={deltaInv.acrylamideKg as any} onChange={v=>uInv("acrylamideKg", v)} />
      <NumberField label="Glicerina (kg)" value={deltaInv.glycerinKg as any} onChange={v=>uInv("glycerinKg", v)} />
      <NumberField label="Agua destilada (L)" value={deltaInv.waterL as any} onChange={v=>uInv("waterL", v)} />
      <NumberField label="Fotoiniciador 1173 (mL)" value={deltaInv.photoinitiatorMl as any} onChange={v=>uInv("photoinitiatorMl", v)} />
      <NumberField label="Bisacrilamida (g)" value={deltaInv.bisG as any} onChange={v=>uInv("bisG", v)} />
    </div>
    <div className="border-t my-4" />
    <h3 className="font-semibold mb-2">Telas (piezas)</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <NumberField label="Tela gorro – nariz (unid.)" value={deltaFab.telaGorroNariz as any} onChange={v=>uFab("telaGorroNariz", v)} step={1} />
      <NumberField label="Tela gorro – detrás (unid.)" value={deltaFab.telaGorroDetras as any} onChange={v=>uFab("telaGorroDetras", v)} step={1} />
      <NumberField label="Tela rodillera M (unid.)" value={deltaFab.telaRodilleraM as any} onChange={v=>uFab("telaRodilleraM", v)} step={1} />
      <NumberField label="Tela rodillera XL (unid.)" value={deltaFab.telaRodilleraXL as any} onChange={v=>uFab("telaRodilleraXL", v)} step={1} />
    </div>
    <div className="flex gap-2 mt-3">
      <button type="button" className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={addAll}>Añadir</button>
      <button type="button" className="px-3 py-1.5 rounded-xl border" onClick={clear}>Limpiar</button>
    </div>
  </div>);
}

function PlanEditor({ products, plan, setPlan }:{ products:Product[]; plan:Plan; setPlan:(p:Plan)=>void }){
  const set=(id:string, n:number)=>{ setPlan({ ...plan, [id]: n }); dbSetPlan(id, n); };
  return (<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
    {products.map(p=>(
      <div key={p.id} className="rounded-xl border p-3">
        <div className="font-medium">{p.name}</div>
        <label className="text-sm block mt-2">Unidades por día
          <input type="number" min={0} value={plan[p.id]||0} onChange={e=>set(p.id, Number(e.target.value||0))} className="mt-1 w-full border rounded-lg px-3 py-2" />
        </label>
      </div>
    ))}
  </div>);
}

function StockTab({ inventory, setInventory, fabric, setFabric, addStock, addFabric }:{ inventory:Inventory; setInventory:(v:Inventory)=>void; fabric:FabricInventory; setFabric:(f:FabricInventory)=>void; addStock:(d:Partial<Inventory>)=>void; addFabric:(d:Partial<FabricInventory>)=>void }){
  const matLabel:Record<keyof Inventory,string>={ acrylamideKg:"Acrilamida (kg)", glycerinKg:"Glicerina (kg)", waterL:"Agua destilada (L)", photoinitiatorMl:"Fotoiniciador 1173 (mL)", bisG:"Bisacrilamida (g)" };
  return (<section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-2">Stock de Materias Primas</h2>
      <InventoryEditor inventory={inventory} setInventory={setInventory} matLabel={matLabel} />
      <div className="text-xs text-slate-500 mt-3">Edición directa para correcciones puntuales.</div>
    </div>
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-2">Sumar Stock (recepciones)</h2>
      <AddStockForm onAdd={addStock} onAddFabric={addFabric} />
    </div>
    <div className="lg:col-span-2 bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-2">Tela (piezas)</h2>
      <FabricEditor fabric={fabric} setFabric={setFabric} />
    </div>
  </section>);
}

function ProductionTab({ products, produced, setProduced, onProduce, plan, setPlan, dailyUsage, dailyFabricUsage, productRunway, runway, logs, toSew, onSendAllToSew, onSendToSew }:{ products:Product[]; produced:Produced; setProduced:(p:Produced)=>void; onProduce:()=>void; plan:Plan; setPlan:(p:Plan)=>void; dailyUsage:any; dailyFabricUsage:DailyFabricUsage; productRunway:ProductRunway[]; runway:any; logs:ProductionLog[]; toSew:Record<string,number>; onSendAllToSew:()=>void; onSendToSew:(d:Record<string,number>)=>void }){
  const [range, setRange] = useState<"semana"|"mes">("semana");
  const [dispatch, setDispatch] = useState<Record<string,number>>({});
  const now = new Date();
  const start = new Date(now); start.setHours(0,0,0,0); if(range==="semana") start.setDate(now.getDate()-6); if(range==="mes") start.setDate(now.getDate()-29);
  const days:string[]=[]; for(let d=new Date(start); d<=now; d.setDate(d.getDate()+1)){ days.push(d.toISOString().slice(0,10)) }
  const data = days.map(day=>{ const total = logs.filter(l=>l.timestamp.slice(0,10)===day).reduce((s,l)=>s+l.qty,0); return { day, total } });
  const periodTotal = data.reduce((s,x)=>s+x.total,0);
  const [selectedDay, setSelectedDay] = useState<string>(now.toISOString().slice(0,10));
  const hourly = Array.from({length:24}).map((_,h)=>{ const sum = logs.filter(l=>l.timestamp.slice(0,10)===selectedDay && new Date(l.timestamp).getHours()===h).reduce((s,l)=>s+l.qty,0); return { hour: `${h}:00`, total: sum } });
  const daysByMatLabels:Record<keyof Inventory,string>={ acrylamideKg:"Acrilamida (kg)", glycerinKg:"Glicerina (kg)", waterL:"Agua destilada (L)", photoinitiatorMl:"Fotoiniciador 1173 (mL)", bisG:"Bisacrilamida (g)" };

  return (<section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-1 bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-2">Registrar Producción</h2>
      <div className="space-y-2">
        {products.map(p=>(
          <div key={p.id} className="flex items-center justify-between gap-2">
            <label className="text-sm flex-1">{p.name}</label>
            <input type="number" min={0} className="w-28 border rounded-lg px-2 py-1" placeholder="0" value={(produced as any)[p.id] ?? ""} onChange={e=>setProduced({ ...produced, [p.id]: Number(e.target.value || 0) })} />
          </div>
        ))}
        <button type="button" className="w-full mt-2 rounded-xl bg-emerald-600 text-white font-medium px-3 py-2 hover:bg-emerald-700" onClick={onProduce}>Descontar stock</button>
      </div>
      <div className="mt-4">
        <h3 className="font-semibold mb-2">Productos para coser</h3>
        <div className="space-y-2">
          {products.map(p=>(
            <div key={p.id} className="flex items-center gap-2">
              <div className="flex-1 text-sm">{p.name}: <b>{toSew[p.id]||0}</b></div>
              <input type="number" min={0} className="w-24 border rounded-lg px-2 py-1" placeholder="0" value={(dispatch as any)[p.id] ?? ""} onChange={e=>setDispatch({ ...dispatch, [p.id]: Number(e.target.value || 0) })} />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <button type="button" className="px-3 py-1.5 rounded-xl border" onClick={()=>setDispatch({})}>Limpiar</button>
          <button type="button" className="px-3 py-1.5 rounded-xl bg-slate-900 text-white" onClick={()=>onSendToSew(dispatch)}>Mandar a coser</button>
          <button type="button" className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white" onClick={onSendAllToSew}>Mandar todo</button>
        </div>
      </div>
    </div>

    <div className="lg:col-span-2 bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-2">Plan de Producción Diario</h2>
      <PlanEditor products={products} plan={plan} setPlan={setPlan} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="bg-slate-50 rounded-xl p-3">
          <h3 className="font-semibold mb-2">Consumo diario estimado</h3>
          <ul className="space-y-1 text-sm">
            <li>Acrilamida: <b>{dailyUsage.acrylamideKg.toFixed(2)} kg</b></li>
            <li>Glicerina: <b>{dailyUsage.glycerinKg.toFixed(2)} kg</b></li>
            <li>Agua destilada: <b>{dailyUsage.waterL.toFixed(2)} L</b></li>
            <li>1173: <b>{dailyUsage.photoinitiatorMl.toFixed(2)} mL</b></li>
            <li>Bisacrilamida: <b>{dailyUsage.bisG.toFixed(2)} g</b></li>
            <li className="mt-2">Tela gorro – nariz: <b>{dailyFabricUsage.telaGorroNariz}</b> unid.</li>
            <li>Tela gorro – detrás: <b>{dailyFabricUsage.telaGorroDetras}</b> unid.</li>
            <li>Tela rodillera M: <b>{dailyFabricUsage.telaRodilleraM}</b> unid.</li>
            <li>Tela rodillera XL: <b>{dailyFabricUsage.telaRodilleraXL}</b> unid.</li>
          </ul>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <h3 className="font-semibold mb-2">Días de runway (según plan)</h3>
          <div className="text-3xl font-bold">{fmtDays(runway.minDays)} días</div>
          {runway.minDays !== Infinity && (<div className="text-sm mt-1">Cuello de botella: <b>{{ acrylamideKg: "Acrilamida (kg)", glycerinKg: "Glicerina (kg)", waterL: "Agua destilada (L)", photoinitiatorMl: "Fotoiniciador 1173 (mL)", bisG: "Bisacrilamida (g)" }[runway.bottleneck as keyof typeof runway]}</b></div>)}
        </div>
      </div>
      <div className="bg-slate-50 rounded-xl p-3 mt-4">
        <h3 className="font-semibold mb-2">Días por materia prima</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          { (runway.daysPerMat as {key: keyof Inventory; days:number}[]).map(d=>(
            <div key={d.key} className="min-w-[220px] shrink-0 rounded-xl border p-3">
              <div className="font-medium">{({ acrylamideKg:"Acrilamida (kg)", glycerinKg:"Glicerina (kg)", waterL:"Agua destilada (L)", photoinitiatorMl:"Fotoiniciador 1173 (mL)", bisG:"Bisacrilamida (g)" } as any)[d.key]}</div>
              <div className="text-2xl font-bold">{fmtDays(d.days)} días</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-slate-50 rounded-xl p-3 mt-4">
        <h3 className="font-semibold mb-2">Días por producto (incluye telas)</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {productRunway.map(r=>(
            <div key={r.id} className="min-w-[220px] shrink-0 rounded-xl border p-3">
              <div className="font-medium">{r.name}</div>
              <div className="text-2xl font-bold">{fmtDays(r.days)} días</div>
              {r.days!==Infinity && <div className="text-xs mt-1">Cuello: <b>{r.bottleneck}</b></div>}
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="lg:col-span-3 bg-white rounded-2xl shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Producción por día</h2>
        <select className="border rounded-lg px-2 py-1" value={range} onChange={e=>setRange(e.target.value as any)}>
          <option value="semana">Semana</option>
          <option value="mes">Mes</option>
        </select>
      </div>
      <div className="w-full h-64">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" tickFormatter={(v)=>String(v).slice(5)} />
            <YAxis allowDecimals={false} />
            <Tooltip formatter={(v:any)=>[v, 'Unidades']} labelFormatter={(l:any)=>`Día ${l}`} />
            <Bar dataKey="total" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-sm">Total período: <b>{periodTotal}</b> unidades</div>
    </div>

    <div className="lg:col-span-3 bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-2">Detalle por hora</h2>
      <div className="flex items-center gap-2 mb-2">
        <input type="date" className="border rounded-lg px-2 py-1" value={selectedDay} onChange={e=>setSelectedDay((e.target as any).value)} />
      </div>
      <div className="w-full h-56">
        <ResponsiveContainer>
          <BarChart data={hourly} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis allowDecimals={false} />
            <Tooltip formatter={(v:any)=>[v, 'Unidades']} />
            <Bar dataKey="total" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </section>);
}

function SewingTab({ products, sewing, onRetire, onRetireAll }:{ products:Product[]; sewing:Record<string,number>; onRetire:(d:Record<string,number>)=>void; onRetireAll:()=>void }){
  const [dispatch, setDispatch] = useState<Record<string,number>>({});
  return (<section className="grid grid-cols-1 gap-6">
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-2">Productos en proceso de costura:</h2>
      <div className="space-y-2">
        {products.map(p=>(
          <div key={p.id} className="flex items-center gap-2">
            <div className="flex-1 text-sm">{p.name}: <b>{sewing[p.id]||0}</b></div>
            <input type="number" min={0} className="w-24 border rounded-lg px-2 py-1" placeholder="0" value={(dispatch as any)[p.id] ?? ""} onChange={e=>setDispatch({ ...dispatch, [p.id]: Number(e.target.value || 0) })} />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <button type="button" className="px-3 py-1.5 rounded-xl border" onClick={()=>setDispatch({})}>Limpiar</button>
        <button type="button" className="px-3 py-1.5 rounded-xl bg-slate-900 text-white" onClick={()=>onRetire(dispatch)}>Retirar</button>
        <button type="button" className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white" onClick={onRetireAll}>Retirar todo</button>
      </div>
    </div>
  </section>);
}

function ConfigTab(
  { products, setProducts, coeff, setCoeff, gelDensity, setGelDensity }:
  { products:Product[]; setProducts:(p:Product[])=>void; coeff:Coeff; setCoeff:(c:Coeff)=>void; gelDensity:number; setGelDensity:(n:number)=>void }
){
  const add = async () => {
    const id = `p_${Math.random().toString(36).slice(2,8)}`;
    const newP = { id, name: "Nuevo producto", weightG: 0, gelFraction: 1 };
    setProducts([...products, newP]);
    await dbInsertProduct({ id, name: newP.name, weight_g: newP.weightG, gel_fraction: newP.gelFraction });
  };
  return (
    <section className="grid grid-cols-1 gap-6">
      <div className="bg-white rounded-2xl shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Productos</h2>
          <button className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white" onClick={add}>Añadir</button>
        </div>
        <ProductEditor products={products} setProducts={setProducts} />
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-semibold mb-2">Fórmula (por kg de gel) y Parámetros</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumberField label="Acrilamida (kg/kg gel)" value={coeff.acrylamideKgPerKgGel} step={0.01} onChange={v=>setCoeff({ ...coeff, acrylamideKgPerKgGel: v })} />
          <NumberField label="Glicerina (kg/kg gel)" value={coeff.glycerinKgPerKgGel} step={0.01} onChange={v=>setCoeff({ ...coeff, glycerinKgPerKgGel: v })} />
          <NumberField label="Agua (L/kg gel)" value={coeff.waterLPerKgGel} step={0.01} onChange={v=>setCoeff({ ...coeff, waterLPerKgGel: v })} />
          <NumberField label="Fotoiniciador 1173 (mL/kg gel)" value={coeff.photoinitiatorMlPerKgGel} step={0.01} onChange={v=>setCoeff({ ...coeff, photoinitiatorMlPerKgGel: v })} />
          <NumberField label="Bisacrilamida (g/kg gel)" value={coeff.bisGPerKgGel} step={0.1} onChange={v=>setCoeff({ ...coeff, bisGPerKgGel: v })} />
          <NumberField label="Densidad del gel (kg/L)" value={gelDensity} step={0.01} onChange={v=>setGelDensity(v)} />
        </div>
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-sm">
            <thead><tr className="text-left border-b"><th className="py-2">Componente</th><th className="py-2">Por kg de gel</th><th className="py-2">Unidad</th></tr></thead>
            <tbody>
              <tr className="border-b"><td>Acrilamida</td><td>{coeff.acrylamideKgPerKgGel}</td><td>kg</td></tr>
              <tr className="border-b"><td>Glicerina</td><td>{coeff.glycerinKgPerKgGel}</td><td>kg</td></tr>
              <tr className="border-b"><td>Agua destilada</td><td>{coeff.waterLPerKgGel}</td><td>L</td></tr>
              <tr className="border-b"><td>Fotoiniciador 1173</td><td>{coeff.photoinitiatorMlPerKgGel}</td><td>mL</td></tr>
              <tr><td>Bisacrilamida</td><td>{coeff.bisGPerKgGel}</td><td>g</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function UsersTabSupabase() {
  const [rows, setRows] = useState<{ id: string; name: string; role: Role }[]>([]);
  useEffect(() => {
    (async ()=>{
      const { data, error } = await supabase.from("profiles").select("id,name,role");
      if (!error && data) setRows(data as any);
    })();
  }, []);
  return (
    <section className="grid grid-cols-1 gap-6">
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-semibold mb-2">Rangos / Empleados</h2>
        <div className="overflow-x-auto mt-2">
          <table className="min-w-full text-sm">
            <thead><tr className="text-left border-b"><th className="py-2">Nombre</th><th className="py-2">Rol</th></tr></thead>
            <tbody>
              {rows.map(u=>(
                <tr key={u.id} className="border-b"><td className="py-1">{u.name}</td><td>{u.role}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-slate-500 mt-2">Alta/roles: por ahora desde Supabase → Authentication + tabla profiles.</div>
      </div>
    </section>
  );
}

function Login({ onLogin }:{ onLogin:(email:string,password:string)=>void }){
  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  return (<div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="bg-white rounded-2xl shadow p-6 w-full max-w-sm">
      <div className="flex items-center gap-3 mb-4">
        <img src="/logo.png" alt="GÉLICA" className="h-8 w-auto" />
        <h1 className="text-xl font-bold">Iniciar sesión</h1>
      </div>
      <label className="text-sm block mb-2">Email
        <input className="mt-1 w-full border rounded-lg px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@gelica" />
      </label>
      <label className="text-sm block mb-4">Contraseña
        <input type="password" className="mt-1 w-full border rounded-lg px-3 py-2" value={password} onChange={e=>setPassword(e.target.value)} placeholder="admin" />
      </label>
      <button className="w-full px-3 py-2 rounded-xl bg-slate-900 text-white" onClick={()=>onLogin(email,password)}>Entrar</button>
    </div>
  </div>);
}

function ProductEditor({ products, setProducts }:{ products:Product[]; setProducts:(p:Product[])=>void }){
  const update = async (id:string, patch:Partial<Product>) => {
    setProducts(products.map(p => p.id === id ? { ...p, ...patch } : p));
    await dbUpdateProduct({
      id,
      ...(patch.name!==undefined ? { name: patch.name } : {}),
      ...(patch.weightG!==undefined ? { weight_g: patch.weightG } : {}),
      ...(patch.gelFraction!==undefined ? { gel_fraction: patch.gelFraction } : {}),
    });
  };
  const remove = async (id:string) => {
    setProducts(products.filter(p => p.id !== id));
    await dbDeleteProduct(id);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {products.map(p => (
        <div key={p.id} className="rounded-xl border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <input
              className="font-medium border rounded-lg px-2 py-1 w-full mr-2"
              value={p.name}
              onChange={e => update(p.id, { name: e.target.value })}
            />
            <button className="px-2 py-1 rounded-lg border text-xs" onClick={() => remove(p.id)}>Eliminar</button>
          </div>
          <NumberField label="Peso (g)" value={p.weightG as any} onChange={v => update(p.id, { weightG: v })} />
          <NumberField label="Fracción de gel (0-1)" value={p.gelFraction as any} step={0.05} onChange={v => update(p.id, { gelFraction: v })} />
        </div>
      ))}
    </div>
  );
}

function ComprasTab({
  products,
  usagePerUnit,
  prices,
  setPrices,
}: {
  products: Product[];
  usagePerUnit: (p: Product) => {
    acrylamideKg: number; glycerinKg: number; waterL: number; photoinitiatorMl: number; bisG: number;
  };
  prices: PriceConfig;
  setPrices: (p: PriceConfig) => void;
}) {
  const [unitsPerDay, setUnitsPerDay] = useState<Record<string, number>>(
    Object.fromEntries(products.map(p => [p.id, 0]))
  );
  const [days, setDays] = useState<number>(1);
  const totalProductos = useMemo(() => {
    return Object.values(unitsPerDay).reduce((s, n) => s + (Number(n)||0), 0) * (days || 0);
  }, [unitsPerDay, days]);

  const totals = useMemo(() => {
    let mat = { acrylamideKg: 0, glycerinKg: 0, waterL: 0, photoinitiatorMl: 0, bisG: 0 };
    let tela = { kgGorroTotal: 0, kgRodillera: 0 };

    for (const p of products) {
      const u = usagePerUnit(p);
      const qty = (unitsPerDay[p.id] || 0) * days;

      mat.acrylamideKg     += u.acrylamideKg * qty;
      mat.glycerinKg       += u.glycerinKg   * qty;
      mat.waterL           += u.waterL       * qty;
      mat.photoinitiatorMl += u.photoinitiatorMl * qty;
      mat.bisG             += u.bisG         * qty;

      if (p.id === "gorro") {
        // 11 gorros por kg (total, nariz+detrás)
        tela.kgGorroTotal += qty / 11;
      } else if (p.id === "rodilleraM" || p.id === "rodilleraXL") {
        // 17 rodilleras por kg (M y XL)
        tela.kgRodillera += qty / 17;
      }
    }

    return { mat, tela };
  }, [products, unitsPerDay, days, usagePerUnit]);

  const perProductCosts = useMemo(() => {
    const rate = prices.exchangeRate || 1;
    const list: {
      id: string; name: string; qty: number;
      unitUsd: number; unitArs: number;
      totalUsd: number; totalArs: number;
    }[] = [];

    for (const p of products) {
      const u = usagePerUnit(p);

      let unitUsd =
        u.acrylamideKg     * prices.acrylamideUsdPerKg +
        u.glycerinKg       * prices.glycerinUsdPerKg +
        u.waterL           * prices.waterUsdPerL +
        u.photoinitiatorMl * prices.photoinitiatorUsdPerMl +
        u.bisG             * prices.bisUsdPerG;

      if (p.id === "gorro") {
        unitUsd += (1 / 11) * prices.telaGorroUsdPerKg;      // tela gorro total (11 por kg)
      } else if (p.id === "rodilleraM" || p.id === "rodilleraXL") {
        unitUsd += (1 / 17) * prices.telaRodilleraUsdPerKg;  // 17 rodilleras por kg
      }

      const qty = (unitsPerDay[p.id] || 0) * (days || 0);
      const unitArs = unitUsd * rate;
      const totalUsd = unitUsd * qty;
      const totalArs = unitArs * qty;

      list.push({ id: p.id, name: p.name, qty, unitUsd, unitArs, totalUsd, totalArs });
    }
    return list;
  }, [products, unitsPerDay, days, prices, usagePerUnit]);

  const costs = useMemo(() => {
    const m = totals.mat;
    const t = totals.tela;

    const subtotalUsd =
      m.acrylamideKg     * prices.acrylamideUsdPerKg +
      m.glycerinKg       * prices.glycerinUsdPerKg +
      m.waterL           * prices.waterUsdPerL +
      m.photoinitiatorMl * prices.photoinitiatorUsdPerMl +
      m.bisG             * prices.bisUsdPerG +
      t.kgGorroTotal     * prices.telaGorroUsdPerKg +
      t.kgRodillera      * prices.telaRodilleraUsdPerKg;

    const ivaUsd = subtotalUsd * (prices.IVA ?? 0);
    const totalUsd = subtotalUsd + ivaUsd;

    const rate = prices.exchangeRate || 1;
    const subtotalArs = subtotalUsd * rate;
    const ivaArs = ivaUsd * rate;
    const totalArs = totalUsd * rate;

    return { subtotalUsd, ivaUsd, totalUsd, subtotalArs, ivaArs, totalArs };
  }, [totals, prices]);

  const setU = (id: string, v: number) => setUnitsPerDay({ ...unitsPerDay, [id]: v });

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Objetivo de producción para comprar</h2>
        <label className="text-sm block mb-3">
          Días
          <input
            type="number" min={1}
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={days}
            onChange={e=>setDays(Math.max(1, Number(e.target.value||1)))}
          />
        </label>
        <div className="space-y-2">
          {products.map(p=>(
            <label key={p.id} className="text-sm block">
              {p.name} — unidades por día
              <input
                type="number" min={0}
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={unitsPerDay[p.id] || 0}
                onChange={e=>setU(p.id, Number(e.target.value||0))}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Listado de compra (cantidades)</h2>
        <div className="mb-2 text-sm">
          Cantidad de productos: <b>{fmtInt(totalProductos)}</b>
        </div>
        <ul className="text-sm space-y-1">
          <li>Acrilamida: <b>{fmtInt(totals.mat.acrylamideKg)} kg</b></li>
          <li>Glicerina: <b>{fmtInt(totals.mat.glycerinKg)} kg</b></li>
          <li>Agua destilada: <b>{fmtInt(totals.mat.waterL)} L</b></li>
          <li>1173: <b>{fmtInt(totals.mat.photoinitiatorMl)} mL</b></li>
          <li>Bisacrilamida: <b>{fmtInt(totals.mat.bisG)} g</b></li>
          <li className="mt-2">Tela gorro (total): <b>{fmtInt(totals.tela.kgGorroTotal)} kg</b></li>
          <li>Tela rodilleras (M/XL): <b>{fmtInt(totals.tela.kgRodillera)} kg</b></li>
        </ul>

        <div className="mt-4 p-3 rounded-xl bg-slate-50 space-y-1">
          <div>Subtotal: <b>US$ {fmtMoney(costs.subtotalUsd)}</b> — ARS <b>{fmtMoney(costs.subtotalArs)}</b></div>
          <div>IVA ({Math.round((prices.IVA ?? 0)*100)}%): <b>US$ {fmtMoney(costs.ivaUsd)}</b> — ARS <b>{fmtMoney(costs.ivaArs)}</b></div>
          <div className="text-lg font-bold mt-1">Total: US$ {fmtMoney(costs.totalUsd)} — ARS {fmtMoney(costs.totalArs)}</div>
        </div>

        <div className="mt-4">
          <h3 className="font-semibold mb-2">Precio por producto</h3>
          <ul className="text-sm space-y-1">
            {perProductCosts.map(c => (
              <li key={c.id} className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span>{c.name} — {fmtInt(c.qty)} u.</span>
                <span>
                  Unit: US$ {fmtMoney(c.unitUsd)} — ARS {fmtMoney(c.unitArs)} ·
                  Total: US$ {fmtMoney(c.totalUsd)} — ARS {fmtMoney(c.totalArs)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Precios (editables)</h2>
        <div className="grid grid-cols-1 gap-2">
          <NumberField label="Acrilamida (US$/kg)" value={prices.acrylamideUsdPerKg} onChange={v=>setPrices({ ...prices, acrylamideUsdPerKg: v })} />
          <NumberField label="Glicerina (US$/kg)"  value={prices.glycerinUsdPerKg}  onChange={v=>setPrices({ ...prices, glycerinUsdPerKg: v })} />
          <NumberField label="Agua destilada (US$/L)" value={prices.waterUsdPerL} onChange={v=>setPrices({ ...prices, waterUsdPerL: v })} />
          <NumberField label="1173 (US$/mL)" value={prices.photoinitiatorUsdPerMl} onChange={v=>setPrices({ ...prices, photoinitiatorUsdPerMl: v })} />
          <NumberField label="Bisacrilamida (US$/g)" value={prices.bisUsdPerG} onChange={v=>setPrices({ ...prices, bisUsdPerG: v })} />
          <NumberField label="Tela gorro total (US$/kg)" value={prices.telaGorroUsdPerKg} onChange={v=>setPrices({ ...prices, telaGorroUsdPerKg: v })} />
          <NumberField label="Tela rodilleras (US$/kg)" value={prices.telaRodilleraUsdPerKg} onChange={v=>setPrices({ ...prices, telaRodilleraUsdPerKg: v })} />
          <NumberField label="IVA (ej. 0.21 = 21%)" value={prices.IVA} step={0.01} onChange={v=>setPrices({ ...prices, IVA: v })} />
          <NumberField label="Tipo de cambio venta (ARS/USD)" value={prices.exchangeRate} onChange={v=>setPrices({ ...prices, exchangeRate: v })} />
          <div className="text-xs text-slate-500">Los costos se muestran en dólares y en pesos usando este tipo de cambio.</div>
        </div>
      </div>
    </section>
  );
}

function NumberField({ label, value, onChange, step=0.001 }:{ label:string; value:number|undefined; onChange:(v:number)=>void; step?:number }){
  return (<label className="text-sm block">{label}
    <input type="number" step={step} value={value ?? ""} onChange={e=>onChange(parseFloat(e.target.value || "0"))} className="mt-1 w-full border rounded-lg px-3 py-2" />
  </label>);
}
