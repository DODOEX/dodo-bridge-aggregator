[中文](https://github.com/DODOEX/dodo-bridge-aggregator/blob/main/README-ZH.md) / English

# Table of Contents

- [TL;DR](https://github.com/DODOEX/dodo-bridge-aggregator#tldr)
- [Clone codes](https://github.com/DODOEX/dodo-bridge-aggregator#clone-codes)
- [Configuration](https://github.com/DODOEX/dodo-bridge-aggregator#configuration)
  - [1. Add config file](https://github.com/DODOEX/dodo-bridge-aggregator#1-add-config-file)
  - [2. Config](https://github.com/DODOEX/dodo-bridge-aggregator#2-config)
    - [a. Prepare config data](https://github.com/DODOEX/dodo-bridge-aggregator#a-prepare-config-data)
    - [b. Config items](https://github.com/DODOEX/dodo-bridge-aggregator#b-config-items)
      - [i. route](https://github.com/DODOEX/dodo-bridge-aggregator#i-route)
      - [ii. status](https://github.com/DODOEX/dodo-bridge-aggregator#ii-status)
      - [iii. tokenList](https://github.com/DODOEX/dodo-bridge-aggregator#iii-tokenlist)
      - [iv. buildTransactionData](https://github.com/DODOEX/dodo-bridge-aggregator#iv-buildtransactiondata)
      - [v. createOrder](https://github.com/DODOEX/dodo-bridge-aggregator#v-createorder)
      - [vi. health](https://github.com/DODOEX/dodo-bridge-aggregator#vi-health)
  - [3. Test config](https://github.com/DODOEX/dodo-bridge-aggregator#4-test-config)
  - [4. Submit merged config](https://github.com/DODOEX/dodo-bridge-aggregator#4-submit-merged-config)

# TL;DR

This repository contains codes for cross-chain bridges to submit a config file to DODO so as to get your liquidity aggregated by DODO. The config file will include info on API Config and data conversion. Upon completion of config, you could submit via ‘[Submit Mergerd Config](https://github.com/DODOEX/dodo-bridge-aggregator#4-submit-merged-config)’ to DODO.

# Clone codes

```bash
$ git clone https://github.com/DODOEX/dodo-bridge-aggregator.git
```

# Configuration

## 1. Add config file

```bash
$ mkdir src/bridge/[bridgeName]
$ touch src/bridge/[bridgeName]/config.ts
```

## 2. Config

### a. Prepare config data

> Copy the following template to 【src/bridge/[bridgeName]/config.ts】, and then modify accordingly.  
> There are four functions in the template, including route, buildTransactionData, status, and tokenList. Modify settings to get corresponding responses.  
> For other parameters, refer to data in 【src/bridge/swft/config.ts, src/bridge/squid/config.ts】.

```js
import { CrossChainBusinessException } from "./../../exception/index";
import {
  CrossChainConfig,
  CrossChainParamsData,
  StatusInfo,
} from "../../types";
import BigNumber from "bignumber.js";

const serverHost = "http://127.0.0.1:8080";
const errorCodes = {
  ERROR: { code: "ERROR", message: "unknown error" },
  SERVICE_UNAVAILABLE: {
    code: "SERVICE_UNAVAILABLE",
    message: "service unavailable",
  },
  // other error code
};
const bridgeNameConfig: CrossChainConfig = {
  name: "bridge_name", // bridge's name
  //  API configuration
  apiInterface: {
    // Route (required)
    route: {
      url: `${serverHost}/api/route`, // API Request URL
      method: "get", // API method ( get/post/put)
      // call this function before execution
      before: async (params: CrossChainParamsData) => {
        const fromAmountUSD = new BigNumber(params.fromAmount)
          .div(10 ** params.fromTokenDecimals)
          .times(params.fromTokenPrice);
        return { fromAmountUSD }; //  The data returned here is available in the "format" function in 'requestMapping' and 'responseMapping'
      },
      // call this function after execution
      after: (err, res) => {
        // need to check if any errors
        if (err) throw new CrossChainBusinessException(errorCodes.ERROR);
        return res;
      },
      // call this function after making API request
      requestAfter: (res) => {
        // check if API request returns a valid or expected response; throw an exception or error if the respons is not normal or expected
        if (res.code !== 200)
          throw new CrossChainBusinessException(errorCodes.ERROR);
        return res.data;
      },
      // Interface request parameter data is put into "requestMapping", and field values are mapped from "CrossChainParamsData" parameters
      requestMapping: {
        fromChain: "fromChainId",
        fromAmount: {
          format: (_, { beforeResult }) => beforeResult.fromAmountUSD,
        },
        toChain: { field: "toChain", type: "string" },
        // other params
      },
      // The interface return data is put into "responseMapping", and the field values are mapped from "interface response data
      responseMapping: {
        depositContract: "data.contractAddress", // deposit contract address
        toAmount: "data.amountOutMin", // amount reaching the receiving chain, unit in gwei
        fee: {
          swapFee: "0", // swap fee (USD)
          destinationGasFee: {
            // receiving chain gas fee (USD)
            format: (route, { crossChainParamsData }) => {
              return new BigNumber(route.data.fee)
                .div(10 ** crossChainParamsData.toTokenDecimals)
                .times(crossChainParamsData.toTokenPrice)
                .toString(10);
            },
          },
          crossChainFee: "0", // cross chain fee (USD)
          otherFee: "0", // other fee (USD)
        },
        // if 'route' returns 'transactionData', the 'buildTransactionData' is not needed
        // transactionData: {
        //     data: 'data.transactionData',
        //     value: 'data.value',
        // },
        // Additional fees deducted from wallet when initiating an onchain transaction (e.g. cross chain bridges may require an upfront fees paid in the sending chain's native token, defined as "otherPayOut")(USD)
        otherPayOut: "0",
        // "Route" API may return data needed for subsequent  actionss, and this data can be stored in "interfaceParamData" section for later use
        interfaceParamData: {
          routeId: "data.routeId",
        },
      },
    },
    // Get Status Interface (required)
    status: {
      url: `${serverHost}/api/status`,
      method: "get",
      requestAfter: (res) => {
        if (res.code !== 200)
          throw new CrossChainBusinessException(errorCodes.ERROR);
        return res.data;
      },
      requestMapping: {
        hash: "fromHash",
        // other params
      },
      responseMapping: {
        toHash: "toHash",
        statusInfo: {
          format: (resResult: any): StatusInfo => {
            const data: StatusInfo = {
              status: "PENDING",
              bridgeResponseResult: resResult,
            };
            if (resResult.status === "success") {
              data.status = "DONE";
            } else if (
              resResult.status === "timeout" ||
              resResult.sourceTxStatus === "error"
            ) {
              data.status = "FAILED";
              data.message = `failed: ${resResult.message}`;
            }
            return data;
          },
        },
      },
    },
    // get information on tokens supporting cross chain transactions (required)
    tokenList: {
      url: `${serverHost}/api/tokens`,
      method: "get",
      requestAfter: (res) => {
        if (res.code !== 200)
          throw new CrossChainBusinessException(errorCodes.ERROR);
        return res.data;
      },
      responseMapping: {
        tokens: {
          format: (tokenResult) => {
            return tokenResult.tokens.map((item: any) => ({
              chainId: Number(item.chainId),
              address: item.address,
              name: item.name,
              symbol: item.symbol,
              decimals: item.decimals,
              logoImg: item.logoImg,
            }));
          },
        },
      },
    },
    buildTransactionData: {
      // API to generate onchain transaction data. If "Route" API doesn't return "transactionData",  need to provide this API (optional)
      url: `${serverHost}/api/buildTransactionData`,
      method: "post",
      headers: { "Content-Type": "application/json" },
      requestAfter: (res) => {
        if (res.code !== 200)
          throw new CrossChainBusinessException(errorCodes.ERROR);
        return res.data;
      },
      requestMapping: {
        // routeId: 'routeId',  // use "route" API to return "interfaceParadData" data.
        routeId: {
          format: (_, { interfaceParamData }) => interfaceParamData.routeId,
        },
        // other params
      },
      responseMapping: {
        data: "data.data",
        value: "data.value",
      },
    },
    createOrder: {
      // Create Order (optional)
      url: `${serverHost}/api/createOrder`,
      method: "post",
      requestAfter: (res) => {
        if (res.code !== 200)
          throw new CrossChainBusinessException(errorCodes.ERROR);
        return res.data;
      },
      requestMapping: {
        routeId: "routeId",
        // other params
      },
      responseMapping: {
        interfaceParamData: {
          orderId: "orderId",
        },
      },
    },
    // Healthcheck API (optional)
    health: {
      url: `${serverHost}/api/health`,
      method: "get",
      requestAfter: (res) => {
        if (res.code !== 0)
          throw new CrossChainBusinessException(errorCodes.SERVICE_UNAVAILABLE);
        return { isAvailable: res.isAvailable, description: res.description };
      },
      responseMapping: {
        isAvailable: "isAvailable",
        description: "description",
      },
    },
  },
  errorCodes, // errors status code
};

export default bridgeNameConfig;
```

### b. Config items

- `name` Bridge name
- `apiInterface` API interface config API
  - `route` Route API (required)
    - `url` URL address (required)
    - `method` api method: get/post/put (required)
    - `headers` Request header (optional)
    - `before` Call this function before execution (optional)
    - `after` Call this function after execution (optional)
    - `requestAfter` Call this function after making API request (required)
    - `requestMapping` API request parameter data
    - `responseMapping` Data returned as output from API
  - `status` API to get cross-chain orders status (required)  
    ...
  - `tokenList` API to get information on tokens supporting cross chain transactions (required)  
    ...
  - `buildTransactionData`  API to generate onchain transaction data (optional)  
    ...
  - `createOrder` Create order (optional)  
    ...
  - `health` Health check API (optional)  
    ...
- `errorCodes` Errors status code

## i. route

‘Route’ is used to enquire to get responses such as pricing.

1. Data request
   > Data under default settings for cross-chain requests can be found in ‘CrossChainParamsData’ for configuration. You only need to map these data via ‘requestMapping’.

```js
type CrossChainParamsData = {
  fromChainId: number, // sending chain
  fromAmount: string, // sending amount
  fromTokenAddress: string, // sending token address
  fromTokenDecimals: number, // sending token decimals
  fromTokenPrice: string, // sending token price
  fromPlatformTokenPrice: string,
  toChainId: number, // receiving chain
  toTokenAddress: string, // receiving token address
  toTokenDecimals: number, // receiving token decimals
  toTokenPrice: string, // receiving token price
  fromAddress: string, // sending user address
  toAddress: string, // receiving user address
  slippage: number, // slippage
  fromHash?: string, // sending chain hash
};
```

2. Responses
   > You need to map the responses in ‘responseMapping’ to return the required fields back to DODO

- `depositContract` Deposit contract address
- `toAmount` Receiving amount, value in wei
- `fee` fees, including swap fees, receiving chain gas fees, cross chain fees, and other fees.
  - `swapFee` swap fees, value in USD
  - `destinationGasFee` receiving chain gas fees, value in USD
  - `crossChainFee` cross chain fees, value in USD
  - `otherFee` other fees, value in USD
- `otherPayOut` Additional fees deducted from wallet when initiating an onchain transaction (e.g. cross chain bridges may require upfront fees paid in sending chain's native token, defined as "otherPayOut")
- `interfaceParamData`  "Route" API may return data needed for subsequent actions, and those data can be stored in "interfaceParamData" section for later use

## ii. status

To get cross chain orders status

1. Data request

   > Use both ‘CrossChainParamsData’ and ‘interfaceParamsData’ returned from route interface

2. Responses
   > You need to map the responses in ‘responseMapping’ to return the required fields back to DODO

- `toHash` receiving chain hash
- `statusInfo` Status
  - `status` Status type
    - PENDING Transaction pending
    - DONE Transaction completed
    - FAILED Transaction failed
    - TRANSFER_REFUNDED Transaction refunded
    - INVALID Data invalid
    - NOT_FOUND Transaction hash couldn’t be found NOT FOUND
  - `bridgeResponseResult` Responses returned from third party bridges

## iii. tokenList

Need responses from third party bridges on tokens supported or available to transact

1. Data request

   > Use ‘CrossChainParamsData’

2. Responses
   > You need to map the responses in ‘responseMapping’ to return the required fields back to DODO

- `tokens` Token information
  - `chainId` Chain ID
  - `address` Token address
  - `name` Token name
  - `symbol` Symbol of the token contract
  - `decimals`Decimals of the token contract
  - `logoImg` Link to token’s logo

## iv. buildTransactionData

After getting ‘route’, use ‘buildTransactionData’ to get inputs for sending requests

1. Data request

   > Use both ‘CrossChainParamsData’ and ‘interfaceParamsData’ returned from route interface

2. Responses
   > Return data and value when sending inputs onto chains

- `data` Data to be sent onchain
- `value` Value to be sent onchain (Hexadecimal)

## v. createOrder

After ‘BuildTransaction Data’ interface, call ‘CreateOrder’ to save hash

1. Data request

   > Use both ‘CrossChainParamsData’ and ‘interfaceParamsData’ returned from route interface

2. Responses

- `interfaceParamData` Data can be stored here for later use

## vi. health

Call ‘health’ to check services or route is available before calling ‘route’

1. Data request

   > Use ‘CrossChainParamsData’

2. Responses
   > if ‘isAvailable’ returns ‘false’, service is unavailable

- `isAvailable` If the service available for use
- `description` description

## 3. Test config

Test configuration settings using method in src/index.ts

### 1. Test ‘route’ and ’buildTransactionData‘

```js
import {
  buildTransactionData,
  CrossChainParamsData,
  getBridgeConfig,
  getRoute,
} from "../src/index";

const crossChainParamsData: CrossChainParamsData = {
  fromChainId: 56,
  fromAmount: "20000000000000000000",
  fromTokenAddress: "0x55d398326f99059ff775485246999027b3197955",
  fromTokenDecimals: 18,
  fromTokenPrice: "1",
  fromPlatformTokenPrice: "300",
  toChainId: 137,
  toTokenAddress: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
  toTokenDecimals: 6,
  toTokenPrice: "1",
  fromAddress: "0xd8C446197cA9eE5b6cFC212460C9C5b621a5e1F2",
  toAddress: "0xd8C446197cA9eE5b6cFC212460C9C5b621a5e1F2",
  slippage: 0.01,
};
const bridgeName = "swft_test";
const swftConfig = await getBridgeConfig(bridgeName);

const routeResult = await getRoute(bridgeName, crossChainParamsData);
console.log("routeResult:", routeResult);
let transactionInfo;
if (swftConfig.apiInterface.buildTransactionData) {
  transactionInfo = await buildTransactionData(
    bridgeName,
    crossChainParamsData,
    routeResult?.interfaceParamData
  );
} else if (routeResult && !routeResult.transactionData) {
  transactionInfo = routeResult.transactionData;
}
console.log("transactionInfo:", transactionInfo);
// Get hash of the onchain transaction after sending data inputs
// wallet.sendTransaction({data:transactionInfo.data,value:transactionInfo.value,...})
// ...
```

### 2. Test ‘createOrder‘, ’status‘, ’tokenList‘, ’health’

```js
import { createOrder, getStatus, getTokenList, health } from "../src/index";

const createOrderResult = await createOrder(
  bridgeName,
  crossChainParamsData,
  routeResult?.interfaceParamData
);

const statusResult = await getStatus(
  bridgeName,
  crossChainParamsData,
  routeResult?.interfaceParamData
);

const tokenListResult = await getTokenList(bridgeName, crossChainParamsData);

const healthResult = await health(bridgeName, crossChainParamsData);
```

## 4. Submit merged config

Upon completion of configuration, you can submit a merge request with correct configuration information to DODO via https://github.com/DODOEX/dodo-bridge-aggregator/pulls[https://github.com/DODOEX/dodo-bridge-aggregator/pulls](https://github.com/DODOEX/dodo-bridge-aggregator/pulls)

We will verify your request and proceed to merge, and test in the test environment if data is submitted correctly.
