import { Transcoder } from "./types";
import { ClarityValue, deserializeCV } from "@stacks/transactions";

export type ReadonlyFunctionDescriptor = {
  mode: "readonly";
  input: readonly { name: string; type: Transcoder<any> }[];
  output: Transcoder<any>;
};

export type OpenCallFunctionDescriptor = {
  mode: "public";
  input: readonly { name: string; type: Transcoder<any> }[];
  output: Transcoder<any>;
};

export type FunctionDescriptor =
  | ReadonlyFunctionDescriptor
  | OpenCallFunctionDescriptor;

export type ParametersOfDescriptor<D> = D extends FunctionDescriptor
  ? D extends {
      input: infer Input;
    }
    ? Input extends readonly { name: string; type: Transcoder<any> }[]
      ? {
          [K in keyof Input]: Input[K] extends { type: Transcoder<infer T> }
            ? T
            : never;
        }
      : never
    : never
  : never;

type ParameterObjOfDescriptorPickType<T, N> = T extends {
  name: N;
  type: Transcoder<infer R>;
}
  ? R
  : never;
export type ParameterObjOfDescriptor<D> = D extends FunctionDescriptor
  ? D extends {
      input: infer Input;
    }
    ? Input extends readonly { name: string; type: Transcoder<any> }[]
      ? {
          [K in Input[number]["name"]]: ParameterObjOfDescriptorPickType<
            Input[number],
            K
          >;
        }
      : never
    : never
  : never;

export type ReturnTypeOfDescriptor<D> = D extends FunctionDescriptor
  ? D extends {
      output: infer Output;
    }
    ? Output extends Transcoder<infer T>
      ? T
      : never
    : never
  : never;

export type ContractBaseType = {
  [contracts: string]: {
    [func: string]: FunctionDescriptor;
  };
};

export function defineContract<T extends ContractBaseType>(contracts: T): T {
  return contracts;
}

export function processContractCall<
  Contracts extends ContractBaseType,
  T extends keyof Contracts,
  F extends keyof Contracts[T],
  Descriptor extends Contracts[T][F]
>(contracts: Contracts, contract: T, functionName: F) {
  const functionDescriptor = contracts[contract][
    functionName
  ] as any as FunctionDescriptor;
  return {
    encodeInput: (
      args: ParameterObjOfDescriptor<Descriptor>
    ): ClarityValue[] => {
      return functionDescriptor.input.map((arg) =>
        arg.type.encode(args[arg.name])
      );
    },
    decodeOutput: (args: ClarityValue): ReturnTypeOfDescriptor<Descriptor> => {
      return functionDescriptor.output.decode(args);
    },
  };
}
