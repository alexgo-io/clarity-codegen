## Clarity Codegen

Generate TypeScript code from Clarity contract ABI.

## Usage

Install the package using the following command:

```shell
yarn add clarity-codegen
```

You can generate TypeScript code for Clarity contracts using the CLI:

```shell
yarn clarity-codegen --apiHost https://stacks-node-api.alexlab.co --principal SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9 --contracts alex-reserve-pool alex-launchpad-v1-1 --output ./
```

Alternatively, you can run codegen in JavaScript:

```typescript
import { generateContracts } from "clarity-codegen/lib/generate";
import * as path from "path";

const STACKS_API_URL = "https://api.hiro.so";
const DEPLOYER_ACCOUNT_ADDRESS = "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9";

const alexContracts = [
  "age000-governance-token",
]

const xlinkContracts = [
  "token-abtc",
  "btc-bridge-endpoint-v...",
]

(async function main() {
  await generateContracts(
    STACKS_API_URL,
    DEPLOYER_ACCOUNT_ADDRESS,
    alexContracts,
    path.resolve(__dirname, "./generated/"),
    "alex"
  );
  await generateContracts(
    STACKS_API_URL,
    DEPLOYER_ACCOUNT_ADDRESS,
    xlinkContracts,
    path.resolve(__dirname, "./generated/"),
    "xlink"
  );
})().catch(console.error);
```

### Encoding and Decoding Clarity Values

`processContractCall` provides strongly typed `encodeInput` and `decodeOutput` functions, which can be used to encode and decode the input and output of a contract call.

Example:

```typescript
import { fetchReadOnlyFunction } from "@stacks/transactions";
import { tupleT, stringT } from "clarity-codegen";
import { AlexContracts } from "./generated/contracts_Alex";

/**
 * Let's call a readonly function
 */
const contractDeployerAddress = "...";
const contractName = "...";
const readonlyFunctionName = "...";
const readonlyFunctionArgs = {
  /* ... */
};
const functionDescriptor = AlexContracts[contractName][readonlyFunctionName];
const clarityArgs = functionDescriptor.input.map((arg) =>
  arg.type.encode(readonlyFunctionArgs[arg.name])
);
const result = await fetchReadOnlyFunction({
  contractName,
  functionName: readonlyFunctionName,
  functionArgs: clarityArgs,
  contractAddress: contractDeployerAddress,
  senderAddress: contractDeployerAddress,
});
console.log("result", functionDescriptor.output.decode(result));

/**
 * Let's simply encode/decode some clarity value
 */
const schema = tupleT({
  hello: stringT,
});
const encoded = schema.encode({ hello: "world" });
console.log("serialized clarityValue", encoded);
console.log("deserialized clarityValue", schema.decode(encoded));
```

### Make contract calls

```typescript
import { makeContractCall, broadcastTransaction } from "@stacks/transactions";
import { composeTxOptionsFactory, executeReadonlyCallFactory } from "clarity-codegen";
import { AlexContracts } from "./generated/contracts_Alex";

const composeTxOptions = composeTxOptionsFactory(AlexContracts, {
  deployerAddress: "...",
});
const executeReadonlyCall = executeReadonlyCallFactory(AlexContracts, {
  deployerAddress: "...",
});

// make a readonly call
console.log("decoded readonly call result", await executeReadonlyCall({
  "contract name",
  "function name",
  { /* arguments */ },
}));

// create a public call
const txOptions = composeTxOptions({
  "contract name",
  "function name",
  { /* arguments */ },
  {
    postConditions: [ /* post conditions */ ],
  },
});
const tx = makeContractCall({ ...txOptions, senderKey: "..." });
await broadcastTransaction(tx);
```

### Processing Historical Transactions

Use `decodeContractCallTransaction` to decode transactions and apply type narrowing:

```typescript
const historicalTransaction: ContractCallTransaction = null as any; // Read from server
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

Use `decodeSpecifiedContractCallTransaction` to decode transactions with a specific contract and function:

```typescript
const historicalTransaction: ContractCallTransaction = null as any; // Read from server
const result = decodeSpecifiedContractCallTransaction(
  AlexContracts,
  "alex-launchpad-v1-1",
  "register",
  historicalTransaction
);
result.args.tickets;
result.result.start;
```

## License

This project is licensed under the MIT License.

```
MIT License

Copyright (c) 2023 alexgo-io

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
