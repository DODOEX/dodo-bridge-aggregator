import { getBridgeConfig } from "./bridge";
import { BuildTransactionDataResponse, CreateOrderResponse, CrossChainParamsDataAndOther, HealthResponse, RouteResponse, StatusResponse, TokenListResponse } from "./types"
import { getData } from "./utils/utils"

export * from "./types/index";
export * from "./bridge/index";

export async function getRoute(bridgeName: string, crossChainParamsData: CrossChainParamsDataAndOther) {
    const config = await getBridgeConfig(bridgeName, true);
    return getData<RouteResponse>(crossChainParamsData, config.apiInterface.route)
}

export async function buildTransactionData(bridgeName: string, crossChainParamsData: CrossChainParamsDataAndOther, interfaceParamData?: { [key: string]: any }) {
    const config = await getBridgeConfig(bridgeName, true);
    const apiInterface = config.apiInterface.buildTransactionData;
    if (!apiInterface) throw new Error('buildTransactionData 配置不存在');
    return getData<BuildTransactionDataResponse>(crossChainParamsData, apiInterface, interfaceParamData);
}

export async function getStatus(bridgeName: string, crossChainParamsData: CrossChainParamsDataAndOther, interfaceParamData?: { [key: string]: any }) {
    const config = await getBridgeConfig(bridgeName);
    return getData<StatusResponse>(crossChainParamsData, config.apiInterface.status, interfaceParamData);
}

export async function getTokenList(bridgeName: string, data?: Partial<CrossChainParamsDataAndOther>, interfaceParamData?: { [key: string]: any }) {
    const config = await getBridgeConfig(bridgeName, true);
    const crossChainParamsData = (data || {}) as CrossChainParamsDataAndOther;
    return getData<TokenListResponse>(crossChainParamsData, config.apiInterface.tokenList, interfaceParamData);
}

export async function createOrder(bridgeName: string, crossChainParamsData: CrossChainParamsDataAndOther, interfaceParamData?: { [key: string]: any }) {
    const config = await getBridgeConfig(bridgeName, true);
    const apiInterface = config.apiInterface.createOrder;
    if (!apiInterface) throw new Error('createOrder 配置不存在');
    return getData<CreateOrderResponse>(crossChainParamsData, apiInterface, interfaceParamData);
}

export async function health(bridgeName: string, crossChainParamsData: CrossChainParamsDataAndOther, interfaceParamData?: { [key: string]: any }) {
    const config = await getBridgeConfig(bridgeName, true);
    const apiInterface = config.apiInterface.health;
    if (!apiInterface) throw new Error('health 配置不存在');
    return getData<HealthResponse>(crossChainParamsData, apiInterface, interfaceParamData);
}
