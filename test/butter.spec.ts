
import { ethers } from 'ethers';
import { buildTransactionData, CrossChainParamsData, getRoute, getStatus, getTokenList } from '../src/index';
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

    it("should return route", async () => {
        const routeResult = await getRoute(bridgeName, crossChainParamsData);
        expect(!!routeResult).toEqual(true);
        expect(ethers.utils.isAddress(routeResult?.depositContract || '')).toEqual(true);
        expect(!isNaN(Number(routeResult?.toAmount))).toEqual(true);
        expect(typeof routeResult?.fee === 'object').toEqual(true);
        expect(typeof routeResult?.otherPayOut === 'string').toEqual(true);
        expect(routeResult?.interfaceParamData?.hash?.toString().length === 66).toEqual(true)
    });

    it("should return transaction data", async () => {
        const params = Object.assign(crossChainParamsData, { fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' });
        const routeResult = await getRoute(bridgeName, params);
        expect(!!routeResult).toEqual(true);
        const transactionInfo = await buildTransactionData(bridgeName, params, {
            hash: routeResult?.interfaceParamData?.hash,
        });
        expect(!!transactionInfo).toEqual(true);
        expect(typeof transactionInfo?.data === 'string').toEqual(true);
        expect(typeof transactionInfo?.value === 'string').toEqual(true);
        expect(ethers.utils.isAddress(transactionInfo?.to || '')).toEqual(true);
    });

    it("should return status", async () => {
        const statusInfo = await getStatus(bridgeName, { fromHash: '0xbfdb7e47b7e32d4289dd0806448f1ee6f9cb9a6539586f98d17eb448112550ed' } as any);
        expect(!!statusInfo).toEqual(true);
        expect(statusInfo?.toHash.length === 66).toEqual(true);
        expect(statusInfo?.statusInfo.status).toEqual('DONE');

    });

    it("should return tokenlist", async () => {
        // const tokenlistInfo = await getTokenList(bridgeName, crossChainParamsData as any);
        // expect(!!tokenlistInfo).toEqual(true);
        // expect(!!tokenlistInfo?.tokens.length).toEqual(true);
    });

});