import { YBatch } from "yqueue";
import {
  contractGenerator,
  generateContractFromAbi,
} from "./contractsGenerator";

export async function generateContracts(
  apiHost: string | ((contract: string) => string),
  principal: string | ((contract: string) => string),
  contracts: string[],
  output: string,
  name: string,
  packageName: string = "clarity-codegen",
  contractOverwrites: {[from: string]: string} = {}
) {
  const batch = new YBatch({ concurrency: 16 });
  for (const cname of contracts) {
    await batch.add(async () => {
      console.log(`Generating contract ${typeof principal === 'string' ? principal : principal(cname)}.${cname}`);
      await generateContractFromAbi({
        apiHost: typeof apiHost === 'string' ? apiHost : apiHost(cname) ,
        principal: typeof principal === 'string' ? principal : principal(cname),
        contractName: cname,
        output,
        packageName,
        contractOverwrites
      });
      console.log(`Generated contract ${typeof principal === 'string' ? principal : principal(cname)}.${cname}`);
    });
  }
  await batch.failFast();

  await contractGenerator({
    contracts: contracts,
    output: output,
    name,
    packageName,
  });
}
