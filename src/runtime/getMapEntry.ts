import { fetchContractMapEntry } from "@stacks/transactions";
import type { StringOnly } from "../utils/helpers";
import type {
  ContractBaseType,
  ParameterObjOfDescriptor,
  MapEntryDescriptor,
  ReturnTypeOfDescriptor,
} from "./contractBase";

export type FetchContractMapEntryFn = typeof fetchContractMapEntry;

export type GetMapEntryFn<Contracts extends ContractBaseType> = <
  T extends StringOnly<keyof Contracts>,
  F extends StringOnly<keyof Contracts[T]>,
  Descriptor extends Contracts[T][F]
>(
  contractName: T,
  mapName: F,
  mapKey: Descriptor extends MapEntryDescriptor
    ? ParameterObjOfDescriptor<Descriptor>
    : never,
  options?: {
    deployerAddress?: string;
    fetchContractMapEntry?: FetchContractMapEntryFn;
  }
) => Promise<
  Descriptor extends MapEntryDescriptor
    ? ReturnTypeOfDescriptor<Descriptor>
    : never
>;

export const getMapEntryFactory =
  <T extends ContractBaseType>(
    contracts: T,
    factoryOptions: {
      deployerAddress?: string;
      fetchContractMapEntry?: FetchContractMapEntryFn;
    }
  ): GetMapEntryFn<T> =>
  async (contractName, mapName, mapKey, options = {}) => {
    const descriptor = contracts[contractName][mapName];

    if (descriptor.mode !== "mapEntry") {
      throw new Error(
        `[getMapEntry] ${contractName}.${mapName} should be a mapEntry`
      );
    }

    const clarityMapKey = descriptor.input.encode(mapKey);

    const deployerAddress =
      options.deployerAddress ?? factoryOptions.deployerAddress;
    if (deployerAddress == null) {
      throw new Error(`[getMapEntry] deployer address required`);
    }

    const _fetchContractMapEntry =
      options.fetchContractMapEntry ??
      factoryOptions.fetchContractMapEntry ??
      fetchContractMapEntry;

    const result = await _fetchContractMapEntry({
      contractName,
      mapName,
      mapKey: clarityMapKey,
      contractAddress: deployerAddress,
    });

    return descriptor.output.decode(result);
  };
