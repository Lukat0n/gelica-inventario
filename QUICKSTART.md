# 🚀 Quick Start - GÉLICA Inventario

## Setup Rápido (5 minutos)

### 1️⃣ Supabase (2 min)
```bash
# 1. Ve a https://supabase.com y crea un proyecto
# 2. Ve a SQL Editor y ejecuta todo el contenido de: supabase-schema.sql
# 3. Ve a Settings > API y copia:
#    - Project URL
#    - anon/public key
```

### 2️⃣ Variables de Entorno (1 min)
```bash
# Crea archivo .env en la raíz:
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### 3️⃣ Instalar y Ejecutar (2 min)
```bash
npm install
npm run dev
```

### 4️⃣ Primer Usuario
1. Abre http://localhost:5173
2. Crea una cuenta con email y contraseña
3. Ve a Supabase > Table Editor > profiles
4. Cambia el rol a `CEO` o `ADMIN`

## 🎯 Para Vercel

1. Settings > Environment Variables
2. Agrega las mismas 2 variables
3. Redeploy

## ✅ Listo!
Tu app está funcionando con Supabase 🎉

**Documentación completa**: [SETUP_SUPABASE.md](SETUP_SUPABASE.md)
