import {
  AnchorMode,
  type ClarityValue,
  type FungiblePostCondition,
  type PostCondition,
  PostConditionMode,
  type StxPostCondition,
} from "@stacks/transactions";
import type { StringOnly } from "../utils/helpers";
import type {
  ContractBaseType,
  OpenCallFunctionDescriptor,
  ParameterObjOfDescriptor,
} from "./contractBase";

export interface ContractCallOptions {
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: ClarityValue[];
  anchorMode: AnchorMode;
  postConditionMode: PostConditionMode;
  postConditions?: PostCondition[];
}

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
    deployerAddress?: string;
    postConditions?: (FungiblePostCondition | StxPostCondition)[];
  }
) => ContractCallOptions;

export const composeTxOptionsFactory =
  <T extends ContractBaseType>(
    contracts: T,
    factoryOptions: {
      deployerAddress?: string;
    }
  ): ComposeTxOptionsFn<T> =>
  (contractName, functionName, args, options = {}) => {
    const functionDescriptor = contracts[contractName][functionName];

    if (functionDescriptor.mode !== "public") {
      throw new Error(
        `[composeTxOptionsFactory] function ${contractName}.${functionName} should be a public function`
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

    const deployerAddress =
      options.deployerAddress ?? factoryOptions.deployerAddress;
    if (deployerAddress == null) {
      throw new Error("[composeTxOptionsFactory] deployer address required");
    }

    return {
      contractAddress: deployerAddress,
      contractName,
      functionName,
      functionArgs: clarityArgs,
      anchorMode: AnchorMode.Any,
      postConditionMode,
      postConditions,
    };
  };
