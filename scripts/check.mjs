// Compile the contract inside GenVM and print its public schema.
// Catches syntax errors, bad SDK usage and a wrong runner before spending a tx.
import { readFileSync } from "node:fs";
import path from "node:path";
import { getClient, getDeployer } from "./genlayer-node.mjs";

const file = process.argv[2] ?? "contracts/knockoff_bounty.py";
const client = getClient(getDeployer());
const code = new Uint8Array(readFileSync(path.resolve(process.cwd(), file)));

try {
  const schema = await client.getContractSchemaForCode(code);
  const methods = schema?.methods ?? schema;
  console.log(`✔ ${file} compiles on GenVM`);
  console.log(`  ctor: ${JSON.stringify(schema?.ctor ?? {})}`);
  for (const [name, def] of Object.entries(methods)) {
    const kind = def.readonly ? "view " : def.payable ? "write payable" : "write";
    const params = (def.params ?? []).map((p) => (Array.isArray(p) ? `${p[0]}: ${p[1]}` : String(p))).join(", ");
    console.log(`  ${kind.padEnd(13)} ${name}(${params}) -> ${def.ret ?? "?"}`);
  }
} catch (e) {
  const msg = String(e.message);
  const tb = msg.match(/'stderr': '([\s\S]*?)', 'genvm_log'/);
  console.error(`✖ ${file} failed to compile`);
  console.error(tb ? tb[1].replace(/\n/g, "\n") : msg.slice(0, 1500));
  process.exit(1);
}
