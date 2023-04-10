import { CrossChainBusinessException } from './../../exception/index';
import axios from "axios";
import BigNumber from "bignumber.js";
import { find } from "lodash";
import { CrossChainConfig, StatusInfo } from "../../types";

const serverHost = 'https://sswap.swft.pro';
async function getToken() {
    const res = await axios.post(`${serverHost}/api/exchangeRecord/getToken`, null, { headers: { "Content-Type": "application/json" } });
    if (res.status !== 200 || res.data.resCode !== 100) {
        console.error('getToken:', res.data);
        throw Error(`【ERROR】 getToken ${res.data.resMsg}`);
    }
    return res.data.data;
}

const errorCodes = {
    ERROR: { code: 'ERROR', message: 'unknown error' },
    NOT_SUPPORT: { code: 'NOT_SUPPORT', message: 'NOT SUPPORT' },
}
const swftConfig: CrossChainConfig = {
    name: 'swft_test',
    apiInterface: {
        health: {
            url: `http://127.0.0.1:3000/health`,
            method: 'get',
            requestAfter: (res) => {
                if (res.code !== 0) throw new CrossChainBusinessException(errorCodes.ERROR);
                return { isAvailable: res.data, description: res.data ? 'ok' : 'maintain' };
            },
            responseMapping: {
                isAvailable: 'isAvailable',
                description: 'description'
            }
        },
        route: {
            url: `${serverHost}/api/sswap/quote`,
            method: 'post',
            headers: { "Content-Type": "application/json" },
            before: async (params: any) => {
                const tokenResult = await getToken();
                const fromChainInfo = find(tokenResult.tokens, (item: any) => item.address.toLowerCase() === params.fromTokenAddress.toLowerCase() && item.chainId === String(params.fromChainId));
                const toChainInfo = find(tokenResult.tokens, (item: any) => item.address.toLowerCase() === params.toTokenAddress.toLowerCase() && item.chainId === String(params.toChainId));
                if (!fromChainInfo || !toChainInfo) throw new CrossChainBusinessException(errorCodes.NOT_SUPPORT);
                return { fromChainInfo, toChainInfo };
            },
            after: (err, res) => {
                if (err) throw new CrossChainBusinessException(errorCodes.ERROR);
                return res;
            },
            requestAfter: (res) => {
                if (res.resCode !== 100) throw new CrossChainBusinessException(errorCodes.ERROR);
                return res.data;
            },
            requestMapping: {
                equipmentNo: {
                    format: params => params.fromAddress.substring(0, 32)
                }, // 设备号（该字段将作为用户的唯一标识，三方可通过自己的方式获得，如fromAddress的前32位字符，或者32位随机数字与字母结合的字符串）
                sourceFlag: "DODO",
                fromTokenAddress: 'fromTokenAddress',
                toTokenAddress: 'toTokenAddress',
                fromTokenAmount: "fromAmount",
                fromTokenChain: {
                    format: (_, { beforeResult }) => beforeResult.fromChainInfo.chain
                },
                toTokenChain: {
                    format: (_, { beforeResult }) => beforeResult.toChainInfo.chain
                },
                userAddr: "toAddress"
            },
            responseMapping: {
                depositContract: 'txData.contractAddress',
                toAmount: 'txData.amountOutMin',
                fee: {
                    swapFee: '0',
                    destinationGasFee: {
                        format: (route, { crossChainParamsData }) => {
                            return new BigNumber(crossChainParamsData.fromAmount).times(route.txData.fee).div(`1e${crossChainParamsData.fromTokenDecimals}`).times(crossChainParamsData.fromTokenPrice).toString(10)
                        }
                    },
                    crossChainFee: {
                        format: (route, { crossChainParamsData }) => {
                            return new BigNumber(route.txData.chainFee).times(crossChainParamsData.toTokenPrice).toString(10)
                        }
                    },
                    otherFee: '0',
                },
                otherPayOut: '0',
                interfaceParamData: {
                    equipmentNo: {
                        format: (_, { crossChainParamsData }) => crossChainParamsData.fromAddress.substring(0, 32)
                    },
                    sourceFlag: "DODO",
                    fromTokenAddress: {
                        format: (_, { crossChainParamsData }) => {
                            return crossChainParamsData.fromTokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' : crossChainParamsData.fromTokenAddress
                        }
                    },
                    toTokenAddress: {
                        format: (_, { crossChainParamsData }) => {
                            return crossChainParamsData.toTokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' : crossChainParamsData.toTokenAddress
                        }
                    },
                    fromAddress: {
                        format: (_, { crossChainParamsData }) => crossChainParamsData.fromAddress
                    },
                    toAddress: {
                        format: (_, { crossChainParamsData }) => crossChainParamsData.toAddress
                    },
                    fromTokenChain: {
                        format: (_, { beforeResult }) => beforeResult.fromChainInfo.chain
                    },
                    toTokenChain: {
                        format: (_, { beforeResult }) => beforeResult.toChainInfo.chain
                    },
                    fromTokenAmount: 'txData.fromTokenAmount',
                    amountOutMin: 'txData.amountOutMin',
                    fromCoinCode: {
                        format: (_, { beforeResult }) => beforeResult.fromChainInfo.symbol
                    },
                    toCoinCode: {
                        format: (_, { beforeResult }) => beforeResult.toChainInfo.symbol
                    },
                },
            }
        },
        buildTransactionData: {
            requestMapping: {
                equipmentNo: 'equipmentNo',
                sourceFlag: 'sourceFlag',
                fromTokenAddress: 'fromTokenAddress',
                toTokenAddress: 'toTokenAddress',
                fromAddress: 'fromAddress',
                toAddress: 'toAddress',
                fromTokenChain: 'fromTokenChain',
                toTokenChain: 'toTokenChain',
                fromTokenAmount: 'fromTokenAmount',
                amountOutMin: 'amountOutMin',
                fromCoinCode: 'fromCoinCode',
                toCoinCode: 'toCoinCode',
            },
            url: `${serverHost}/api/sswap/swap`,
            method: 'post',
            requestAfter: (res) => {
                if (res.resCode !== 100) throw new CrossChainBusinessException(errorCodes.ERROR);
                return res.data;
            },
            responseMapping: {
                data: 'txData.data',
                value: 'txData.value',
            }
        },
        createOrder: {
            url: `${serverHost}/api/exchangeRecord/updateDataAndStatus`,
            method: 'post',
            requestAfter: (res) => {
                if (res.resCode !== 100) throw new CrossChainBusinessException(errorCodes.ERROR);
                return res.data;
            },
            before: async (params) => {
                const tokenResult = await getToken();
                const fromChainInfo = find(tokenResult.tokens, item => item.address.toLowerCase() === params.fromTokenAddress.toLowerCase() && item.chainId === String(params.fromChainId));
                const toChainInfo = find(tokenResult.tokens, item => item.address.toLowerCase() === params.toTokenAddress.toLowerCase() && item.chainId === String(params.toChainId));
                if (!fromChainInfo || !toChainInfo) return { success: false };
                return { success: true, data: { fromChainInfo, toChainInfo } };
            },
            requestMapping: {
                equipmentNo: 'equipmentNo',
                sourceFlag: "DODO",
                fromTokenAddress: 'fromTokenAddress',
                toTokenAddress: 'toTokenAddress',
                fromAddress: 'fromAddress',
                toAddress: 'toAddress',
                fromTokenChain: 'fromTokenChain',
                toTokenChain: 'toTokenChain',
                fromTokenAmount: 'fromTokenAmount',
                amountOutMin: 'amountOutMin',
                fromCoinCode: 'fromCoinCode',
                toCoinCode: 'toCoinCode',
                hash: 'fromHash'
            },
            responseMapping: {
                interfaceParamData: {
                    orderId: 'orderId',
                }
            }
        },
        status: {
            url: `${serverHost}/api/exchangeRecord/getTransDataById`,
            method: 'post',
            after: (error, returnData) => {
                if (error) throw error;
                return returnData;
            },
            requestAfter: (res) => {
                if (res.resCode !== 100) throw new CrossChainBusinessException(errorCodes.ERROR);
                return res.data;
            },
            requestMapping: {
                orderId: 'orderId',
            },
            responseMapping: {
                toHash: 'toHash',
                statusInfo: {
                    format: (resResult: any): StatusInfo => {
                        const data: StatusInfo = { status: 'PENDING', bridgeResponseResult: resResult };
                        if (resResult.status === 'receive_complete') {
                            data.status = 'DONE';
                        } else if (resResult.status === 'refund_complete') {
                            data.status = 'TRANSFER_REFUNDED';
                        } else if (resResult.sourceTxStatus === 'timeout' || resResult.sourceTxStatus === 'error') {
                            data.status = 'FAILED';
                            data.message = `failed: ${resResult.sourceTxStatus}`;
                        }
                        return data;
                    }
                },
            }
        },
        tokenList: {
            url: `${serverHost}/api/exchangeRecord/getToken`,
            method: 'post',
            requestAfter: (res) => {
                if (res.resCode !== 100) throw new CrossChainBusinessException(errorCodes.ERROR);
                return res.data;
            },
            responseMapping: {
                tokens: {
                    format: tokenResult => {
                        return tokenResult.tokens.map((item: any) => ({
                            chainId: Number(item.chainId),
                            address: item.address,
                            name: item.name,
                            symbol: item.symbol.substring(0, item.symbol.indexOf("(")),
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

export default swftConfig;