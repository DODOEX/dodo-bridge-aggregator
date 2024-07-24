import { CrossChainBusinessException } from "../../exception/index";
import BigNumber from "bignumber.js";
import axios from "axios";
import { CrossChainConfig, StatusInfo } from "../../types";

const serverHost = "https://bs-router-v3.chainservice.io";

const tokenServerHost = "https://bs-tokens-api.chainservice.io";

const bridgeServerHost = "https://bs-tokens-api.chainservice.io";

const dodoNativeAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const butterNativeAddress = "0x0000000000000000000000000000000000000000";

const errorCodes = {
  ERROR: { code: "ERROR", message: "unknown error" },
  NOT_SUPPORT: { code: "NOT_SUPPORT", message: "NOT SUPPORT" },
};

async function getChainList() {
  const res = await axios.get(`${tokenServerHost}/api/queryChainList`, { headers: { "Content-Type": "application/json" } });
  if (res.status !== 200 || res.data.resCode !== 100) {
      throw Error(`【ERROR】 getChainList ${res.data.resMsg}`);
  }
  return res.data.data;
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
          throw new CrossChainBusinessException(errorCodes.ERROR);
        return res.data;
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
            ),
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
        toAmount: "minAmountOut.amount",
        fee: {
          swapFee: "gasFee.amount",
          crossChainFee: "bridgeFee.amount",
          destinationGasFee: "0",
        },
        otherPayOut: "0",
        interfaceParamData: {
          hash: "data.route.hash",
        },
      },
    },
    buildTransactionData: {
      requestMapping: {
        hash: "hash", // interfaceParamData.hash
        slippage: { format: (params) => params.slippage * 100 },
        from: "from",
        receiver: "receiver",
      },
      url: `${serverHost}/swap`,
      method: "get",
      requestAfter: (res) => {
        if (res.resCode !== 0)
          throw new CrossChainBusinessException(errorCodes.ERROR);
        return res.data;
      },
      responseMapping: {
        data: "txParam.data",
        value: "txParam.value",
        // to: "txParam.to",
      },
    },
    status: {
      url: `${bridgeServerHost}/api/queryBridgeInfoBySourceHash`,
      method: "get",
      requestMapping: {
        hash: "hash",
      },
      responseMapping: {
        toHash: "toHash",
        statusInfo: {
          format: (resResult: any): StatusInfo => {
            const data: StatusInfo = {
              status: "PENDING",
              bridgeResponseResult: resResult,
            };
            if (resResult.status === "1") {
              data.status = "DONE";
            } else if (resResult.status === "0") {
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
      url: `${tokenServerHost}/api/queryTokenList`,
      method: "get",
      requestMapping: {
        network: "fromChainId", // chain id
        page: "page",
        size: "pageSize",
      },
      responseMapping: {
        tokens: {
          format: (res) => {
            return {
              results: res.data.map((item: any) => {
                return {
                  id: item.id,
                  chainId: item.chainId,
                  address: item.address,
                  decimals: item.decimals,
                  logoImg: item.image,
                  name: item.name,
                  symbol: item.symbol,
                };
              }),
            };
          },
        },
      },
      before: (params) => {
        
      },
      requestAfter: (res) => {
        return res.data;
      },
    },
  },
  errorCodes,
};

export default butterConfig;
