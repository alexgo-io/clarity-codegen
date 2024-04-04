import {
  bufferCV,
  noneCV,
  stringAsciiCV,
  stringUtf8CV,
} from "@stacks/transactions";
import {
  boolResult,
  bufferResult,
  contractResult,
  intResult,
  listDecoder,
  noneResult,
  optionalDecoder,
  principalResult,
  responseSimpleDecoder,
  stringResult,
  tupleDecoder,
} from "./decoders";
import {
  booleanCV,
  listEncoder,
  uintCV,
  optionalEncoder,
  principalCV,
  responseSimpleEncoder,
  tupleEncoder,
  intCV,
  traitCV,
} from "./encoders";
import {
  Decoder,
  Encoder,
  Response,
  Transcoder,
  UnboxTranscoder,
} from "./types";
import { mapValues } from "../utils/helpers";

export function transcoders<T>(constructOptions: {
  encode: Encoder<T>;
  decode: Decoder<T>;
}): Transcoder<T> {
  return constructOptions;
}

export const intT = transcoders({
  encode: intCV,
  decode: intResult,
});

export const uintT = transcoders({
  encode: uintCV,
  decode: intResult,
});

export const stringT = transcoders({
  encode: stringUtf8CV,
  decode: stringResult,
});

export const stringAsciiT = transcoders({
  encode: stringAsciiCV,
  decode: stringResult,
});

export const booleanT = transcoders({
  encode: booleanCV,
  decode: boolResult,
});

export const bufferT = transcoders({
  encode: bufferCV,
  decode: bufferResult,
});

export const principalT = transcoders({
  encode: principalCV,
  decode: principalResult,
});

export const traitT = transcoders({
  encode: traitCV,
  decode: contractResult,
});

export const listT = <T>(
  listItemTranscoder: Transcoder<T>
): Transcoder<T[]> => {
  return transcoders({
    encode: listEncoder(listItemTranscoder.encode),
    decode: listDecoder(listItemTranscoder.decode),
  });
};

export const tupleT = <T extends Record<string, Transcoder<any>>>(
  transcoderObj: T
): Transcoder<{
  [K in keyof T]: UnboxTranscoder<T[K]>;
}> => {
  const encode = tupleEncoder(
    mapValues(transcoderObj, (o) => o.encode)
  ) as Encoder<{
    [K in keyof T]: UnboxTranscoder<T[K]>;
  }>;

  const decode = tupleDecoder(
    mapValues(transcoderObj, (o) => o.decode)
  ) as Decoder<{
    [K in keyof T]: UnboxTranscoder<T[K]>;
  }>;

  return transcoders({ encode, decode });
};

export const optionalT = <T>(
  someTranscoder: Transcoder<T>
): Transcoder<undefined | T> => {
  return transcoders({
    encode: optionalEncoder(someTranscoder.encode),
    decode: optionalDecoder(someTranscoder.decode),
  });
};

export const noneT = transcoders({
  encode: noneCV,
  decode: noneResult,
});

export const responseSimpleT = <TOK>(
  okValueTransducer: Transcoder<TOK>
): Transcoder<Response<TOK>> => {
  return transcoders({
    encode: responseSimpleEncoder(okValueTransducer.encode),
    decode: responseSimpleDecoder(okValueTransducer.decode),
  });
};
