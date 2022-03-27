## Clarity Codegen

TypeScript codegen from clarity contract Abi

## Usage

```shell
yarn add clarity-codegen
yarn clarity-codegen --apiHost https://stacks-node-api.alexlab.co --principal SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9 --contracts alex-reserve-pool alex-launchpad-v1-1 --output ./
```

You can also run codegen in JS

```typescript
import { generateContracts } from "clarity-codegen/lib/generate";
import * as path from "path";
import {
  contracts,
  DEPLOYER_ACCOUNT_ADDRESS,
  STACKS_API_URL,
} from "../constants";

(async function main() {
  await generateContracts(
    STACKS_API_URL(),
    DEPLOYER_ACCOUNT_ADDRESS(),
    contracts,
    path.resolve(__dirname, "./generated/"),
    "Alex"
  );
})().catch(console.error);
```

### Encode / Decode clarity value

`processContractCall` will give you strong typed `encodeInput` and `decodeOutput`,
which can be used to encode and decode the input and output of a contract call.

Example:

```typescript
import { ParameterObjOfDescriptor, processContractCall } from "clarity-codegen";
import { AlexContracts } from "./generated/contracts_Alex";
import { Operation } from "./Operation";

export type Contracts = typeof AlexContracts;
export type ContractName = keyof Contracts;

export const callPublic = <
  T extends ContractName,
  F extends keyof Contracts[T],
  Descriptor extends Contracts[T][F]
>(
  contractOrType: T,
  functionName: F,
  args: ParameterObjOfDescriptor<Descriptor>
): Operation.PublicCall => {
  const contractCall = processContractCall(
    AlexContracts,
    contractOrType,
    functionName
  )
  const input = contractCall.encodeInput(args)
  // broadcast public contract or send readonly call
  const output = contractCall.decodeOutput(response.output)
  return output
};
```

### Process history transactions

use `decodeContractCallTransaction` to decode the transaction use it with type narrowing

```typescript
const historicalTransaction: ContractCallTransaction = null as any; // read from server
const decodedTx = decodeContractCallTransaction(
  AlexContracts,
  historicalTransaction
);
if (
  decodedTx.contractName === "alex-launchpad-v1-1" &&
  decodedTx.functionName === "register"
) {
  const tickets = decodedTx.args.tickets;
  const paymentToken = decodedTx.args["payment-token"];
  const idoId = decodedTx.args["ido-id"];
}
```

use `decodeSpecifiedContractCallTransaction` to decode the transaction with specific contract and function

```typescript
const historicalTransaction: ContractCallTransaction = null as any; // read from server
const result = decodeSpecifiedContractCallTransaction(
  AlexContracts,
  "alex-launchpad-v1-1",
  "register",
  historicalTransaction
);
result.args.tickets;
result.result.start;
```


