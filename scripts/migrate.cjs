// Applies versioned migrations before a new deployment starts serving traffic.
require("dotenv").config({ quiet: true });
const { Pool } = require("pg");
const { drizzle } = require("drizzle-orm/node-postgres");
const { migrate } = require("drizzle-orm/node-postgres/migrator");
const path = require("node:path");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL es obligatoria para ejecutar las migraciones.");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
(async () => {
  try {
    await migrate(drizzle(pool), { migrationsFolder: path.join(process.cwd(), "drizzle") });
    console.log("Migraciones de MotoPark aplicadas correctamente.");
  } catch (error) {
    console.error("No fue posible aplicar las migraciones:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
