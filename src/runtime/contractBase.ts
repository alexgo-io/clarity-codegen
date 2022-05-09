import { Transcoder } from "./types";

export type MapEntryDescriptor = {
  mode: "mapEntry";
  input: Transcoder<any>;
  output: Transcoder<any>;
};

export type VariableDescriptor = {
  mode: "constant" | "variable";
  input: Transcoder<void>;
  output: Transcoder<any>;
};

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

export type ContractEntryDescriptor =
  | MapEntryDescriptor
  | VariableDescriptor
  | ReadonlyFunctionDescriptor
  | OpenCallFunctionDescriptor;

export type ParametersOfDescriptor<D> = D extends ContractEntryDescriptor
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

export type ParameterObjOfDescriptor<D> = D extends ContractEntryDescriptor
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
      : Input extends Transcoder<infer U>
      ? U
      : never
    : never
  : never;

export type ReturnTypeOfDescriptor<D> = D extends ContractEntryDescriptor
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
    [func: string]: ContractEntryDescriptor;
  };
};

export function defineContract<T extends ContractBaseType>(contracts: T): T {
  return contracts;
}
