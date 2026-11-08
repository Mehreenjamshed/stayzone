// Combines all migrations into ONE file you can paste into the Supabase SQL Editor.
// Output: supabase/bundle/all_migrations.sql
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
const dir = "supabase/migrations";
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
mkdirSync("supabase/bundle", { recursive: true });
const out = files.map((f) => `-- ===== ${f} =====\n${readFileSync(join(dir, f), "utf8")}`).join("\n\n");
writeFileSync("supabase/bundle/all_migrations.sql", out);
console.log(`Bundled ${files.length} migrations → supabase/bundle/all_migrations.sql`);
