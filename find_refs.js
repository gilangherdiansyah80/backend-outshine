const { sql } = require("./src/config/database");
const fs = require("fs");

async function findReferencingTables() {
  try {
    const references = await sql`
      SELECT
          conname AS constraint_name,
          relname AS table_name,
          confrelid::regclass AS referenced_table,
          confupdtype AS on_update,
          confdeltype AS on_delete
      FROM
          pg_constraint
      JOIN
          pg_class ON pg_class.oid = pg_constraint.conrelid
      WHERE
          contype = 'f' AND confrelid = 'public.users'::regclass;
    `;
    const result = {};
    const rules = {
      a: "NO ACTION",
      r: "RESTRICT",
      c: "CASCADE",
      n: "SET NULL",
      d: "SET DEFAULT",
    };
    references.forEach((r) => {
      result[r.table_name] = rules[r.on_delete] || r.on_delete;
    });
    fs.writeFileSync("results.json", JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findReferencingTables();
