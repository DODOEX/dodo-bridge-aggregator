
import { buildTransactionData, CrossChainParamsData, getBridgeConfig, getRoute, createOrder, getStatus, getTokenList, health } from '../src/index';
const bridgeName = 'swft_test';
describe("swft api method test", () => {
    const crossChainParamsData: CrossChainParamsData = {
        fromChainId: 56, // 来源链
        fromAmount: '20000000000000000000', // 来源金额
        fromTokenAddress: '0x55d398326f99059ff775485246999027b3197955', // 来源token地址
        fromTokenDecimals: 18,
        fromTokenPrice: '1',
        fromPlatformTokenPrice: '300',
        toChainId: 137, // 目标链
        toTokenAddress: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // 目标token 地址
        toTokenDecimals: 6,
        toTokenPrice: '1',
        fromAddress: '0xd8C446197cA9eE5b6cFC212460C9C5b621a5e1F2', // 来源用户地址
        toAddress: '0xd8C446197cA9eE5b6cFC212460C9C5b621a5e1F2', // 目标用户地址
        slippage: 0.01
    }
    it("should return swft_test config", async () => {
        try {
            const swftConfig = await getBridgeConfig(bridgeName);
            const routeResult = await getRoute(bridgeName, crossChainParamsData);
            // console.log('routeResult:', routeResult)
            let transactionInfo;
            if (swftConfig.apiInterface.buildTransactionData) {
                transactionInfo = await buildTransactionData(bridgeName, crossChainParamsData, routeResult?.interfaceParamData);
            } else if (routeResult && !routeResult.transactionData) {
                transactionInfo = routeResult.transactionData;
            }
            // console.log('transactionInfo:', transactionInfo);

            expect(!!routeResult).toEqual(true);
            expect(!!transactionInfo).toEqual(true);

            // const createOrderResult = await createOrder(bridgeName, crossChainParamsData, routeResult?.interfaceParamData);
            // const statusResult = await getStatus(bridgeName, crossChainParamsData, routeResult?.interfaceParamData);
            // const tokenListResult = await getTokenList(bridgeName, crossChainParamsData);
            // const healthResult = await health(bridgeName, crossChainParamsData);
        } catch (error) {
            console.error(error)
        }

    });

});