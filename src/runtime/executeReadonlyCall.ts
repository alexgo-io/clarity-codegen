import { callReadOnlyFunction } from "@stacks/transactions";
import { StringOnly } from "../utils/helpers";
import {
  ContractBaseType,
  ParameterObjOfDescriptor,
  ReadonlyFunctionDescriptor,
  ReturnTypeOfDescriptor,
} from "./contractBase";

export type CallReadOnlyFunctionFn = typeof callReadOnlyFunction;

export type ExecuteReadonlyCallFn<Contracts extends ContractBaseType> = <
  T extends StringOnly<keyof Contracts>,
  F extends StringOnly<keyof Contracts[T]>,
  Descriptor extends Contracts[T][F]
>(
  contractName: T,
  functionName: F,
  args: Descriptor extends ReadonlyFunctionDescriptor
    ? ParameterObjOfDescriptor<Descriptor>
    : never,
  options?: {
    senderAddress?: string;
    callReadOnlyFunction?: CallReadOnlyFunctionFn;
  }
) => Promise<
  Descriptor extends ReadonlyFunctionDescriptor
    ? ReturnTypeOfDescriptor<Descriptor>
    : never
>;

export const executeReadonlyCallFactory =
  <T extends ContractBaseType>(
    contracts: T,
    factoryOptions: {
      deployerAddress: string;
      defaultSenderAddress?: string;
      callReadOnlyFunction?: CallReadOnlyFunctionFn;
    }
  ): ExecuteReadonlyCallFn<T> =>
  async (contractName, functionName, args, options = {}) => {
    const functionDescriptor = contracts[contractName][functionName];

    if (functionDescriptor.mode !== "readonly") {
      throw new Error(
        `[composeTx] function ${contractName}.${functionName} should be a readonly function`
      );
    }

    const clarityArgs = functionDescriptor.input.map((arg) =>
      arg.type.encode(args[arg.name])
    );

    const senderAddress =
      options.senderAddress ??
      factoryOptions.defaultSenderAddress ??
      factoryOptions.deployerAddress;

    const _callReadOnlyFunction =
      options.callReadOnlyFunction ??
      factoryOptions.callReadOnlyFunction ??
      callReadOnlyFunction;

    const result = await _callReadOnlyFunction({
      contractName,
      functionName,
      functionArgs: clarityArgs,
      contractAddress: factoryOptions.deployerAddress,
      senderAddress,
    });

    return functionDescriptor.output.decode(result);
  };
