import { getClient, getDeployer, fmtGen, read } from "./genlayer-node.mjs";
const account = getDeployer();
const client = getClient(account);
const addr = process.argv[2];

console.log("credit:", fmtGen(await read(client, addr, "get_credit", [account.address])));
console.log("escrow:", fmtGen(await client.getBalance({ address: addr })));

// What does a simulation say about this call, including emitted messages?
try {
  const sim = await client.simulateWriteContract({
    address: addr, functionName: "withdraw", args: [], includeReceipt: true,
  });
  console.log("SIM:", JSON.stringify(sim, (k, v) => (typeof v === "bigint" ? v.toString() : v)).slice(0, 2500));
} catch (e) {
  console.log("SIM ERR:", String(e.message).replace(/\s+/g, " ").slice(0, 600));
}
