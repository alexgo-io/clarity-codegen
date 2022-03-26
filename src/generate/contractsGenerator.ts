import * as fs from "fs";
import { camelCase } from "lodash";
import fetch from "node-fetch";
import path from "path";
import { inspect } from "util";
import {
  ClarityAbiFunction,
  ClarityAbiType,
  isClarityAbiBuffer,
  isClarityAbiList,
  isClarityAbiOptional,
  isClarityAbiPrimitive,
  isClarityAbiResponse,
  isClarityAbiStringAscii,
  isClarityAbiStringUtf8,
  isClarityAbiTuple,
} from "./contractAbi";
import { assertNever, mapValues } from "../utils/helpers";

type TranscoderDefArgument = TranscoderDef | Record<string, TranscoderDef>;
type TranscoderDef = [string, ...TranscoderDefArgument[]];

const toTranscoderDef = ({
  name,
  type,
}: {
  name?: string;
  type: ClarityAbiType;
}): { def: TranscoderDef } => {
  if (isClarityAbiPrimitive(type)) {
    if (type === "uint128" || type === "int128") {
      return { def: ["numberT"] };
    } else if (type === "bool") {
      return { def: ["booleanT"] };
    } else if (type === "principal" || type === "trait_reference") {
      return { def: ["principalT"] };
    } else if (type === "none") {
      return { def: ["noneT"] };
    } else {
      assertNever(type);
    }
  }

  if (isClarityAbiStringUtf8(type) || isClarityAbiStringAscii(type)) {
    return { def: ["stringT"] };
  }

  if (isClarityAbiBuffer(type)) {
    return { def: ["bufferT"] };
  }

  if (isClarityAbiOptional(type)) {
    return {
      def: ["optionalT", toTranscoderDef({ type: type.optional }).def],
    };
  }

  if (isClarityAbiResponse(type)) {
    return {
      def: ["responseSimpleT", toTranscoderDef({ type: type.response.ok }).def],
    };
  }

  if (isClarityAbiList(type)) {
    const list = type.list;
    return {
      def: [`listT`, toTranscoderDef({ type: list.type }).def],
    };
  }

  if (isClarityAbiTuple(type)) {
    const tuple = type.tuple;
    const result = tuple.reduce(
      (acc, c) => ({
        ...acc,
        [c.name]: toTranscoderDef({ type: c.type }).def,
      }),
      {}
    );

    return {
      def: ["tupleT", result],
    };
  }

  console.warn(`${name}: ${JSON.stringify(type)} is not a supported type`);
  assertNever(type);
};

const walkTranscoderDef = (
  res: TranscoderDef,
  callbacks: {
    onTranscoderDefStart?: (result: TranscoderDef) => void;

    onTranscoderDefEnd?: (result: TranscoderDef) => void;

    /**
     * return `false` to prevent walk into this rest
     */
    onTranscoderDefArgumentStart?: (
      transcoderName: string,
      resultRest: TranscoderDefArgument
    ) => undefined | boolean;

    onTranscoderDefArgumentEnd?: (
      transcoderName: string,
      resultRest: TranscoderDefArgument
    ) => void;
  }
): void => {
  if (res.length < 1) return;

  callbacks.onTranscoderDefStart?.(res);
  (res.slice(1) as TranscoderDefArgument[]).forEach((rest) => {
    let walkInto: undefined | boolean = true;

    if (callbacks.onTranscoderDefArgumentStart) {
      walkInto = callbacks.onTranscoderDefArgumentStart(res[0], rest);
    }

    if (walkInto !== false) {
      if (Array.isArray(rest)) {
        walkTranscoderDef(rest, callbacks);
      } else {
        mapValues(rest, (result) => {
          walkTranscoderDef(result, callbacks);
        });
      }
    }

    callbacks.onTranscoderDefArgumentEnd?.(res[0], rest);
  });

  callbacks.onTranscoderDefEnd?.(res);
};

