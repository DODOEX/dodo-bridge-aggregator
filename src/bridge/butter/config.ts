import { CrossChainBusinessException } from "../../exception/index";
import BigNumber from "bignumber.js";
import axios from "axios";
import { CrossChainConfig, StatusInfo } from "../../types";
import { flatten, ceil } from "lodash";

const serverHost = "https://bs-router-v3.chainservice.io";

const tokenServerHost = "https://bs-tokens-api.chainservice.io";

const bridgeServerHost = "https://bs-app-api.chainservice.io";

const dodoNativeAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const butterNativeAddress = "0x0000000000000000000000000000000000000000";

const errorCodes = {
  ERROR: { code: "ERROR", message: "unknown error" },
  NOT_SUPPORT: { code: "NOT_SUPPORT", message: "NOT SUPPORT" },
  NOT_ROUTE: { code: "NOT_ROUTE", message: "NOT ROUTE" },
};

const codes: any = {
  2000: { code: "PARAMETER_ERROR", message: "The Chain not Support" },
  2001: { code: "CHAIN_NOT_SUPPORT", message: "The Chain not Support" },
  2002: { code: "TOKEN_NOT_SUPPORT", message: "The Token not Support" },
  2003: { code: "NOT_ROUTE", message: "No Route Found" },
  2004: { code: "INSUFFICIENT_LIQUIDITY", message: "Insufficient Liquidity" },
  2005: { code: "NOT_SUPPORT_SLIPPAGE", message: "Slippage Out of Range" },
  2006: { code: "INSUFFICIENT_AMOUNT", message: "Insufficient amount" },
  2007: { code: "INVALID_ADDRESS", message: "Invalid address" },
};

async function getTokenList(network: string, page: number, size: number) {
  const res = await axios.get(`${tokenServerHost}/api/queryTokenList`, { params: { network, page, size }, headers: { "Content-Type": "application/json" } });
  if (res.status !== 200 || res.data.code !== 200) {
    throw new CrossChainBusinessException(errorCodes.ERROR);
  }
  return res.data.data;
}

async function getTokenListAll(network: string) {
  const size = 1000;
  const tokens = [];

  const tokenlistResult = await getTokenList(network, 1, size);
  const tasks = [];
  const count = ceil(tokenlistResult.count / size)
  for (let i = 2; i <= count; i++) {
    tasks.push(getTokenList(network, i, size))
  }
  const tokenlistResults = await Promise.all(tasks);
  for (const tokenlists of [tokenlistResult, ...tokenlistResults]) {
    for (const item of tokenlists.results) {
      tokens.push({
        chainId: item.chainId,
        address: item.address.toLowerCase() === '0x0000000000000000000000000000000000000000' ? dodoNativeAddress : item.address,
        name: item.name,
        symbol: item.symbol,
        decimals: item.decimals,
        logoImg: item.image
      })
    }
  }
  return tokens;
}

/**
 * curl -X 'GET' \
  'https://bs-router-v3.chainservice.io/routeAndSwap?fromChainId=56&toChainId=22776&amount=1&tokenInAddress=0x55d398326f99059fF775485246999027B3197955&tokenOutAddress=0x0000000000000000000000000000000000000000&type=exactIn&slippage=100&entrance=Butter%2B&from=0x2D4C407BBe49438ED859fe965b140dcF1aaB71a9&receiver=0x2D4C407BBe49438ED859fe965b140dcF1aaB71a9' \
  -H 'accept: application/json'
 */
