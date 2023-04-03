import { getBridgeConfig } from "./bridge";
import { BuildTransactionDataResponse, CreateOrderResponse, CrossChainParamsData, RouteResponse, StatusResponse, TokenListResponse } from "./types"
import { getData } from "./utils/utils"

export * from "./types";
export * from "./bridge/index";

export async function getRoute(bridgeName: string, dodoData: CrossChainParamsData & { [key: string]: any }) {
    const config = await getBridgeConfig(bridgeName, true);
    return getData<RouteResponse>(dodoData, config.apiInterface.route)
}

export async function buildTransactionData(bridgeName: string, dodoData: CrossChainParamsData & { [key: string]: any }, interfaceParamData?: { [key: string]: any }) {
    const config = await getBridgeConfig(bridgeName, true);
    const apiInterface = config.apiInterface.buildTransactionData;
    if (!apiInterface) throw new Error('buildTransactionData 配置不存在');
    return getData<BuildTransactionDataResponse>(dodoData, apiInterface, interfaceParamData);
}

export async function getStatus(bridgeName: string, dodoData: CrossChainParamsData & { [key: string]: any }, interfaceParamData?: { [key: string]: any }) {
    const config = await getBridgeConfig(bridgeName);
    return getData<StatusResponse>(dodoData, config.apiInterface.status, interfaceParamData);
}

export async function getTokenList(bridgeName: string, dodoData: CrossChainParamsData & { [key: string]: any }, interfaceParamData?: { [key: string]: any }) {
    const config = await getBridgeConfig(bridgeName, true);
    return getData<TokenListResponse>(dodoData, config.apiInterface.tokenList, interfaceParamData);
}

export async function createOrder(bridgeName: string, dodoData: CrossChainParamsData & { [key: string]: any }, interfaceParamData?: { [key: string]: any }) {
    const config = await getBridgeConfig(bridgeName, true);
    const apiInterface = config.apiInterface.createOrder;
    if (!apiInterface) throw new Error('createOrder 配置不存在');
    return getData<CreateOrderResponse>(dodoData, apiInterface, interfaceParamData);
}
