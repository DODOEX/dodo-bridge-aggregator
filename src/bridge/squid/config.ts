import { CrossChainBusinessException } from '../../exception/index';
import BigNumber from "bignumber.js";
import { find } from "lodash";
import { CrossChainConfig, StatusInfo } from "../../types";

const serverHost = 'https://api.0xsquid.com';

const errorCodes = {
    ERROR: { code: 'ERROR', message: 'unknown error' },
    NOT_SUPPORT: { code: 'NOT_SUPPORT', message: 'NOT SUPPORT' },
}
const squidConfig: CrossChainConfig = {
    name: 'squid_test',
    apiInterface: {
        route: {
            url: `${serverHost}/v1/route`,
            method: 'get',
            requestAfter: (res) => {
                if (!res.route) throw new CrossChainBusinessException(errorCodes.ERROR);

                const feeCosts = res.route.estimate.feeCosts; // 手续费
                let feeCostAll = '0';
                for (const feeCost of feeCosts) {
                    feeCostAll = BigNumber(feeCostAll).plus(feeCost.amount).toString(10)
                }
                res.route.feeCostAll = feeCostAll;
                return res.route;
            },
            requestMapping: {
                fromChain: "fromChainId",
                fromToken: 'fromTokenAddress',
                fromAmount: "fromAmount",
                toChain: "toChainId",
                toToken: "toTokenAddress",
                toAddress: "toAddress",
                slippage: {
                    format: (params) => params.slippage * 100
                },
                enableForecall: true,
                quoteOnly: false 
            },
            responseMapping: {
                depositContract: 'transactionRequest.targetAddress',
                toAmount: 'estimate.toAmount',
                fee: {
                    destinationGasFee: '0',
                    otherFee: {
                        format: async (data, { crossChainParamsData }) => {
                            return new BigNumber(data.feeCostAll).div(1e18).times(crossChainParamsData.fromPlatformTokenPrice).toString(10);
                        }
                    },
                },
                otherPayOut: {
                    format: async (data, { crossChainParamsData }) => {
                        return new BigNumber(data.feeCostAll).div(1e18).times(crossChainParamsData.fromPlatformTokenPrice).toString(10);
                    }
                },
                transactionData: {
                    data: 'transactionRequest.data',
                    value: 'transactionRequest.value',
                }
            }
        },
        status: {
            url: `${serverHost}/v1/status`,
            method: 'get',
            requestAfter: (res) => {
                if (!res.id) throw new CrossChainBusinessException(errorCodes.ERROR);
                return res;
            },
            requestMapping: {
                transactionId: 'fromHash',
            },
            responseMapping: {
                toHash: 'toChain.transactionId',
                statusInfo: {
                    format: (resResult: any): StatusInfo => {
                        const data: StatusInfo = { status: 'PENDING', bridgeResponseResult: resResult };
                        if (resResult.status === 'destination_executed') {
                            data.status = 'DONE';
                        } else if (resResult.status === 'source_gateway_called') {
                            data.status = 'PENDING';
                        } else if (resResult.status === 'DEST_ERROR' || resResult.status === 'ERROR_FETCHING_STATUS') {
                            data.status = 'FAILED';
                            data.message = `failed: ${resResult.status}`;
                        }
                        return data;
                    }
                },
            }
        },
        tokenList: {
            url: `${serverHost}/v1/sdk-info`,
            method: 'get',
            requestAfter: (res) => {
                if (!res.tokens) throw new CrossChainBusinessException(errorCodes.ERROR);
                return res;
            },
            responseMapping: {
                tokens: {
                    format: tokenResult => {
                        return tokenResult.tokens.map((item: any) => ({
                            chainId: item.chainId,
                            address: item.address,
                            name: item.name,
                            symbol: item.symbol,
                            decimals: item.decimals,
                            logoImg: item.logoURI,
                        }))
                    }
                },
            }
        },
    },
    errorCodes
}

export default squidConfig;