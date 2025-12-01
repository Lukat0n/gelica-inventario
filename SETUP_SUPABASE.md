# 📋 Guía de Configuración - Gelica Inventario con Supabase

## 🚀 Pasos para Configurar Supabase

### 1. Crear el Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto:
   - **Nombre**: gelica-inventario
   - **Database Password**: Guarda esta contraseña de forma segura
   - **Region**: Selecciona la más cercana (ej: South America - São Paulo)

### 2. Ejecutar el Schema SQL

1. En tu proyecto de Supabase, ve a **SQL Editor** (menú lateral izquierdo)
2. Haz clic en **New Query**
3. Copia todo el contenido del archivo `supabase-schema.sql`
4. Pega el contenido en el editor
5. Haz clic en **Run** o presiona `Ctrl+Enter`
6. Verifica que no haya errores y que todas las tablas se hayan creado

### 3. Habilitar Autenticación por Email

1. Ve a **Authentication > Providers** en el menú lateral
2. Asegúrate de que **Email** esté habilitado
3. En **Authentication > URL Configuration**:
   - **Site URL**: `https://gelica-logistica.vercel.app`
   - **Redirect URLs**: Agrega `https://gelica-logistica.vercel.app`

### 4. Configurar Variables de Entorno

#### Para Desarrollo Local:

1. Crea un archivo `.env` en la raíz del proyecto (copia de `.env.example`)
2. En Supabase, ve a **Settings > API**
3. Copia los valores:
   - **URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: La clave pública (anon key)
4. Pega en tu archivo `.env`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

#### Para Vercel (Producción):

1. Ve a tu proyecto en [Vercel](https://vercel.com)
2. Ve a **Settings > Environment Variables**
3. Agrega las siguientes variables:
   - `VITE_SUPABASE_URL` → El URL de tu proyecto Supabase
   - `VITE_SUPABASE_ANON_KEY` → Tu anon key de Supabase
4. Haz clic en **Save**
5. Ve a **Deployments** y haz clic en **Redeploy** para aplicar los cambios

### 5. Crear el Primer Usuario

Hay dos opciones:

#### Opción A: Desde la aplicación (Recomendado)
1. Abre tu aplicación en `https://gelica-logistica.vercel.app`
2. Haz clic en "Sign Up" o "Registrarse"
3. Ingresa email y contraseña
4. Verifica tu email (revisa spam si no llega)
5. Inicia sesión

#### Opción B: Desde Supabase Dashboard
1. Ve a **Authentication > Users** en Supabase
2. Haz clic en **Add user** > **Create new user**
3. Ingresa email y contraseña
4. Marca **Auto Confirm User**
5. Haz clic en **Create user**

### 6. Asignar Rol de Administrador

Después de crear el primer usuario:

1. Ve a **Table Editor > profiles** en Supabase
2. Encuentra el usuario recién creado
3. Cambia el campo `role` de `EMPLEADO` a `CEO` o `ADMIN`
4. Guarda los cambios

## 🔍 Verificación

### Tablas Creadas

Verifica que existan estas tablas en **Table Editor**:

- ✅ `profiles` - Perfiles de usuarios
- ✅ `products` - Productos (Gorro, Rodilleras)
- ✅ `inventory` - Inventario de materias primas
- ✅ `fabric_inventory` - Inventario de telas
- ✅ `plan` - Plan de producción diario
- ✅ `config` - Coeficientes de producción
- ✅ `prices` - Precios de materiales
- ✅ `to_sew` - Productos pendientes de coser
- ✅ `sewing` - Productos en costura
- ✅ `production_logs` - Registro de producción
- ✅ `users` (opcional) - Usuarios legacy

### Datos Iniciales

Verifica que existan estos registros:

**Tabla `products`**:
- gorro - Gorro Migraña (800g)
- rodilleraXL - Rodillera XL (700g)
- rodilleraM - Rodillera M (500g)

**Tabla `inventory`**:
- ID 1 con todos los campos en 0

**Tabla `fabric_inventory`**:
- ID 1 con todos los campos en 0

**Tabla `config`**:
- ID 1 con coeficientes por defecto

**Tabla `prices`**:
- ID 1 con precios en 0

## 🧪 Pruebas

1. **Login**: Inicia sesión con tu usuario
2. **Ver Producción**: Deberías ver la pestaña "Producción"
3. **Agregar Stock**: Prueba agregar inventario
4. **Plan de Producción**: Configura unidades por día
5. **Logs**: Produce algunas unidades y verifica los logs

## 🔐 Roles y Permisos

### EMPLEADO (por defecto)
- ✅ Ver y modificar Producción
- ✅ Ver y modificar Stock
- ✅ Ver y modificar Costura
- ✅ Ver Compras
- ❌ Configuración
- ❌ Gestión de Empleados

### CEO
- ✅ Todo lo de EMPLEADO
- ✅ Configuración (coeficientes, precios)
- ❌ Gestión de Empleados

### ADMIN
- ✅ Gestión de Empleados
- ✅ Ver todos los usuarios
- ✅ Asignar roles

## 🐛 Solución de Problemas

### "Invalid API Key"
- Verifica que las variables de entorno estén correctas
- Asegúrate de usar la **anon key** (no la service_role key)

### "Row Level Security" Errors
- Asegúrate de estar autenticado
- Verifica que el usuario tenga el rol correcto en la tabla `profiles`

### No se cargan los datos
- Abre la consola del navegador (F12)
- Ve a la pestaña Network y busca errores
- Verifica que las tablas tengan datos iniciales

### Errores en Vercel
- Ve a Vercel > tu proyecto > Deployments > Click en el último deployment
- Ve a la pestaña **Build Logs** y **Function Logs** para ver errores
- Verifica que las variables de entorno estén configuradas

## 📱 Comandos Útiles

### Desarrollo Local
```bash
npm install
npm run dev
```

### Build
```bash
npm run build
npm run preview
```

### Deploy a Vercel
```bash
# Automático al hacer push a main en GitHub
git add .
git commit -m "Configuración de Supabase"
git push origin main
```

## 🔄 Migración de Datos

Si tienes datos en localStorage que quieres migrar:

1. Abre la consola del navegador (F12)
2. Ve a Application > Local Storage
3. Copia los datos que necesites
4. Inserta manualmente en Supabase usando SQL Editor o Table Editor

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Vercel
2. Revisa los logs en Supabase (Logs & Analytics)
3. Verifica la consola del navegador
4. Asegúrate de que todas las variables de entorno estén configuradas

## ✅ Checklist de Configuración

- [ ] Proyecto creado en Supabase
- [ ] Schema SQL ejecutado sin errores
- [ ] Variables de entorno configuradas localmente
- [ ] Variables de entorno configuradas en Vercel
- [ ] Primer usuario creado
- [ ] Rol de administrador asignado
- [ ] Aplicación deployada en Vercel
- [ ] Login funciona correctamente
- [ ] Datos se guardan en Supabase
- [ ] Todos los módulos funcionan (Producción, Stock, Costura, Config)

¡Listo! Tu aplicación ahora está completamente integrada con Supabase. 🎉
