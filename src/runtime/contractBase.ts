import { Transcoder } from "./types";

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

export function defineContract<
  T extends {
    [contracts: string]: {
      [func: string]: FunctionDescriptor;
    };
  }
>(contracts: T): T {
  return contracts;
}
