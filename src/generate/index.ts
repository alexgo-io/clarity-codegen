import { YBatch } from "yqueue";
import {
  contractGenerator,
  generateContractFromAbi,
} from "./contractsGenerator";

export async function generateContracts(
  apiHost: string | ((contract: string) => string),
  principal: string | ((contract: string) => string),
  contracts: string[],
  outputDir: string,
  projectName: string,
  runtimePackagePath: string = "clarity-codegen",
  contractOverwrites: { [from: string]: string } = {},
  options: { concurrency?: number } = {}
) {
  const concurrency = options.concurrency ?? 16;
  const batch = new YBatch({ concurrency });
  for (const cname of contracts) {
    await batch.add(async () => {
      console.log(
        `Generating contract ${
          typeof principal === "string" ? principal : principal(cname)
        }.${cname}`
      );
      await generateContractFromAbi({
        apiHost: typeof apiHost === "string" ? apiHost : apiHost(cname),
        principal: typeof principal === "string" ? principal : principal(cname),
        projectName,
        contractName: cname,
        outputDir,
        runtimePackagePath,
        contractOverwrites,
      });
      console.log(
        `Generated contract ${
          typeof principal === "string" ? principal : principal(cname)
        }.${cname}`
      );
    });
  }
  await batch.failFast();

  await contractGenerator({
    contracts,
    outputDir,
    projectName,
    runtimePackagePath,
  });
}
