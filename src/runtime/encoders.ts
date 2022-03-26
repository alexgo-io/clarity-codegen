import {
  BooleanCV,
  ContractPrincipalCV,
  contractPrincipalCV,
  falseCV,
  listCV,
  noneCV,
  PrincipalCV,
  responseOkCV,
  someCV,
  standardPrincipalCV,
  trueCV,
  tupleCV,
  TupleCV,
  uintCV,
} from "@stacks/transactions";
import { Encoder, UnboxEncoder } from "./types";

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

export function responseSimpleEncoder<T>(success: Encoder<T>): Encoder<T> {
  return (value: T) => {
    return responseOkCV(success(value));
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

export const traitCV = (val: string): ContractPrincipalCV => {
  const [addr, name] = val.split(".");
  if (addr && name) {
    return contractPrincipalCV(addr, name);
  }
  throw new Error(`can not parse val as trait: ${val}`);
};

export const booleanCV = (value: boolean): BooleanCV => {
  if (value) {
    return trueCV();
  } else {
    return falseCV();
  }
};

export const numberCV: Encoder<number> = (input) => uintCV(Math.floor(input));

export function optional<T>(encoder: Encoder<T>): Encoder<T | undefined> {
  return (value) => {
    if (value === undefined) {
      return noneCV();
    }
    return someCV(encoder(value));
  };
}
