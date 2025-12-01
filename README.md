# 🏭 GÉLICA - Sistema de Inventario y Producción

Sistema de gestión de inventario, producción y costura para productos de gel terapéutico (Gorros de Migraña y Rodilleras).

## 🚀 Características

- ✅ **Gestión de Inventario**: Control de materias primas (acrilamida, glicerina, agua, fotoiniciador, bisacrilamida) y telas
- ✅ **Plan de Producción**: Planificación diaria de unidades a producir por producto
- ✅ **Registro de Producción**: Descuento automático de stock al producir
- ✅ **Gestión de Costura**: Seguimiento de productos pendientes de coser y en proceso
- ✅ **Cálculo de Compras**: Estimación de cantidades y costos para comprar materiales
- ✅ **Dashboard con Gráficos**: Visualización de producción diaria, semanal y mensual
- ✅ **Runway de Materiales**: Días restantes de stock según plan de producción
- ✅ **Roles de Usuario**: ADMIN, CEO, EMPLEADO con permisos diferenciados
- ✅ **Autenticación**: Sistema de login con Supabase Auth
- ✅ **Base de Datos**: Almacenamiento en Supabase (PostgreSQL)

## 📋 Prerequisitos

- Node.js 18 o superior
- Cuenta en [Supabase](https://supabase.com) (gratuita)
- Cuenta en [Vercel](https://vercel.com) para deployment (opcional)

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/gelica-inventario.git
cd gelica-inventario
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Supabase

Sigue la guía completa en **[SETUP_SUPABASE.md](SETUP_SUPABASE.md)** para:
- Crear el proyecto en Supabase
- Ejecutar el schema SQL (`supabase-schema.sql`)
- Configurar autenticación
- Obtener las credenciales

### 4. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 🏗️ Build y Deploy

### Build local

```bash
npm run build
npm run preview
```

### Deploy en Vercel

1. Conecta tu repositorio de GitHub a Vercel
2. Configura las variables de entorno en Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Vercel hará deploy automáticamente en cada push a `main`

Tu app está deployada en: **[https://gelica-logistica.vercel.app](https://gelica-logistica.vercel.app)**

## 👥 Roles y Permisos

### EMPLEADO (por defecto)
- Ver y gestionar Producción
- Ver y actualizar Stock
- Ver y gestionar Costura
- Ver Compras

### CEO
- Todo lo de EMPLEADO
- Acceso a Configuración (fórmulas, precios)

### ADMIN
- Acceso a gestión de empleados y roles

## 📊 Uso de la Aplicación

### Módulo Producción
1. Registra las unidades producidas por producto
2. El sistema descuenta automáticamente materias primas y telas
3. Los productos pasan a "Pendientes de coser"
4. Visualiza estadísticas y gráficos de producción

### Módulo Stock
1. Agrega nuevas compras de materiales
2. Edita stock directamente para correcciones
3. Visualiza el runway (días restantes) de cada material

### Módulo Costura
1. Envía productos a coser desde Producción
2. Retira productos terminados
3. Visualiza productos en proceso de costura

### Módulo Compras
1. Ingresa un plan de producción (unidades/día x días)
2. Obtén el listado de compra con cantidades exactas
3. Ve el costo estimado en USD y ARS
4. Actualiza precios de materiales y tipo de cambio

### Módulo Configuración
1. Gestiona productos (agregar, editar, eliminar)
2. Configura fórmula de producción (coeficientes por kg de gel)
3. Solo accesible para CEO y ADMIN

## 🗄️ Estructura de la Base de Datos

### Tablas principales:
- `profiles` - Perfiles de usuarios con roles
- `products` - Productos (Gorro, Rodilleras)
- `inventory` - Stock de materias primas
- `fabric_inventory` - Stock de telas
- `plan` - Plan de producción diario por producto
- `config` - Coeficientes de producción
- `prices` - Precios de materiales
- `to_sew` - Productos pendientes de coser
- `sewing` - Productos en costura
- `production_logs` - Registro histórico de producción

Ver el schema completo en `supabase-schema.sql`

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Build**: Vite
- **Deploy**: Vercel

## 📝 Scripts

```bash
npm run dev      # Desarrollo local
npm run build    # Build de producción
npm run preview  # Preview del build
```

## 🐛 Troubleshooting

### No se conecta a Supabase
- Verifica que las variables de entorno estén correctas
- Asegúrate de usar la **anon key**, no la service_role key
- Revisa que el schema SQL se haya ejecutado sin errores

### Errores de permisos (RLS)
- Verifica que el usuario tenga un perfil en la tabla `profiles`
- Asegúrate de estar autenticado
- Revisa que el rol del usuario sea el correcto

### La aplicación no carga datos
- Abre la consola del navegador (F12) y revisa errores
- Verifica que las tablas tengan los datos iniciales (productos, config, etc.)
- Revisa los logs en Supabase Dashboard

## 📞 Soporte

Para problemas o consultas:
1. Revisa la guía [SETUP_SUPABASE.md](SETUP_SUPABASE.md)
2. Verifica los logs en Vercel y Supabase
3. Revisa la consola del navegador para errores de JavaScript

## 📄 Licencia

Privado - Uso interno de GÉLICA

---

Desarrollado con ❤️ para optimizar la producción de GÉLICA
