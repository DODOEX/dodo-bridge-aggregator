import axios, { AxiosError } from "axios";
import BigNumber from "bignumber.js";

import { CrossChainBusinessException } from "./../../exception/index";
import { CrossChainConfig, StatusInfo } from "../../types";
import { WETH_ADDRESSES } from "./utils";
import { ethers } from "ethers";

const vercelApiHost = "https://across.to";
const scraperApiHost = "https://api.across.to";

const errorCodes = {
  ERROR: { code: "ERROR", message: "unknown error" },
  SERVICE_UNAVAILABLE: {
    code: "SERVICE_UNAVAILABLE",
    message: "service unavailable",
  },
  // other error code
  UNSUPPORTED_TOKEN: {
    code: "UNSUPPORTED_TOKEN",
    message: "unsupported token",
  },
  AMOUNT_TOO_LOW: {
    code: "AMOUNT_TOO_LOW",
    message: "amount is too low relative to fees",
  },
  DEPOSIT_NOT_FOUND: {
    code: "DEPOSIT_NOT_FOUND",
    message: "deposit not found",
  },
};

const nativeCoinAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

const bridgeNameConfig: CrossChainConfig = {
  name: "across",
  apiInterface: {
    // Route (required)
    route: {
      url: `${vercelApiHost}/api/suggested-fees`,
      method: "get",
      // call this function before execution
      before: async (params) => {
        const { fromTokenAddress, fromChainId, toTokenAddress, toChainId } =
          params;

        const isFromTokenSupportedETH =
          fromTokenAddress === nativeCoinAddress &&
          !!WETH_ADDRESSES[fromChainId];
        const isToTokenSupportedETH =
          toTokenAddress === nativeCoinAddress && !!WETH_ADDRESSES[toChainId];

        const routes = await axios.get(
          `${vercelApiHost}/api/available-routes`,
          {
            params: {
              originToken: isFromTokenSupportedETH
                ? WETH_ADDRESSES[fromChainId]
                : fromTokenAddress,
              originChainId: fromChainId,
              destinationToken: isToTokenSupportedETH
                ? WETH_ADDRESSES[toChainId]
                : toTokenAddress,
              destinationChainId: toChainId,
            },
          }
        );

        if (routes.data.length === 0) {
          throw new CrossChainBusinessException(errorCodes.UNSUPPORTED_TOKEN);
        }

        return params;
      },
      // call this function after execution
      after: (err, res) => {
        if (!err) {
          return res;
        }

        if (err instanceof AxiosError) {
          if (err.response?.status === 400) {
            const errorRes = err.response;
            if (errorRes.data.match(/no.*token.*found/)) {
              throw new CrossChainBusinessException(
                errorCodes.UNSUPPORTED_TOKEN
              );
            }
            if (errorRes.data.match(/amount.*too.*low/)) {
              throw new CrossChainBusinessException(errorCodes.AMOUNT_TOO_LOW);
            }
          }
        }

        throw err;
      },
      // call this function after making API request
      requestAfter: (res) => res,
      // Interface request parameter data is put into "requestMapping", and field values are mapped from "CrossChainParamsData" parameters
      requestMapping: {
        amount: "fromAmount",
        destinationChainId: "toChainId",
        originChainId: "fromChainId",
        token: {
          format: (route) => {
            const isETH = route.fromTokenAddress === nativeCoinAddress;
            const isWETHSupported = Object.keys(WETH_ADDRESSES).includes(
              String(route.fromChainId)
            );
            return isETH && isWETHSupported
              ? WETH_ADDRESSES[route.fromChainId as keyof typeof WETH_ADDRESSES]
              : route.fromTokenAddress;
          },
        },
      },
      // The interface return data is put into "responseMapping", and the field values are mapped from "interface response data
      responseMapping: {
        depositContract: "spokePoolAddress", // deposit contract address
        toAmount: {
          // amount reaching the receiving chain, unit in gwei
          format: (route, { crossChainParamsData }) => {
            const fromAmount = new BigNumber(crossChainParamsData.fromAmount);
            const relayFeeTotal = new BigNumber(route.relayFeeTotal);
            const lpFeePct = new BigNumber(route.lpFeePct).div(10 ** 18);
            const lpFeeTotal = new BigNumber(fromAmount).multipliedBy(lpFeePct);
            return fromAmount.minus(lpFeeTotal).minus(relayFeeTotal).toString();
          },
        },
        fee: {
          swapFee: "0", // swap fee (USD)
          destinationGasFee: {
            // receiving chain gas fee (USD)
            format: (route, { crossChainParamsData }) => {
              return new BigNumber(route.relayGasFeeTotal)
                .div(10 ** crossChainParamsData.fromTokenDecimals)
                .times(crossChainParamsData.fromTokenPrice)
                .toString();
            },
          },
          crossChainFee: {
            // cross chain fee (USD)
            format: (route, { crossChainParamsData }) => {
              const fromAmount = new BigNumber(crossChainParamsData.fromAmount);
              const lpFeePct = new BigNumber(route.lpFeePct).div(10 ** 18);
              const lpFeeTotal = new BigNumber(fromAmount).multipliedBy(
                lpFeePct
              );
              const totalBridgeFee = new BigNumber(route.relayFeeTotal).plus(
                lpFeeTotal
              );
              return totalBridgeFee
                .minus(route.relayGasFeeTotal)
                .div(10 ** crossChainParamsData.fromTokenDecimals)
                .times(crossChainParamsData.fromTokenPrice)
                .toString();
            },
          },
          otherFee: "0", // other fee (USD)
        },
        // Additional fees deducted from wallet when initiating an onchain transaction (e.g. cross chain bridges may require an upfront fees paid in the sending chain's native token, defined as "otherPayOut")(USD)
        otherPayOut: "0",
        // "Route" API may return data needed for subsequent actions, and this data can be stored in "interfaceParamData" section for later use
        interfaceParamData: {
          relayFeePct: "relayFeePct",
          quoteTimestamp: "timestamp",
        },
      },
    },
    // Get Status Interface (required)
    status: {
      url: `${scraperApiHost}/deposits/details`,
      method: "get",
      after: (err, res) => {
        if (!err) {
          return res;
        }

        if (err instanceof AxiosError) {
          if (err.response?.status === 404) {
            return { toHash: '', statusInfo: { status: "NOT_FOUND", message: 'NOT_FOUND', bridgeResponseResult: {} } } as any;
            // throw new CrossChainBusinessException(errorCodes.DEPOSIT_NOT_FOUND);
          }
        }

        throw err;
      },
      requestAfter: (res) => res,
      requestMapping: {
        depositTxHash: "fromHash",
        originChainId: "fromChainId",
      },
      responseMapping: {
        toHash: {
          format: (resResult): string => {
            const isFilled = resResult.status === "filled";

            if (!isFilled) {
              return "";
            }

            return resResult.fillTxs[0].hash;
          },
        },
        statusInfo: {
          format: (resResult: any): StatusInfo => {
            const data: StatusInfo = {
              status: "PENDING",
              bridgeResponseResult: resResult,
            };
            if (resResult.status === "filled") {
              data.status = "DONE";
            }
            return data;
          },
        },
      },
    },
    // get information on tokens supporting cross chain transactions (required)
    tokenList: {
      url: `${vercelApiHost}/api/token-list`,
      method: "get",
      requestAfter: (res) => res,
      responseMapping: {
        tokens: {
          format: (tokenList) => {
            return tokenList.flatMap((item: any) => {
              return {
                chainId: Number(item.chainId),
                address:
                  item.symbol === "ETH" ? nativeCoinAddress : item.address,
                name: item.name,
                symbol: item.symbol,
                decimals: item.decimals,
                logoImg: item.logoURI,
              };
            });
          },
        },
      },
    },
    buildTransactionData: {
      // API to generate onchain transaction data. If "Route" API doesn't return "transactionData",  need to provide this API (optional)
      url: `${vercelApiHost}/api/build-deposit-tx`,
      method: "get",
      requestAfter: (res) => {
        return res;
      },
      requestMapping: {
        amount: "fromAmount",
        token: {
          format: (route) => {
            const isETH = route.fromTokenAddress === nativeCoinAddress;
            const isWETHSupported = Object.keys(WETH_ADDRESSES).includes(
              String(route.fromChainId)
            );
            return isETH && isWETHSupported
              ? WETH_ADDRESSES[route.fromChainId as keyof typeof WETH_ADDRESSES]
              : route.fromTokenAddress;
          },
        },
        destinationChainId: "toChainId",
        originChainId: "fromChainId",
        recipient: "toAddress",
        relayerFeePct: {
          format: (_, { interfaceParamData }) => interfaceParamData.relayFeePct,
        },
        quoteTimestamp: {
          format: (_, { interfaceParamData }) =>
            interfaceParamData.quoteTimestamp,
        },
        isNative: {
          format: (route) => route.fromTokenAddress === nativeCoinAddress,
        },
      },
      responseMapping: {
        data: {
          format: (resData, { crossChainParamsData }) => {
            if (crossChainParamsData.referrer) {
              return ethers.utils.hexConcat([resData.data, '0xd00dfeeddeadbeef', crossChainParamsData.referrer]);
            } else {
              return resData.data;
            }
          }
        },
        value: "value",
      },
    },
  },
  errorCodes, // errors status code
};

export default bridgeNameConfig;
