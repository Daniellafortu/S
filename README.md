# MotoPark

Sistema web para administrar un parqueadero de motos. Incluye registro de entradas y salidas, pagos, cuidadores, tarifa por hora, cierre de caja, reportes y exportación a Excel.

## Requisitos

- Node.js 22.
- PostgreSQL y una base de datos disponible.
- npm.

## Configuración local

1. Instala las dependencias con `npm install`.
2. Copia `.env.example` a un archivo llamado `.env` y configura `DATABASE_URL` con la conexión de tu base PostgreSQL.
3. Si deseas elegir las credenciales del primer administrador, configura `PARK_ADMIN_USER` y `PARK_ADMIN_PASSWORD` en `.env`. Usa una contraseña propia de al menos 8 caracteres; se recomiendan 12 o más.
4. Para una base nueva y vacía, crea las tablas con `node scripts/migrate.cjs`.
5. Inicia la aplicación con `npm run dev` y abre `http://localhost:3000`.

Si no se configuraron credenciales en una instalación local nueva, el primer acceso es `admin` / `Admin123!`. Cambia esa contraseña desde el perfil. Para una base externa en producción se requieren credenciales propias.

Las credenciales del entorno crean el administrador cuando la base está vacía. Si una cuenta aún conserva la contraseña inicial local, puede sustituirse una sola vez por la contraseña configurada; una contraseña personalizada no se sobrescribe al cambiar variables.

**Importante:** si ya tienes una base con datos, haz una copia antes de modificar su esquema. No ejecutes la migración inicial sobre tablas existentes sin preparar el historial de migraciones. Para desarrollo local también se puede utilizar `npx drizzle-kit push`.

## Funciones principales

- El administrador crea y desactiva cuidadores, cambia el nombre del parqueadero y configura la tarifa.
- Los cuidadores registran entradas, agregan comentarios y confirman salidas y pagos.
- El cobro usa la tarifa vigente al salir; una fracción se cobra como hora completa y el mínimo es una hora.
- El administrador consulta el día, realiza cierres auditados, revisa el historial y exporta el reporte mensual a Excel.
- Sin una sesión válida solo se muestra el inicio de sesión. Las horas de operación utilizan la zona `America/Bogota`.

## Respaldos

Mientras el servidor Node esté activo, se guarda una instantánea JSON diaria en `backups/` o en la carpeta indicada por `BACKUP_DIR`, con retención de 30 copias. El administrador también puede descargar una copia desde **Respaldos**. Mantén las copias en un lugar privado y conserva otra copia externa.

Para complementar el respaldo automático puedes programar `scripts/backup.sh` en el servidor; usa `pg_dump` y requiere `DATABASE_URL`. Un archivo `.dump` se restaura con `pg_restore`. Las instantáneas JSON contienen datos de negocio, pero no sesiones temporales.