const getAllTranscoderName = (resAry: TranscoderDef[]): string[] => {
  const ret: string[] = [];

  resAry.forEach((res) => {
    walkTranscoderDef(res, {
      onTranscoderDefStart(res) {
        ret.push(res[0]);
      },
    });
  });

  return Array.from(new Set(ret));
};

const stringifyTranscoderDef = (res: TranscoderDef): string => {
  let ret = "";

  walkTranscoderDef(res, {
    onTranscoderDefStart(res) {
      if (res.length === 1) {
        ret += res[0];
      } else {
        ret += `${res[0]}(`;
      }
    },
    onTranscoderDefEnd(res) {
      if (res.length !== 1) {
        ret += `)`;
      }
    },
    onTranscoderDefArgumentStart(name, rest) {
      if (!Array.isArray(rest)) {
        ret += inspect(
          mapValues(rest, (i) => ({
            [inspect.custom]: () => stringifyTranscoderDef(i),
          })),
          { depth: null }
        );
        return false;
      }
    },
    onTranscoderDefArgumentEnd() {
      ret += ", ";
    },
  });

  return ret;
};

interface FunctionDescriptorDef {
  input: { name: string; type: TranscoderDef }[];
  output: TranscoderDef;
  mode: "public" | "readonly";
}

const toFunctionDescriptorDef = (
  func: ClarityAbiFunction
): void | FunctionDescriptorDef => {
  if (func.access === "private") return;

  return {
    input: func.args.map((arg) => ({
      name: arg.name,
      type: toTranscoderDef(arg).def,
    })),
    output: toTranscoderDef(func.outputs).def,
    mode: func.access === "public" ? "public" : "readonly",
  };
};

export const generateContractFromAbi = async ({
  contractName,
  principal,
  apiHost,
  output,
  packageName,
}: {
  contractName: string;
  aliasContractName?: string;
  principal: string;
  apiHost: string;
  output: string;
  packageName: string;
}): Promise<void> => {
  const url = `${apiHost}/v2/contracts/interface/${principal}/${contractName}`;
  const interfaceData = (await fetch(url).then((res) => res.json())) as any;
  const functions: Array<ClarityAbiFunction> = interfaceData.functions;

  if (functions.length === 0) return;

  const funcDefs = functions.reduce((acc, func) => {
    const res = toFunctionDescriptorDef(func);
    if (res) acc[func.name] = res;
    return acc;
  }, {} as Record<string, FunctionDescriptorDef>);

  const transcoderNames = getAllTranscoderName(
    Object.values(funcDefs).flatMap((funcDef) => [
      ...funcDef.input.map((i) => i.type),
      funcDef.output,
    ])
  );

  const source = `
import {
defineContract,
${transcoderNames.join(",\n")}
} from "${packageName}"

export const ${camelCase(contractName)} = defineContract({
"${contractName}": ${inspect(
    mapValues(funcDefs, (o) => ({
      input: o.input.map((i) => ({
        name: i.name,
        type: {
          [inspect.custom]: () => stringifyTranscoderDef(i.type),
        },
      })),
      output: {
        [inspect.custom]: () => stringifyTranscoderDef(o.output),
      },
      mode: o.mode,
    })),
    { depth: null }
  )}
} as const)


`;

  fs.writeFileSync(
    path.resolve(output, `./contract_${contractName}.ts`),
    source
  );
};

export const contractGenerator = async ({
  contracts,
  name,
  output,
  packageName,
}: {
  contracts: string[];
  name: string;
  output: string;
  packageName: string;
}): Promise<void> => {
  const importsObjects = contracts.map((n) => `...${camelCase(n)}`);
  const importsHeaders = contracts.map(
    (n) => `import { ${camelCase(n)} } from "./contract_${n}"`
  );
  const code = `import { defineContract } from "${packageName}";
${importsHeaders.join("\n")}

export const ${name}Contracts = defineContract({
${importsObjects.join(",\n")}
});

  `; /*? */

  fs.writeFileSync(path.resolve(output, `./contracts_${name}.ts`), code);
};
