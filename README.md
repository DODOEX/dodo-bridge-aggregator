# 目录

- [介绍](https://github.com/DODOEX/dodo-bridge-aggregator#%E4%BB%8B%E7%BB%8D)
- [克隆代码](https://github.com/DODOEX/dodo-bridge-aggregator#%E5%85%8B%E9%9A%86%E4%BB%A3%E7%A0%81)
- [配置](https://github.com/DODOEX/dodo-bridge-aggregator#%E9%85%8D%E7%BD%AE)
  - [一、创建配置文件](https://github.com/DODOEX/dodo-bridge-aggregator#%E4%B8%80%E5%88%9B%E5%BB%BA%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6)
  - [二、添加配置](https://github.com/DODOEX/dodo-bridge-aggregator#%E4%BA%8C%E6%B7%BB%E5%8A%A0%E9%85%8D%E7%BD%AE)
    - [1.配置数据](https://github.com/DODOEX/dodo-bridge-aggregator#1%E9%85%8D%E7%BD%AE%E6%95%B0%E6%8D%AE)
    - [2.接口说明](https://github.com/DODOEX/dodo-bridge-aggregator#2%E6%8E%A5%E5%8F%A3%E8%AF%B4%E6%98%8E)
      - [1. route](https://github.com/DODOEX/dodo-bridge-aggregator#1-route)
      - [2. status](https://github.com/DODOEX/dodo-bridge-aggregator#2-status)
      - [3. tokenList](https://github.com/DODOEX/dodo-bridge-aggregator#3-tokenlist)
      - [4. buildTransactionData](https://github.com/DODOEX/dodo-bridge-aggregator#4-buildtransactiondata)
      - [5. createOrder](https://github.com/DODOEX/dodo-bridge-aggregator#5-createorder)
      - [6. health](https://github.com/DODOEX/dodo-bridge-aggregator#6-health)
  - [三、测试配置](https://github.com/DODOEX/dodo-bridge-aggregator#%E4%B8%89%E6%B5%8B%E8%AF%95%E9%85%8D%E7%BD%AE)
  - [四、提交合并配置](https://github.com/DODOEX/dodo-bridge-aggregator#%E5%9B%9B%E6%8F%90%E4%BA%A4%E5%90%88%E5%B9%B6%E9%85%8D%E7%BD%AE)

# 介绍

该项目用于聚合第三方跨链桥，跨链桥只需要在这里提供一个配置文件，这个配置文件主要包括接口的配置和数据转换，然后每个接口返回相应的数据来实现聚合。配置准备好后就可以在 [提交合并配置](https://github.com/DODOEX/dodo-bridge-aggregator#%E5%9B%9B%E3%80%81%E6%8F%90%E4%BA%A4%E5%90%88%E5%B9%B6%E9%85%8D%E7%BD%AE) 中提交 merge

# 克隆代码

```bash
$ git clone https://github.com/DODOEX/dodo-bridge-aggregator.git
```

# 配置

## 一、创建配置文件

```bash
$ mkdir src/bridge/[bridgeName]
$ touch src/bridge/[bridgeName]/config.ts
```

## 二、添加配置

### 1.配置数据

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
  apiInterface: {
    //  API 接口配置
    route: {
      // 路由接口(必填)
      url: `${serverHost}/api/route`, // 接口请求地址
      method: "get", // 接口类型 get/post/put
      before: async (params: CrossChainParamsData) => {
        // 开始执行之前调用该函数
        const fromAmountUSD = new BigNumber(params.fromAmount)
          .div(10 ** params.fromTokenDecimals)
          .times(params.fromTokenPrice);
        return { fromAmountUSD }; // 这里返回的数据在 format 中可以使用
      },
      after: (err, res) => {
        // 执行完成之后调用该函数
        // 这里需要处理下是否存在error 情况
        if (err) throw new CrossChainBusinessException(errorCodes.ERROR);
        return res;
      },
      requestAfter: (res) => {
        // 请求接口之后调用该函数
        // 这里需求处理下接口请求是否返回正常结果，否侧需要抛出异常
        if (res.code !== 200)
          throw new CrossChainBusinessException(errorCodes.ERROR);
        return res.data;
      },
      requestMapping: {
        // 接口请求参数数据
        fromChain: "fromChainId",
        fromAmount: {
          format: (_, { beforeResult }) => beforeResult.fromAmountUSD,
        },
        toChain: { field: "toChain", type: "string" },
        // other params
      },
      responseMapping: {
        // 接口响应结果数据
        depositContract: "data.contractAddress", // 存款合约地址
        toAmount: "data.amountOutMin", // 目标链到账金额，单位（wei）
        fee: {
          swapFee: "0", // swap fee (USD)
          destinationGasFee: {
            // 目标链 gas fee (USD)
            format: (route, { crossChainParamsData }) => {
              return new BigNumber(route.data.fee)
                .div(10 ** crossChainParamsData.toTokenDecimals)
                .times(crossChainParamsData.toTokenPrice)
                .toString(10);
            },
          },
          crossChainFee: "0", // 跨链 fee (USD)
          otherFee: "0", // 其它 fee (USD)
        },
        // transactionData: {  // 如果在 route 接口中返回了 transactionData 数据，则可以不用在提供 buildTransactionData 接口
        //     data: 'data.transactionData',
        //     value: 'data.value',
        // },
        otherPayOut: "0", // 发起交易上链时额外从钱包扣除的费用（比如跨链平台将会使用“来源链平台币”提前预支一笔费用，该笔费用定义为“otherPayOut”, 单位USD)
        interfaceParamData: {
          // 如果需要保存路由接口中一些数据以便后续几个接口使用可以放到 'interfaceParamData' 中
          routeId: "data.routeId",
        },
      },
    },
    status: {
      // 获取状态接口 (必填)
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
    tokenList: {
      // 获取支持跨链交易的token信息 (必填)
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
        // routeId: 'routeId', 这里的routeId 使用的是 ‘route’ 接口返回结果中 interfaceParamData 的数据
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

### 2.接口说明

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

## 1. route

用于查询路由，返回该路由的报价等信息

1. 请求数据
   > 我们会提供 【CrossChainParamsData】 跨链请求的基本参数数据给到接口配置中，只需要在 【requestMapping】 中配置请求参数数据做映射处理既可以完成

```js
type CrossChainParamsData = {
  fromChainId: number, // 来源链
  fromAmount: string, // 来源金额
  fromTokenAddress: string, // 来源token地址
  fromTokenDecimals: number,
  fromTokenPrice: string,
  fromPlatformTokenPrice: string,
  toChainId: number, // 目标链
  toTokenAddress: string, // 目标token 地址
  toTokenDecimals: number,
  toTokenPrice: string,
  fromAddress: string, // 来源用户地址
  toAddress: string, // 目标用户地址
  slippage: number,
  fromHash?: string,
};
```

2. 响应数据
   > 这里需要将接口返回数据再次在【responseMapping】中做映射处理，返回 DODO 需要的字段数据信息

- `depositContract` 存款合约地址
- `toAmount` 目标链到账金额，单位（wei）
- `fee` 费用，包括 swap fee、目标链 gas fee、跨链 fee、其它 fee 四种费用，这里来源链(from chain)的 gas fee
  - `swapFee` swap fee （单位 USD）
  - `destinationGasFee` 目标链 gas fee （单位 USD）
  - `crossChainFee` 跨链 fee （单位 USD）
  - `otherFee` 其它 fee （单位 USD）
- `otherPayOut` 发起交易上链时额外从钱包扣除的费用（比如跨链平台将会使用“来源链平台币”提前预支一笔费用，该笔费用定义为“otherPayOut”, 单位 USD)
- `interfaceParamData` 如果需要保存路由接口中一些数据以便后续几个接口使用则可以放到 'interfaceParamData' 中

## 2. status

获取跨链订单交易的状态

1. 请求数据

   > 【CrossChainParamsData】数据 和 route 接口返回的 【interfaceParamData】的数据

2. 响应数据
   > 这里需要将接口返回数据再次在【responseMapping】中做映射处理，返回 DODO 需要的字段数据信息

- `toHash` 存款合约地址
- `statusInfo` 状态信息
  - `status` 状态
    - PENDING 处理中状态 （交易处于处理中时的状态）
    - DONE 完成状态 （交易成功）
    - FAILED 失败状态 （交易失败）
    - TRANSFER_REFUNDED 退款成功状态
    - INVALID 无效数据状态 （数据不正确时的状态）
    - NOT_FOUND NOT FOUND 状态 （交易 hash 不存在时的状态）
  - `bridgeResponseResult` 源第三方桥返回的相应数据

## 3. tokenList

需要返回第三方跨链桥支持哪些 token 交易

1. 请求数据

   > 【CrossChainParamsData】数据

2. 响应数据
   > 这里需要将接口返回数据再次在【responseMapping】中做映射处理，返回 DODO 需要的字段数据信息

- `tokens` 状态信息
  - `chainId` 链 Id
  - `address` 代币地址
  - `name` 代币名称
  - `symbol` 代币合约上的 symbol
  - `decimals`代币合约上的 decimals
  - `logoImg` 代币 logo 图标链接地址

## 4. buildTransactionData

在 route 接口后会调用该接口拿到发送事物的数据

1. 请求数据

   > 【CrossChainParamsData】数据 和 route 接口返回的 【interfaceParamData】的数据

2. 响应数据
   > 这里需要返回发送事物上链时的 data 和 value 数据

- `data` 上链 data 数据
- `value` 上链 value 数据 （需要返回 16 精制）

## 5. createOrder

在 buildTransactionData 接口后调用创建订单接口报错 hash 等数据

1. 请求数据

   > 【CrossChainParamsData】数据 和 route 接口返回的 【interfaceParamData】的数据

2. 响应数据

- `interfaceParamData` 如果需要保存一些数据可以放到这里

## 6. health

在调用 route 接口前会调用 health 检查服务或路由是否可用

1. 请求数据

   > 【CrossChainParamsData】数据

2. 响应数据
   > 如果【isAvailable】为 false 代表服务不可用

- `isAvailable` 是否监控
- `description`描述

## 三、测试配置

调用 src/index.ts 中的方法测试配置

### 1.route 和 buildTransactionData 接口配置测试

```js
import {
  buildTransactionData,
  CrossChainParamsData,
  getBridgeConfig,
  getRoute,
} from "../src/index";

const crossChainParamsData: CrossChainParamsData = {
  fromChainId: 56, // 来源链
  fromAmount: "20000000000000000000", // 来源金额
  fromTokenAddress: "0x55d398326f99059ff775485246999027b3197955", // 来源token地址
  fromTokenDecimals: 18,
  fromTokenPrice: "1",
  fromPlatformTokenPrice: "300", // from chain 上的平台币价格（USD）
  toChainId: 137, // 目标链
  toTokenAddress: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", // 目标token 地址
  toTokenDecimals: 6,
  toTokenPrice: "1",
  fromAddress: "0xd8C446197cA9eE5b6cFC212460C9C5b621a5e1F2", // 来源用户地址
  toAddress: "0xd8C446197cA9eE5b6cFC212460C9C5b621a5e1F2", // 目标用户地址
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

### 2.createOrder、status、tokenList、health 接口配置测试

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

## 四、提交合并配置

配置测试没有问题后就可以提交 merge 给我们，在 [https://github.com/DODOEX/dodo-bridge-aggregator/pulls](https://github.com/DODOEX/dodo-bridge-aggregator/pulls) 中提交合并请求，收到合并请求后我们会检查配置是否有问题，如果没有问题将会进行合并，然后在测试环境中进行测试。
