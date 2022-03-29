import { YBatch, YQueue } from "yqueue";
import {
  contractGenerator,
  generateContractFromAbi,
} from "./contractsGenerator";

export async function generateContracts(
  apiHost: string,
  principal: string,
  contracts: string[],
  output: string,
  name: string,
  packageName: string = "clarity-codegen"
) {
  const batch = new YBatch({ concurrency: 16 });
  for (const cname of contracts) {
    await batch.add(async () => {
      console.log(`Generating contract ${principal}.${cname}`);
      await generateContractFromAbi({
        apiHost: apiHost,
        principal: principal,
        contractName: cname,
        output,
        packageName,
      });
      console.log(`Generated contract ${principal}.${cname}`);
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
