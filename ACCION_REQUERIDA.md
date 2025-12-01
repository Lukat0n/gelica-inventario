# ✅ CHECKLIST FINAL - Tu Proyecto GÉLICA

## 🎯 Estado Actual

✅ **Código**: 100% listo y migrado a Supabase
✅ **Variables de Entorno**: Ya configuradas en `.env`
✅ **Supabase URL**: `https://ibqbfbnichnuiupzaufr.supabase.co`
✅ **Archivos Creados**:
  - `supabase-schema.sql` - Schema de la base de datos
  - `SETUP_SUPABASE.md` - Guía completa de configuración
  - `QUICKSTART.md` - Guía rápida
  - `README.md` - Documentación completa
  - `.env.example` - Plantilla de variables

## 🚨 ACCIÓN REQUERIDA

### ⚠️ PASO CRÍTICO: Ejecutar Schema en Supabase

**IMPORTANTE**: Necesitas ejecutar el schema SQL una sola vez en Supabase para crear todas las tablas.

#### Instrucciones:

1. **Abre Supabase**
   - Ve a: https://supabase.com/dashboard/project/ibqbfbnichnuiupzaufr

2. **SQL Editor**
   - Haz clic en "SQL Editor" en el menú lateral izquierdo
   - Haz clic en "New Query"

3. **Ejecutar Schema**
   - Abre el archivo `supabase-schema.sql` en VS Code
   - Copia TODO el contenido (Ctrl+A, Ctrl+C)
   - Pega en el SQL Editor de Supabase
   - Haz clic en "Run" o presiona Ctrl+Enter

4. **Verificar**
   - Ve a "Table Editor" en Supabase
   - Deberías ver estas tablas:
     ✅ profiles
     ✅ products (con 3 productos por defecto)
     ✅ inventory
     ✅ fabric_inventory
     ✅ plan
     ✅ config
     ✅ prices
     ✅ to_sew
     ✅ sewing
     ✅ production_logs
     ✅ users

## 🔄 Después de Ejecutar el Schema

### Probar Localmente

```bash
# En la terminal:
npm run dev
```

1. Abre http://localhost:5173
2. Deberías ver la pantalla de login
3. Haz clic en "Sign Up" (si existe) o contacta al admin

### Crear Primer Usuario

**Opción A: Desde la App**
- Si tienes botón de registro, úsalo

**Opción B: Desde Supabase** (Recomendado para el primer admin)
1. Ve a Supabase > Authentication > Users
2. Haz clic en "Add user" > "Create new user"
3. Email: `admin@gelica.com` (o el que prefieras)
4. Password: Crea una contraseña segura
5. Marca "Auto Confirm User"
6. Haz clic en "Create user"

### Asignar Rol de Administrador

1. Ve a Supabase > Table Editor > profiles
2. Busca el usuario que acabas de crear
3. Haz clic en el campo `role`
4. Cambia de `EMPLEADO` a `CEO` o `ADMIN`
5. Guarda los cambios

## 📱 Deploy en Vercel

### Si ya está deployado (gelica-logistica.vercel.app)

1. Ve a: https://vercel.com (tu proyecto)
2. Settings > Environment Variables
3. Verifica que existan:
   - `VITE_SUPABASE_URL` = `https://ibqbfbnichnuiupzaufr.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (tu key del .env)
4. Si no existen, agrégalas
5. Ve a Deployments > Redeploy (último deployment)

## ✅ Testing Final

### Checklist de Pruebas

- [ ] Schema SQL ejecutado sin errores
- [ ] Tablas creadas en Supabase
- [ ] Productos por defecto visibles en tabla `products`
- [ ] Usuario admin creado
- [ ] Rol asignado correctamente
- [ ] `npm run dev` funciona localmente
- [ ] Puedes hacer login
- [ ] Ves las pestañas según tu rol
- [ ] Puedes agregar stock
- [ ] Puedes registrar producción
- [ ] Los datos se guardan (refresca la página y verifica)
- [ ] Variables configuradas en Vercel
- [ ] Deploy en Vercel exitoso
- [ ] Login funciona en producción

## 🎉 ¡Listo!

Una vez completado el checklist, tu aplicación estará 100% funcional con Supabase.

**URLs Importantes:**
- 🏠 Local: http://localhost:5173
- 🌐 Producción: https://gelica-logistica.vercel.app
- 🗄️ Supabase Dashboard: https://supabase.com/dashboard/project/ibqbfbnichnuiupzaufr

## 🆘 ¿Problemas?

### No puedo ejecutar el schema
- Revisa que estés logueado en Supabase
- Asegúrate de estar en el proyecto correcto
- Verifica que el SQL Editor esté vacío antes de pegar

### Error "relation does not exist"
- Significa que las tablas no se crearon
- Ejecuta el schema SQL completo nuevamente

### No aparecen los productos por defecto
- Ve a Table Editor > products
- Si está vacía, ejecuta solo la parte del schema que inserta productos:
```sql
INSERT INTO products (id, name, weight_g, gel_fraction) VALUES
  ('gorro', 'Gorro Migraña', 800, 1.0),
  ('rodilleraXL', 'Rodillera XL', 700, 1.0),
  ('rodilleraM', 'Rodillera M', 500, 1.0)
ON CONFLICT (id) DO NOTHING;
```

### Variables de entorno en Vercel
- DEBEN empezar con `VITE_`
- Vercel requiere un redeploy después de cambiar variables

---

📧 **Contacto**: Si necesitas ayuda, revisa la documentación completa en `SETUP_SUPABASE.md`