const butterConfig: CrossChainConfig = {
  name: "butter",
  apiInterface: {
    route: {
      url: `${serverHost}/route`,
      method: "get",
      requestAfter: (res) => {
        if (res.errno !== 0)
          throw new CrossChainBusinessException({ code: codes[res.errno]?.code || errorCodes.NOT_ROUTE.code, message: res.message });
        if (res.data.length < 1)
          throw new CrossChainBusinessException(errorCodes.NOT_ROUTE);
        return res.data[0];
      },
      requestMapping: {
        fromChainId: "fromChainId",
        tokenInAddress: {
          format: (route) => {
            return route.fromTokenAddress === dodoNativeAddress
              ? butterNativeAddress
              : route.fromTokenAddress;
          },
        },
        amount: {
          format: (params) =>
            new BigNumber(params.fromAmount).div(
              10 ** params.fromTokenDecimals
            ).toString(),
        },
        toChainId: "toChainId",
        tokenOutAddress: {
          format: (route) => {
            return route.toTokenAddress === dodoNativeAddress
              ? butterNativeAddress
              : route.toTokenAddress;
          },
        },
        type: "exactIn", //exactIn, exactOut
        slippage: { format: (params) => params.slippage * 10000 },
        entrance: "Butter+", //eg: Butter+
      },
      responseMapping: {
        // Call the swap API to exchange and cross assets and retrieve the deposit contract information
        depositContract: "contract",
        toAmount: {
          format: (route, { crossChainParamsData }) => {
            return new BigNumber(route.minAmountOut.amount)
              .times(10 ** crossChainParamsData.toTokenDecimals)
              .toFixed(0)
          }
        },
        fee: {
          swapFee: '0',
          crossChainFee: {
            format: (route) => {
              if (route.bridgeFee.symbol === route.srcChain.tokenOut.symbol) {
                return {
                  chainId: route.srcChain.chainId,
                  address: route.srcChain.tokenOut.address,
                  amount: route.bridgeFee.amount,
                  unit: 'ether',
                  symbol: route.srcChain.tokenOut.symbol,
                  decimals: route.srcChain.tokenOut.decimals
                }
              } else if (route.bridgeFee.symbol === route.dstChain.tokenIn.symbol) {
                return {
                  chainId: route.dstChain.chainId,
                  address: route.dstChain.tokenIn.address,
                  amount: route.bridgeFee.amount,
                  unit: 'ether',
                  symbol: route.dstChain.tokenIn.symbol,
                  decimals: route.srcChain.tokenIn.decimals
                }
              } else if (route.bridgeChain.tokenIn.symbol === 'WMAPO') {
                return '0';
              } else {
                return route.bridgeFee;
              }
            }
          },
          destinationGasFee: '0',
        },
        otherPayOut: {
          format: (route) => {
            if (route.bridgeChain.tokenIn.symbol === 'WMAPO') {
              return new BigNumber(route.bridgeFee.amount).times(route.fromPlatformTokenPrice).toString();
            } else {
              return '0';
            }
          }
        },
        interfaceParamData: {
          hash: "hash",
        },
      },
    },
    buildTransactionData: {
      requestMapping: {
        hash: { format: (_, { interfaceParamData }) => interfaceParamData.hash }, // interfaceParamData.hash
        slippage: { format: (params) => params.slippage * 10000 },
        from: "fromAddress", // 源链上的发送者地址
        receiver: "toAddress", // 目标链上的接收者地址
      },
      url: `${serverHost}/swap`,
      method: "get",
      requestAfter: (res) => {
        if (res.errno !== 0) throw new CrossChainBusinessException({ code: codes[res.errno]?.code || errorCodes.NOT_ROUTE.code, message: res.message });
        else if (res.data.length < 1) throw new CrossChainBusinessException(errorCodes.ERROR);
        return res.data[0];
      },
      responseMapping: {
        data: "data",
        value: "value",
        to: "to",
      },
    },
    status: {
      url: `${bridgeServerHost}/api/queryBridgeInfoBySourceHash`,
      method: "get",
      requestMapping: {
        hash: "fromHash",
      },
      responseMapping: {
        toHash: "info.toHash",
        statusInfo: {
          format: (resResult: any): StatusInfo => {
            const data: StatusInfo = {
              status: "PENDING",
              bridgeResponseResult: resResult,
            };
            if (resResult.info.state === 1) {
              data.status = "DONE";
            } else if (resResult.info.state === 0) {
              data.status = "PENDING";
            }
            return data;
          },
        },
      }, // 0: crossing, 1: completed
      requestAfter: (res) => {
        return res.data;
      },
    },
    tokenList: {
      url: `${tokenServerHost}/api/queryChainList`,
      method: "get",
      requestMapping: {},
      requestAfter: async (res) => {
        if (res.code !== 200)
          throw new CrossChainBusinessException(errorCodes.ERROR);
        const tasks = [];
        for (const item of res.data.chains) {
          tasks.push(getTokenListAll(item.key))
        }
        const tokenAlls = await Promise.all(tasks);

        return flatten(tokenAlls);
      },
      responseMapping: {
        tokens: {
          format: (res) => {
            return res.map((item: any) => ({
              chainId: Number(item.chainId),
              address: item.address,
              decimals: item.decimals,
              logoImg: item.logoImg,
              name: item.name,
              symbol: item.symbol,
            }))
          },
        },
      },
    },
  },
  errorCodes,
};

export default butterConfig;
