
import { buildTransactionData, CrossChainParamsData, getBridgeConfig, getRoute, createOrder, getStatus, getTokenList, health } from '../src/index';
const bridgeName = 'butter';
jest.setTimeout(15000);
describe("butter api method test", () => {
    const crossChainParamsData: CrossChainParamsData = {
        fromChainId: 56,
        fromAmount: '20000000000000000000',
        fromTokenAddress: '0x55d398326f99059ff775485246999027b3197955',
        fromTokenDecimals: 18,
        fromTokenPrice: '1',
        fromPlatformTokenPrice: '300',
        toChainId: 137,
        toTokenAddress: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', 
        toTokenDecimals: 6,
        toTokenPrice: '1',
        fromAddress: '0xd8C446197cA9eE5b6cFC212460C9C5b621a5e1F2',
        toAddress: '0xd8C446197cA9eE5b6cFC212460C9C5b621a5e1F2',
        slippage: 0.01
    }
    it("should return butter config", async () => {
        try {
            const butterConfig = await getBridgeConfig(bridgeName);
            const routeResult = await getRoute(bridgeName, crossChainParamsData);
            console.log('routeResult:', routeResult)
            let transactionInfo;
            if (butterConfig.apiInterface.buildTransactionData) {
                transactionInfo = await buildTransactionData(bridgeName, crossChainParamsData, {
                    hash: routeResult?.interfaceParamData?.hash,
                });
            } else if (routeResult && !routeResult.transactionData) {
                transactionInfo = routeResult.transactionData;
            }

            expect(!!routeResult).toEqual(true);
            expect(!!transactionInfo).toEqual(true);

        } catch (error) {
            console.error(error)
        }

    });

});