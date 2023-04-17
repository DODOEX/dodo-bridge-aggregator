中文 / [English](https://github.com/DODOEX/dodo-bridge-aggregator/blob/main/README.md)

# 目录

- [介绍](https://github.com/DODOEX/dodo-bridge-aggregator#%E4%BB%8B%E7%BB%8D)
- [克隆代码](https://github.com/DODOEX/dodo-bridge-aggregator#%E5%85%8B%E9%9A%86%E4%BB%A3%E7%A0%81)
- [配置](https://github.com/DODOEX/dodo-bridge-aggregator#%E9%85%8D%E7%BD%AE)
  - [1. 创建配置文件](https://github.com/DODOEX/dodo-bridge-aggregator#1-%E5%88%9B%E5%BB%BA%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6)
  - [2. 添加配置](https://github.com/DODOEX/dodo-bridge-aggregator#2-%E6%B7%BB%E5%8A%A0%E9%85%8D%E7%BD%AE)
    - [a. 配置数据](https://github.com/DODOEX/dodo-bridge-aggregator#a-%E9%85%8D%E7%BD%AE%E6%95%B0%E6%8D%AE)
    - [b. 接口说明](https://github.com/DODOEX/dodo-bridge-aggregator#b-%E6%8E%A5%E5%8F%A3%E8%AF%B4%E6%98%8E)
      - [i. route](https://github.com/DODOEX/dodo-bridge-aggregator#i-route)
      - [ii. status](https://github.com/DODOEX/dodo-bridge-aggregator#ii-status)
      - [iii. tokenList](https://github.com/DODOEX/dodo-bridge-aggregator#iii-tokenlist)
      - [iv. buildTransactionData](https://github.com/DODOEX/dodo-bridge-aggregator#iv-buildtransactiondata)
      - [v. createOrder](https://github.com/DODOEX/dodo-bridge-aggregator#v-createorder)
      - [vi. health](https://github.com/DODOEX/dodo-bridge-aggregator#vi-health)
  - [3. 测试配置](https://github.com/DODOEX/dodo-bridge-aggregator#3-%E6%B5%8B%E8%AF%95%E9%85%8D%E7%BD%AE)
  - [4. 提交合并配置](https://github.com/DODOEX/dodo-bridge-aggregator#4-%E6%8F%90%E4%BA%A4%E5%90%88%E5%B9%B6%E9%85%8D%E7%BD%AE)

# 介绍

该项目旨在聚合第三方跨链桥。跨链桥只需提供一个配置文件，该配置文件涵盖接口配置和数据转换。每个接口将返回相应的数据，以实现聚合。一旦配置完成，即可在“[提交合并配置](https://github.com/DODOEX/dodo-bridge-aggregator#4-%E6%8F%90%E4%BA%A4%E5%90%88%E5%B9%B6%E9%85%8D%E7%BD%AE)”中提交合并。

# 克隆代码

```bash
$ git clone https://github.com/DODOEX/dodo-bridge-aggregator.git
```

# 配置

## 1. 创建配置文件

```bash
$ mkdir src/bridge/[bridgeName]
$ touch src/bridge/[bridgeName]/config.ts
```

## 2. 添加配置

### a. 配置数据

> 复制下面的示例配置内容到 【src/bridge/[bridgeName]/config.ts】 文件中，然后修改配置中的数据。  
> 在示例配置中主要有 4 个接口配置，分别是 route 、buildTransactionData、status、tokenList 等接口配置。所以需要修改示例配置中的这 4 个接口并且返回相应的数据。  
> 其他可以参考 【src/bridge/swft/config.ts、src/bridge/squid/config.ts】测试配置数据

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
  name: "bridge_name", // 桥名称
  //  API 接口配置
  apiInterface: {
    // 路由接口(必填)
    route: {
      url: `${serverHost}/api/route`, // 接口请求地址
      method: "get", // 接口类型 get/post/put
      // 开始执行之前调用该函数
      before: async (params: CrossChainParamsData) => {
        const fromAmountUSD = new BigNumber(params.fromAmount)
          .div(10 ** params.fromTokenDecimals)
          .times(params.fromTokenPrice);
        return { fromAmountUSD }; //  这里返回的数据在‘requestMapping’和‘responseMapping’ 中的 "format" 函数中可以使用
      },
      // 执行完成之后调用该函数
      after: (err, res) => {
        // 需要处理下error
        if (err) throw new CrossChainBusinessException(errorCodes.ERROR);
        return res;
      },
      // 请求接口之后调用该函数
      requestAfter: (res) => {
        // 检查是否返回正常结果数据
        if (res.code !== 200)
          throw new CrossChainBusinessException(errorCodes.ERROR);
        return res.data;
      },
      // 接口请求参数数据放到“requestMapping”中，字段值会从“CrossChainParamsData”参数中做映射处理
      requestMapping: {
        fromChain: "fromChainId",
        fromAmount: {
          format: (_, { beforeResult }) => beforeResult.fromAmountUSD,
        },
        toChain: { field: "toChain", type: "string" },
        // other params
      },
      // 接口返回数据放到“responseMapping”中，字段值会从“接口响应数据”做映射
      responseMapping: {
        depositContract: "data.contractAddress", // 存款合约地址
        toAmount: "data.amountOutMin", // 目标链到账金额，单位（wei）
        fee: {
          swapFee: "0", // swap fee ，单位(USD)
          destinationGasFee: {
            //目标链 gas fee ，单位(USD)
            format: (route, { crossChainParamsData }) => {
              return new BigNumber(route.data.fee)
                .div(10 ** crossChainParamsData.toTokenDecimals)
                .times(crossChainParamsData.toTokenPrice)
                .toString(10);
            },
          },
          crossChainFee: "0", // 跨链 fee ，单位(USD)
          otherFee: "0", // 其它 fee ，单位(USD)
        },
        // 如果在 route 接口中返回了 transactionData 数据，则可以不用在提供 buildTransactionData 接口
        // transactionData: {
        //     data: 'data.transactionData',
        //     value: 'data.value',
        // },
        // 发起交易上链时额外从钱包扣除的费用（比如跨链平台将会使用“来源链平台币”提前预支一笔费用，该笔费用定义为“otherPayOut”, 单位USD)
        otherPayOut: "0",
        // 如果需要保存路由接口中一些数据以便后续几个接口使用可以放到 'interfaceParamData' 中
        interfaceParamData: {
          routeId: "data.routeId",
        },
      },
    },
    // 获取状态接口 (必填)
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
    // 获取支持跨链交易的token信息 (必填)
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
      // 生成上链事物数据接口， 如果在 route 接口中没有返回 transactionData，则需要提供该接口 (非必填)
      url: `${serverHost}/api/buildTransactionData`,
      method: "post",
      headers: { "Content-Type": "application/json" },
      requestAfter: (res) => {
        if (res.code !== 200)
          throw new CrossChainBusinessException(errorCodes.ERROR);
        return res.data;
      },
      requestMapping: {
        // routeId: 'routeId', // 这里的routeId 使用的是 ‘route’ 接口返回结果中 interfaceParamData 的数据
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
      // 创建订单 (非必填)
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
    // 健康检查接口 (非必填)
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
  errorCodes, // 错误状态信息
};

export default bridgeNameConfig;
```

### b. 接口说明

- `name` 桥名称
- `apiInterface` API 接口配置
  - `route` 路由接口(必填)
    - `url` 接口地址(必填)
    - `method` 接口类型 get/post/put (必填)
    - `headers` 请求头(非必填)
    - `before` 开始执行之前调用该函数(非必填)
    - `after` 执行完成之后调用该函数(非必填)
    - `requestAfter` 请求接口之后调用该函数(必填)
    - `requestMapping` 接口请求参数数据
    - `responseMapping` 接口响应结果数据
  - `status` 获取跨链订单状态接口(必填)  
    ...
  - `tokenList` 支持跨链代币列表接口 (必填)  
    ...
  - `buildTransactionData` 生成上链事物数据接口(非必填)  
    ...
  - `createOrder` 创建订单(非必填)  
    ...
  - `health` 健康检查接口 (非必填)  
    ...
- `errorCodes` 错误状态信息

## i. route

用于查询路由，返回该路由的报价等信息

1. 请求数据
   > 我们会提供 【CrossChainParamsData】 跨链请求的基本参数数据给到接口配置中，只需要在 【requestMapping】 中配置请求参数数据做映射处理既可以完成

```js
type CrossChainParamsData = {
  fromChainId: number, // 来源链
  fromAmount: string, // 来源金额
  fromTokenAddress: string, // 来源 token 地址
  fromTokenDecimals: number, // 来源 token decimals
  fromTokenPrice: string, // 来源 token price
  fromPlatformTokenPrice: string, // 来源 平台币 price
  toChainId: number, // 目标链
  toTokenAddress: string, // 目标token 地址
  toTokenDecimals: number, // 目标token decimals
  toTokenPrice: string, // 目标token price
  fromAddress: string, // 来源用户地址
  toAddress: string, // 目标用户地址
  slippage: number, // 滑点
  fromHash?: string, // 来源链交易hash
};
```

2. 响应数据
   > 这里需要将接口返回数据再次在【responseMapping】中做映射处理，返回 DODO 需要的字段数据信息

- `depositContract` 存款合约地址
- `toAmount` 目标链到账金额，单位（wei）
- `fee` 包括 swap fee、目标链 gas fee、跨链 fee、其它 fee 四种费用，不包括来源链的 gas fee
  - `swapFee` swap fee （单位 USD）
  - `destinationGasFee` 目标链 gas fee （单位 USD）
  - `crossChainFee` 跨链 fee （单位 USD）
  - `otherFee` 其它 fee （单位 USD）
- `otherPayOut` 发起交易上链时额外从钱包扣除的费用（比如跨链平台将会使用“来源链平台币”提前预支一笔费用，该笔费用定义为“otherPayOut”, 单位 USD)
- `interfaceParamData` 如果需要保存路由接口中一些数据以便后续几个接口使用则可以放到 'interfaceParamData' 中

## ii. status

获取跨链订单交易的状态

1. 请求数据

   > 【CrossChainParamsData】数据 和 route 接口返回的 【interfaceParamData】的数据

2. 响应数据
   > 这里需要将接口返回数据再次在【responseMapping】中做映射处理，返回 DODO 需要的字段数据信息

- `toHash` 目标链 hash
- `statusInfo` 状态信息
  - `status` 状态
    - PENDING 处理中状态 （交易处于处理中时的状态）
    - DONE 完成状态 （交易成功）
    - FAILED 失败状态 （交易失败）
    - TRANSFER_REFUNDED 退款成功状态
    - INVALID 无效数据状态 （数据不正确时的状态）
    - NOT_FOUND NOT FOUND 状态 （交易 hash 不存在时的状态）
  - `bridgeResponseResult` 源第三方桥返回的相应数据

## iii. tokenList

需要返回第三方跨链桥支持哪些 token 交易

1. 请求数据

   > 【CrossChainParamsData】数据

2. 响应数据
   > 这里需要将接口返回数据再次在【responseMapping】中做映射处理，返回 DODO 需要的字段数据信息

- `tokens` 代币信息
  - `chainId` 链 Id
  - `address` 代币地址
  - `name` 代币名称
  - `symbol` 代币合约上的 symbol
  - `decimals`代币合约上的 decimals
  - `logoImg` 代币 logo 图标链接地址

## iv. buildTransactionData

在 route 接口后会调用该接口拿到发送事物的数据

1. 请求数据

   > 【CrossChainParamsData】数据 和 route 接口返回的 【interfaceParamData】的数据

2. 响应数据
   > 这里需要返回发送事物上链时的 data 和 value 数据

- `data` 上链 data 数据
- `value` 上链 value 数据 （需要返回 16 进制）

## v. createOrder

在 buildTransactionData 接口后调用创建订单接口保存 hash 等数据

1. 请求数据

   > 【CrossChainParamsData】数据 和 route 接口返回的 【interfaceParamData】的数据

2. 响应数据

- `interfaceParamData` 如果需要保存一些数据可以放到这里

## vi. health

在调用 route 接口前会调用 health 检查服务或路由是否可用

1. 请求数据

   > 【CrossChainParamsData】数据

2. 响应数据
   > 如果【isAvailable】为 false 代表服务不可用

- `isAvailable` 是否监控
- `description`描述

## 3. 测试配置

调用 src/index.ts 中的方法测试配置

### 1. route 和 buildTransactionData 接口配置测试

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
// 拿到发送事物数据后进行上链交易得到 hash
// wallet.sendTransaction({data:transactionInfo.data,value:transactionInfo.value,...})
// ...
```

### 2. createOrder、status、tokenList、health 接口配置测试

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

## 4. 提交合并配置

在完成配置测试后，您可以提交合并请求给我们。请确保请求包含正确的配置，并在 [https://github.com/DODOEX/dodo-bridge-aggregator/pulls](https://github.com/DODOEX/dodo-bridge-aggregator/pulls) 页面中提交。一旦我们收到您的请求，我们会进行检查，确保配置正确无误。如果一切顺利，我们会进行合并，并在测试环境中进行测试。
