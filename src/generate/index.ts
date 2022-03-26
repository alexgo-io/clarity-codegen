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
  for (const cname of contracts) {
    console.log(`Generating contract ${principal}.${cname}`);
    await generateContractFromAbi({
      apiHost: apiHost,
      principal: principal,
      contractName: cname,
      output,
      packageName,
    }).catch(console.error);
  }

  await contractGenerator({
    contracts: contracts,
    output: output,
    name,
    packageName,
  });
}
