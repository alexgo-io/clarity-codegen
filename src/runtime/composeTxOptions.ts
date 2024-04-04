import {
  AnchorMode,
  ContractCallOptions,
  FungiblePostCondition,
  PostConditionMode,
  STXPostCondition,
} from "@stacks/transactions";
import { StringOnly } from "../utils/helpers";
import {
  ContractBaseType,
  OpenCallFunctionDescriptor,
  ParameterObjOfDescriptor,
} from "./contractBase";

export type ComposeTxOptionsFn<Contracts extends ContractBaseType> = <
  T extends StringOnly<keyof Contracts>,
  F extends StringOnly<keyof Contracts[T]>,
  Descriptor extends Contracts[T][F]
>(
  contractName: T,
  functionName: F,
  args: Descriptor extends OpenCallFunctionDescriptor
    ? ParameterObjOfDescriptor<Descriptor>
    : never,
  options?: {
    postConditions?: (FungiblePostCondition | STXPostCondition)[];
  }
) => ContractCallOptions;

export const composeTxOptionsFactory =
  <T extends ContractBaseType>(
    contracts: T,
    factoryOptions: {
      deployerAddress: string;
    }
  ): ComposeTxOptionsFn<T> =>
  (contractName, functionName, args, options = {}) => {
    const functionDescriptor = contracts[contractName][functionName];

    if (functionDescriptor.mode !== "public") {
      throw new Error(
        `[composeTx] function ${contractName}.${functionName} should be a public function`
      );
    }

    const clarityArgs = functionDescriptor.input.map((arg) =>
      arg.type.encode(args[arg.name])
    );

    const postConditionMode =
      options.postConditions == null
        ? PostConditionMode.Allow
        : PostConditionMode.Deny;
    const postConditions = options.postConditions;

    return {
      contractName,
      functionName,
      functionArgs: clarityArgs,
      contractAddress: factoryOptions.deployerAddress,
      anchorMode: AnchorMode.Any,
      postConditionMode,
      postConditions,
    };
  };
