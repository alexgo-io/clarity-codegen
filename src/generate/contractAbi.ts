// From https://github.com/blockstack/stacks-blockchain-sidecar/blob/master/src/event-stream/contract-abi.ts

export type ClarityAbiTypeBuffer = { buffer: { length: number } };
export type ClarityAbiTypeStringAscii = { "string-ascii": { length: number } };
export type ClarityAbiTypeStringUtf8 = { "string-utf8": { length: number } };
export type ClarityAbiTypeResponse = {
  response: { ok: ClarityAbiType; error: ClarityAbiType };
};
export type ClarityAbiTypeOptional = { optional: ClarityAbiType };
export type ClarityAbiTypeTuple = {
  tuple: { name: string; type: ClarityAbiType }[];
};
export type ClarityAbiTypeList = {
  list: { type: ClarityAbiType; length: number };
};

export type ClarityAbiTypeUInt128 = "uint128";
export type ClarityAbiTypeInt128 = "int128";
export type ClarityAbiTypeBool = "bool";
export type ClarityAbiTypePrincipal = "principal";
export type ClarityAbiTypeTraitReference = "trait_reference";
export type ClarityAbiTypeNone = "none";

export type ClarityAbiTypePrimitive =
  | ClarityAbiTypeUInt128
  | ClarityAbiTypeInt128
  | ClarityAbiTypeBool
  | ClarityAbiTypePrincipal
  | ClarityAbiTypeTraitReference
  | ClarityAbiTypeNone;

export type ClarityAbiType =
  | ClarityAbiTypePrimitive
  | ClarityAbiTypeBuffer
  | ClarityAbiTypeResponse
  | ClarityAbiTypeOptional
  | ClarityAbiTypeTuple
  | ClarityAbiTypeList
  | ClarityAbiTypeStringAscii
  | ClarityAbiTypeStringUtf8
  | ClarityAbiTypeTraitReference;

export enum ClarityAbiTypeId {
  ClarityAbiTypeUInt128 = 1,
  ClarityAbiTypeInt128 = 2,
  ClarityAbiTypeBool = 3,
  ClarityAbiTypePrincipal = 4,
  ClarityAbiTypeNone = 5,
  ClarityAbiTypeBuffer = 6,
  ClarityAbiTypeResponse = 7,
  ClarityAbiTypeOptional = 8,
  ClarityAbiTypeTuple = 9,
  ClarityAbiTypeList = 10,
  ClarityAbiTypeStringAscii = 11,
  ClarityAbiTypeStringUtf8 = 12,
  ClarityAbiTypeTraitReference = 13,
}

export const isClarityAbiPrimitive = (
  val: ClarityAbiType
): val is ClarityAbiTypePrimitive => typeof val === "string";
export const isClarityAbiBuffer = (
  val: ClarityAbiType
): val is ClarityAbiTypeBuffer =>
  (val as ClarityAbiTypeBuffer).buffer !== undefined;
export const isClarityAbiStringAscii = (
  val: ClarityAbiType
): val is ClarityAbiTypeStringAscii =>
  (val as ClarityAbiTypeStringAscii)["string-ascii"] !== undefined;
export const isClarityAbiStringUtf8 = (
  val: ClarityAbiType
): val is ClarityAbiTypeStringUtf8 =>
  (val as ClarityAbiTypeStringUtf8)["string-utf8"] !== undefined;
export const isClarityAbiResponse = (
  val: ClarityAbiType
): val is ClarityAbiTypeResponse =>
  (val as ClarityAbiTypeResponse).response !== undefined;
export const isClarityAbiOptional = (
  val: ClarityAbiType
): val is ClarityAbiTypeOptional =>
  (val as ClarityAbiTypeOptional).optional !== undefined;
export const isClarityAbiTuple = (
  val: ClarityAbiType
): val is ClarityAbiTypeTuple =>
  (val as ClarityAbiTypeTuple).tuple !== undefined;
export const isClarityAbiList = (
  val: ClarityAbiType
): val is ClarityAbiTypeList => (val as ClarityAbiTypeList).list !== undefined;

export interface ClarityAbiFunction {
  name: string;
  access: "private" | "public" | "read_only";
  args: {
    name: string;
    type: ClarityAbiType;
  }[];
  outputs: {
    type: ClarityAbiType;
  };
}

export interface ClarityAbiVariable {
  name: string;
  access: "variable" | "constant";
  type: ClarityAbiType;
}

export interface ClarityAbiMap {
  name: string;
  key: ClarityAbiType;
  value: ClarityAbiType;
}

export interface ClarityAbiTypeFungibleToken {
  name: string;
}

export interface ClarityAbiTypeNonFungibleToken {
  name: string;
  type: ClarityAbiType;
}

export interface ClarityAbi {
  functions: ClarityAbiFunction[];
  variables: ClarityAbiVariable[];
  maps: ClarityAbiMap[];
  fungible_tokens: ClarityAbiTypeFungibleToken[];
  non_fungible_tokens: ClarityAbiTypeNonFungibleToken[];
}
