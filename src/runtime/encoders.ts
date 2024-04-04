import {
  BooleanCV,
  ContractPrincipalCV,
  contractPrincipalCV,
  falseCV,
  listCV,
  noneCV,
  PrincipalCV,
  responseErrorCV,
  responseOkCV,
  someCV,
  standardPrincipalCV,
  trueCV,
  tupleCV,
  TupleCV,
  uintCV as _uintCV,
  intCV as _intCV,
  stringUtf8CV,
} from "@stacks/transactions";
import { Encoder, Response, UnboxEncoder } from "./types";
import { ClarityError } from "./decoders";

export function tupleEncoder<P extends Record<string, Encoder<any>>>(
  decorators: P
): Encoder<{
  [K in keyof P]: UnboxEncoder<P[K]>;
}> {
  return (input): TupleCV => {
    const result = {} as any;
    for (const key of Object.keys(decorators)) {
      result[key] = decorators[key as keyof P]!(input[key]!);
    }

    return tupleCV(result);
  };
}

export function listEncoder<T>(encoder: Encoder<T>): Encoder<T[]> {
  return (value) => {
    return listCV(value.map(encoder));
  };
}

export function responseSimpleEncoder<T>(
  success: Encoder<T>
): Encoder<Response<T>> {
  return (value) => {
    if (value.type === "success") {
      return responseOkCV(success(value.value));
    }
    if (value.error instanceof ClarityError) {
      return responseErrorCV(_uintCV(value.error.code));
    }
    return responseErrorCV(stringUtf8CV(value.error.message));
  };
}

export function principalCV(principal: string): PrincipalCV {
  if (principal.includes(".")) {
    const [address, contractName] = principal.split(".");
    return contractPrincipalCV(address!, contractName!);
  } else {
    return standardPrincipalCV(principal);
  }
}

export function traitCV(principal: `${string}.${string}`): ContractPrincipalCV {
  const [addr, name] = principal.split(".");
  return contractPrincipalCV(addr, name);
}

export const booleanCV = (value: boolean): BooleanCV => {
  if (value) {
    return trueCV();
  } else {
    return falseCV();
  }
};

export const uintCV: Encoder<bigint> = (input) => _uintCV(input);
export const intCV: Encoder<bigint> = (input) => _intCV(input);

export function optionalEncoder<T>(
  encoder: Encoder<T>
): Encoder<T | undefined> {
  return (value) => {
    if (value === undefined) {
      return noneCV();
    }
    return someCV(encoder(value));
  };
}
