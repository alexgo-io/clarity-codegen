import {
  addressToString,
  ClarityType,
  ClarityValue,
} from "@stacks/transactions";
import {Decoder, Response, UnboxDecoder} from "./types";

export class ClarityError extends Error {
  constructor(readonly code: number) {
    super(`ClarityError: ${code}`);
  }
}

export const boolResult: Decoder<boolean> = (result) => {
  if (result.type === ClarityType.BoolTrue) {
    return true;
  }
  if (result.type === ClarityType.BoolFalse) {
    return false;
  }
  throw new Error(`Expected integer, got ${result.type}`);
};

export const principleResult: Decoder<string> = (result) => {
  if (result.type === ClarityType.PrincipalStandard) {
    return addressResult(result);
  } else if (result.type === ClarityType.PrincipalContract) {
    return contractResult(result);
  }
  throw new Error(`Expected principal, got ${result.type}`);
};

export const addressResult: Decoder<string> = (result) => {
  if (result.type === ClarityType.PrincipalStandard) {
    return addressToString(result.address);
  }
  throw new Error(`Expected principal, got ${result.type}`);
};

export const contractResult: Decoder<string> = (result) => {
  if (result.type === ClarityType.PrincipalContract) {
    return result.contractName.content;
  }
  throw new Error(`Expected principal, got ${result.type}`);
};

export const intResult: Decoder<bigint> = (result) => {
  if (result.type === ClarityType.Int || result.type === ClarityType.UInt) {
    return result.value;
  }
  throw new Error(`Expected integer, got ${result.type}`);
};

export const stringResult: Decoder<string> = (result) => {
  if (
    result.type === ClarityType.StringASCII ||
    result.type === ClarityType.StringUTF8
  ) {
    return result.data;
  }
  throw new Error(`Expected string, got ${result.type}`);
};

export const bufferResult: Decoder<Buffer> = (result) => {
  if (result.type === ClarityType.Buffer) {
    return result.buffer;
  }
  throw new Error(`Expected buffer, got ${result.type}`);
};

export const defaultErrorDecoder: Decoder<Error> = (value: ClarityValue) => {
  if (
    value.type === ClarityType.StringASCII ||
    value.type === ClarityType.StringUTF8
  ) {
    return new Error(value.data);
  }
  if (value.type === ClarityType.UInt || value.type === ClarityType.Int) {
    return new ClarityError(Number(value.value));
  }
  return new Error("Unknown error");
};

export function responseSimpleDecoder<T>(
  success: Decoder<T>,
  failure: Decoder<Error> = defaultErrorDecoder
): Decoder<Response<T>> {
  return (value: ClarityValue): Response<T> => {
    if (value.type === ClarityType.ResponseErr) {
      return {
        type: "error",
        error: failure(value.value),
      };
    }

    if (value.type === ClarityType.ResponseOk) {
      return {
        type: "success",
        value: success(value.value),
      };
    }

    throw new Error(`Expected response, got ${value.type}`);
  };
}

export function optionalDecoder<T>(
  decoder: Decoder<T>
): Decoder<T | undefined> {
  return (value) => {
    if (value.type === ClarityType.OptionalNone) {
      return undefined;
    } else if (value.type === ClarityType.OptionalSome) {
      return decoder(value.value);
    }
    return decoder(value);
  };
}

export const noneResult: Decoder<void> = (result) => {
  if (result.type === ClarityType.OptionalNone) {
    return null;
  }
  throw new Error(`Expected none, got ${result.type}`);
};

export function tupleDecoder<P extends Record<string, Decoder<any>>>(
  decorators: P
): Decoder<{
  [K in keyof P]: UnboxDecoder<P[K]>;
}> {
  return (input) => {
    if (input.type !== ClarityType.Tuple) {
      throw new Error(`Expected tuple, got ${input.type}`);
    }
    const result = {} as any;
    for (const key of Object.keys(decorators)) {
      result[key] = decorators[key as keyof P]!(input.data[key]!);
    }
    return result;
  };
}

export function listDecoder<T>(decoder: Decoder<T>): Decoder<T[]> {
  return (value) => {
    if (value.type === ClarityType.List) {
      return value.list.map(decoder);
    }
    throw new Error(`Expected list, got ${value.type}`);
  };
}
