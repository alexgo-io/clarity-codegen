import { ContractCallTransaction } from "@stacks/stacks-blockchain-api-types";
import { deserializeCV } from "@stacks/transactions";
import {
  ContractBaseType,
  OpenCallFunctionDescriptor,
  ParameterObjOfDescriptor,
  ReturnTypeOfDescriptor,
} from "./contractBase";

export type ContractCallTransactionResultMap<
  Contracts extends ContractBaseType
> = {
  [C in keyof Contracts]: {
    [F in keyof Contracts[C]]: {
      contractName: C;
      functionName: F;
      args: ParameterObjOfDescriptor<Contracts[C][F]>;
      result: ReturnTypeOfDescriptor<Contracts[C][F]>;
    };
  };
};

export type ContractCallTransactionResult<Contracts extends ContractBaseType> =
  {
    [K in keyof ContractCallTransactionResultMap<Contracts>]: ContractCallTransactionResultMap<Contracts>[K][keyof ContractCallTransactionResultMap<Contracts>[K]];
  }[keyof ContractCallTransactionResultMap<Contracts>];

export function decodeContractCallTransaction<
  Contracts extends ContractBaseType
>(
  contracts: Contracts,
  tx: ContractCallTransaction
): ContractCallTransactionResult<Contracts> {
  if (!(tx.contract_call.contract_id in contracts)) {
    throw new Error(
      `[decodeContractCallTransaction] unknown contract id ${tx.contract_call.contract_id}`
    );
  }
  const contractName = tx.contract_call.contract_id as keyof Contracts;

  if (!(tx.contract_call.function_name in contracts[contractName])) {
    throw new Error(
      `[decodeContractCallTransaction] unknown function name ${String(
        contractName
      )}.${tx.contract_call.function_name}`
    );
  }
  const functionName = tx.contract_call
    .function_name as keyof Contracts[keyof Contracts];

  return {
    contractName,
    functionName,
    ...decodeSpecifiedContractCallTransaction(
      contracts,
      contractName,
      functionName,
      tx
    ),
  };
}

export function decodeSpecifiedContractCallTransaction<
  Contracts extends ContractBaseType,
  T extends keyof Contracts,
  F extends keyof Contracts[T]
>(
  contracts: Contracts,
  contractOrType: T,
  functionName: F,
  tx: ContractCallTransaction
): Contracts[T][F] extends OpenCallFunctionDescriptor
  ? {
      args: ParameterObjOfDescriptor<Contracts[T][F]>;
      result: ReturnTypeOfDescriptor<Contracts[T][F]>;
      raw: ContractCallTransaction;
    }
  : never {
  const functionDescriptor = contracts[contractOrType][
    functionName
  ] as any as OpenCallFunctionDescriptor;

  const args = functionDescriptor.input.reduce(
    (acc, arg, index) => ({
      ...acc,
      [arg.name]: arg.type.decode(
        deserializeCV(tx.contract_call.function_args![index]!.hex)
      ),
    }),
    {} as Record<string, any>
  );

  const result = functionDescriptor.output.decode(
    deserializeCV(tx.tx_result.hex)
  );

  return { args: args, result, raw: tx } as any;
}
