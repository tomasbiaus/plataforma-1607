# Plataforma 1607

Herramienta interna del estudio + portal de clientes. Un solo login: cada uno ve lo que le corresponde.

- **Tomás (admin):** todo, incluido Números (con su propia contraseña).
- **Equipo (Matías, Camila):** proyectos, tareas, entregables. No ve Números ni las tareas privadas.
- **Clientes:** solo su proyecto, la etapa y los entregables que se les enviaron. Pueden aprobar o pedir cambios.

Stack: React + Vite (front), Supabase (base de datos, login y archivos), Vercel (hosting).

---

## Puesta en marcha (una sola vez, ~20 minutos)

### 1. Supabase
1. Entrá a [supabase.com](https://supabase.com) → **New project**. Región: São Paulo. Guardá la contraseña de la base.
2. **SQL Editor** → New query → pegá todo `supabase/migrations/001_plataforma.sql` → **Run**.
3. **Authentication → Sign In / Providers → Email**: dejá Email activado y **desactivá "Allow new users to sign up"**. Así nadie puede crearse una cuenta solo: los accesos los das vos.
4. **Project Settings → API**: copiá
   - `Project URL`
   - `anon public` key
   - `service_role` key (**secreta**: nunca va en el código ni en el navegador)

### 2. Cargar el equipo y los datos
**Sin terminal:** en Authentication → Users → Add user → Create new user, creá los 3 usuarios del equipo (con "Auto Confirm User" tildado). Después pegá `supabase/seed_datos.sql` en el SQL Editor y corré.

**Con terminal** (alternativa), dentro de esta carpeta:
```bash
cp .env.example .env      # y completá las 3 variables
npm install
npm run setup
```
Crea los usuarios de Tomás, Matías y Camila, carga clientes, proyectos, cuotas, pagos al equipo y las tareas que estaban en Notion. Al final imprime las contraseñas iniciales.

### 3. GitHub + Vercel
1. Subí esta carpeta a un repo **privado** de GitHub (el `.env` no se sube, ya está en `.gitignore`).
2. En [vercel.com](https://vercel.com) → **Add New → Project** → elegí el repo. Framework: Vite (lo detecta solo).
3. **Environment Variables**:
   | Nombre | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | Project URL |
   | `VITE_SUPABASE_ANON_KEY` | anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
4. **Deploy**. Opcional: en Domains agregá `app.1607.studio` (o el que quieras).
5. En Supabase → **Authentication → URL Configuration**, poné la URL de Vercel como *Site URL*.

### 4. Primer ingreso
- Entrá con tu email y la contraseña que imprimió el setup.
- **Números** te pide crear tu contraseña la primera vez. Después solo te la pide para abrir (se cierra a los 5 min sin uso, y se bloquea 15 min después de 5 intentos fallidos).
- **Clientes → Crear acceso**: generás usuario y contraseña para cada cliente y copiás el mensaje para mandárselo.

---

## Cómo funciona por dentro

- **Seguridad:** las reglas viven en la base (Row Level Security), no en la pantalla. Aunque alguien tocara el código del navegador, un cliente no puede leer otro proyecto, ni el equipo ver los números.
- **Números:** la contraseña se guarda encriptada (bcrypt) y la sesión la controla el servidor.
- **Archivos:** bucket privado `entregas`. Los links de descarga son temporales (firmados).
- **Automatizaciones** (se prenden/apagan desde el estudio):
  - Cliente aprueba un concepto → el proyecto pasa a Diseño, se archiva el otro concepto, se crea la tarea de diseño y la tarea privada "Cobrar segunda cuota".
  - Cliente pide cambios → tarea urgente para el diseñador.
  - Se completa una etapa → avanza sola.
  - Llega a Entrega → tarea privada "Cobrar saldo".

## Desarrollo local
```bash
npm run dev      # http://localhost:5173 (usa el .env)
npm run build    # chequeo de tipos + build
```

## Archivos clave
| Archivo | Qué es |
|---|---|
| `supabase/migrations/001_plataforma.sql` | Toda la base: tablas, permisos, automatizaciones, Números |
| `scripts/setup.mjs` | Carga inicial del equipo y los datos reales |
| `api/invitar.ts` | Crea accesos de clientes (corre en Vercel con la service key) |
| `src/store.tsx` | Conexión entre la pantalla y Supabase |
| `src/Studio.tsx`, `src/Proyectos.tsx` | Vista del estudio |
| `src/ClientPortal.tsx` | Portal del cliente |
| `src/Numeros.tsx`, `src/PagosEquipo.tsx`, `src/PlanAnual.tsx` | Finanzas (solo Tomás) |
