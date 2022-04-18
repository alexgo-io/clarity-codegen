import { ClarityValue } from "@stacks/transactions";

export type Encoder<T> = (value: T) => ClarityValue;

export type UnboxEncoder<T extends Encoder<any>> = T extends Encoder<infer R>
  ? R
  : never;

export type Decoder<T> = (value: ClarityValue) => T;

export type UnboxDecoder<T extends Decoder<any>> = T extends Decoder<infer R>
  ? R
  : never;

export interface Transcoder<T> {
  encode: Encoder<T>;
  decode: Decoder<T>;
}

export type UnboxTranscoder<T extends Transcoder<any>> = T extends Transcoder<
  infer R
>
  ? R
  : never;

export type Response<T> =
  | {
      type: "success";
      value: T;
    }
  | {
      type: "error";
      error: Error;
    };

export type UnboxResponse<T extends Response<any>> = T extends {
  type: "success";
  value: infer R;
}
  ? R
  : never;
