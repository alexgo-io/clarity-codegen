#!/usr/bin/env node
import yargs from "yargs/yargs";
import { generateContracts } from "./index";

(async () => {
  const argv = await yargs(process.argv.slice(2)).options({
    apiHost: { type: "string", demandOption: true },
    principal: { type: "string", demandOption: true },
    contracts: {
      type: "array",
      demandOption: true,
      string: true,
      required: true,
    },
    output: { type: "string", demandOption: true },
    name: { type: "string" },
  }).argv;

  await generateContracts(
    argv.apiHost,
    argv.principal,
    argv.contracts,
    argv.output,
    argv.name ?? "Alex"
  );
})();
