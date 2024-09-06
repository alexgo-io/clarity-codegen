import * as fs from "fs";
import { camelCase } from "lodash";
import path from "path";
import { inspect } from "util";
import {
  ClarityAbi,
  ClarityAbiFunction,
  ClarityAbiMap,
  ClarityAbiType,
  ClarityAbiVariable,
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
import { asyncAutoRetry } from "../utils/asyncAutoRetry";
import axios from "axios";
import { AxiosError } from "axios";

type TranscoderDefType =
  | "uintT"
  | "intT"
  | "booleanT"
  | "principalT"
  | "traitT"
  | "noneT"
  | "stringT"
  | "stringAsciiT"
  | "bufferT"
  | "optionalT"
  | "responseSimpleT"
  | "listT"
  | "tupleT";
type TranscoderDefArgument = TranscoderDef | Record<string, TranscoderDef>;
type TranscoderDef = [TranscoderDefType, ...TranscoderDefArgument[]];

const toTranscoderDef = ({
  name,
  type,
}: {
  name?: string;
  type: ClarityAbiType;
}): { def: TranscoderDef } => {
  if (isClarityAbiPrimitive(type)) {
    if (type === "uint128") {
      return { def: ["uintT"] };
    } else if (type === "int128") {
      return { def: ["intT"] };
    } else if (type === "bool") {
      return { def: ["booleanT"] };
    } else if (type === "principal") {
      return { def: ["principalT"] };
    } else if (type === "trait_reference") {
      return { def: ["traitT"] };
    } else if (type === "none") {
      return { def: ["noneT"] };
    } else {
      assertNever(type);
    }
  }

  if (isClarityAbiStringUtf8(type)) {
    return { def: ["stringT"] };
  }

  if (isClarityAbiStringAscii(type)) {
    return { def: ["stringAsciiT"] };
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

type ContractEntryDescriptorDef =
  | {
      input: { name: string; type: TranscoderDef }[];
      output: TranscoderDef;
      mode: "public" | "readonly";
    }
  | {
      mode: "mapEntry";
      output: TranscoderDef;
      input: TranscoderDef;
    }
  | {
      mode: "variable" | "constant";
      input: ["noneT"];
      output: TranscoderDef;
    };

const toMapEntryDescriptorDef = (
  entry: ClarityAbiMap
): ContractEntryDescriptorDef => {
  return {
    input: toTranscoderDef({ type: entry.key }).def,
    output: toTranscoderDef({ type: { optional: entry.value } }).def,
    mode: "mapEntry",
  };
};

const toVariableDescriptorDef = (
  entry: ClarityAbiVariable
): ContractEntryDescriptorDef => {
  return {
    output: toTranscoderDef({ type: entry.type }).def,
    input: ["noneT"],
    mode: entry.access,
  };
};

const toFunctionDescriptorDef = (
  func: ClarityAbiFunction
): void | ContractEntryDescriptorDef => {
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
  projectName,
  contractName,
  principal,
  apiHost,
  outputDir: output,
  runtimePackagePath,
  contractOverwrites,
}: {
  projectName: string;
  contractName: string;
  aliasContractName?: string;
  principal: string;
  apiHost: string;
  outputDir: string;
  runtimePackagePath: string;
  contractOverwrites: { [from: string]: string };
}): Promise<void> => {
  const url = `${apiHost}/v2/contracts/interface/${principal}/${
    contractOverwrites[contractName] ?? contractName
  }`;
  const response = await asyncAutoRetry(() => axios.get(url), {
    isNeedRetry: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        return true;
      }
      return false;
    },
  });
  const interfaceData: ClarityAbi = response.data;
  const defs = {} as Record<string, ContractEntryDescriptorDef>;
  for (const func of interfaceData.functions) {
    const res = toFunctionDescriptorDef(func);
    if (res) defs[func.name] = res;
  }
  for (const mapEntry of interfaceData.maps) {
    defs[mapEntry.name] = toMapEntryDescriptorDef(mapEntry);
  }
  for (const varEntry of interfaceData.variables) {
    if (varEntry.access !== "variable") continue;
    defs[varEntry.name] = toVariableDescriptorDef(varEntry);
  }

  const transcoderNames = getAllTranscoderName(
    Object.values(defs).flatMap((def) => [
      ...(function () {
        switch (def.mode) {
          case "readonly":
          case "public":
            return def.input.map((i) => i.type);
          default:
            return [def.input];
        }
      })(),
      def.output,
    ])
  );

  const source = `
import {
defineContract,
${transcoderNames.join(",\n")}
} from "${runtimePackagePath}"

export const ${camelCase(contractName)} = defineContract({
"${contractName}": ${inspect(
    mapValues(defs, (o) => ({
      input: (function () {
        switch (o.mode) {
          case "readonly":
          case "public":
            return o.input.map((i) => ({
              name: i.name,
              type: {
                [inspect.custom]: () => stringifyTranscoderDef(i.type),
              },
            }));
          default:
            return {
              [inspect.custom]: () => stringifyTranscoderDef(o.input),
            };
        }
      })(),
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
    path.resolve(
      output,
      `./${getContractFileName(projectName, contractName)}.ts`
    ),
    source
  );
};

export const contractGenerator = async ({
  contracts,
  projectName,
  outputDir,
  runtimePackagePath,
}: {
  contracts: string[];
  projectName: string;
  outputDir: string;
  runtimePackagePath: string;
}): Promise<void> => {
  const importsObjects = contracts.map((n) => `...${camelCase(n)}`);
  const importsHeaders = contracts.map(
    (n) =>
      `import { ${camelCase(n)} } from "./${getContractFileName(
        projectName,
        n
      )}"`
  );
  const code = `import { defineContract } from "${runtimePackagePath}";
${importsHeaders.join("\n")}

export const ${projectName}Contracts = defineContract({
${importsObjects.join(",\n")}
});

  `; /*? */

  fs.writeFileSync(
    path.resolve(outputDir, `./contracts_${projectName}.ts`),
    code
  );
};

const getContractFileName = (projectName: string, contractName: string) =>
  `contract_${projectName}_${contractName}`;
