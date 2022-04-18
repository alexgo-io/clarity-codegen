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
  uintCV,
} from "@stacks/transactions";
import {Encoder, Response, UnboxEncoder} from "./types";
import { ClarityError } from "./decoders";
import { stringCV } from "@stacks/transactions/dist/clarity/types/stringCV";

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
      return responseErrorCV(uintCV(value.error.code));
    }
    return responseErrorCV(stringCV(value.error.message, "utf8"));
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

export const numberCV: Encoder<bigint> = (input) => uintCV(input);

export function optional<T>(encoder: Encoder<T>): Encoder<T | undefined> {
  return (value) => {
    if (value === undefined) {
      return noneCV();
    }
    return someCV(encoder(value));
  };
}
