import { CrossChainBusinessException } from '../../exception/index';
import { CrossChainConfig, StatusInfo } from "../../types";

const SERVER_HOST = 'https://router-api.openliq.com';
// const SERVER_HOST = 'http://127.0.0.1:9901';

const errorCodes = {
    ERROR: { code: 'ERROR', message: 'unknown error' },
    NOT_SUPPORT: { code: 'NOT_SUPPORT', message: 'NOT SUPPORT' },
}
const openliqConfig: CrossChainConfig = {
    name: 'openliq',
    apiInterface: {
        route: {
            url: `${SERVER_HOST}/v2/trade/route`,
            method: 'get',
            requestAfter: (res) => {
                // console.log('requestAfter ===>>> ',res)
                if (res.errno!=0) throw new CrossChainBusinessException(errorCodes.ERROR);
                // const feeCosts = res.route.estimate.feeCosts; // 手续费
                // let feeCostAll = '0';
                // for (const feeCost of feeCosts) {
                //     feeCostAll = BigNumber(feeCostAll).plus(feeCost.amount).toString(10)
                // }
                // res.route.feeCostAll = feeCostAll;
                res.data.feeCostAll = res.data.protocolFee;
                return res.data;
            },
            requestMapping: {
                fromChainId: "fromChainId",
                fromTokenAddress: 'fromTokenAddress',
                amount: "fromAmount",
                toChainId: "toChainId",
                toTokenAddress: "toTokenAddress",
                receiverAddress: "toAddress",
                fromAddress: "fromAddress",
                slippageTolerance: {
                    format: (params) => params.slippage
                },
                enableForecall: true,
                quoteOnly: false 
            },
            responseMapping: {
                depositContract: 'tx.to',
                toAmount: 'toTokenAmount',
                fee: {
                    destinationGasFee: '0',
                    otherFee: 'protocolFee',
                },
                otherPayOut: '',
                transactionData: {
                    data: 'tx.data',
                    value: 'tx.value',
                }
            }
        },
        status: {
            url: `${SERVER_HOST}/v2/trade/status`,
            method: 'get',
            requestAfter: (res) => {
                console.log('requestAfter==>>',res)
                if (res.errno==2017){
                    return {
                        status:5
                    }
                }
                if (res.errno!=0) throw new CrossChainBusinessException(errorCodes.ERROR);
                if (!res.data || !res.data.info){
                    return {
                        status:5
                    }
                }
                return res.data.info;
            },
            requestMapping: {
                hash: 'fromHash',
                chainId: 'fromChainId',
            },
            responseMapping: {
                toHash: '',
                statusInfo: {
                    format: (resResult: any): StatusInfo => {
                        //0:DONE, 1: PENDING, 2: FAILED 3: TRANSFER_REFUNDED, 4: INVALID, 5: NOT_FOUND
                        const data: StatusInfo = { status: 'PENDING', bridgeResponseResult: resResult };
                        if (resResult.state == 0) {
                            data.status = 'DONE';
                        } else if (resResult.state == '3') {
                            data.status = 'TRANSFER_REFUNDED';
                        } else  if (resResult.state == '4') {
                            data.status = 'INVALID';
                        } else  if (resResult.state == '5') {
                            data.status = 'NOT_FOUND';
                        } else if (resResult.state == '2') {
                            data.status = 'FAILED';
                            data.message = `failed: ${resResult.state}`;
                        }
                        return data;
                    }
                },
            }
        },
        tokenList: {
            url: `${SERVER_HOST}/v2/trade/tokens`,
            method: 'get',
            requestAfter: (res) => {
                // console.log('requestAfter',res)
                if (res.errno!=0) throw new CrossChainBusinessException(errorCodes.ERROR);
                return res.data;
            },
            requestMapping: {
                fromChainId: 'fromChainId',
                toChainId: 'toChainId',
            },
            responseMapping: {
                tokens: {
                    format: tokenResult => {
                        return tokenResult.items.map((item: any) => ({
                            chainId: item.chainId,
                            address: item.address,
                            name: item.name,
                            symbol: item.symbol,
                            decimals: item.decimals,
                            logoImg: item.image,
                        }))
                    }
                },
            }
        },
    },
    errorCodes
}

export default openliqConfig;