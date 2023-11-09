import {
  buildTransactionData,
  CrossChainParamsData,
  getRoute,
  getStatus,
  getTokenList,
} from "../src/index";

const bridgeName = "openliq";
const USDC_ADDRESSES = {
  1: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  10: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
  56: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
};

function createRouteParams(overrides: Partial<CrossChainParamsData> = {}) {
  return {
    fromChainId: 1,
    fromAmount: "100000000",
    fromTokenAddress: USDC_ADDRESSES[1],
    fromTokenDecimals: 6,
    fromTokenPrice: "1",
    fromPlatformTokenPrice: "1",
    toChainId: 56,
    toTokenAddress: USDC_ADDRESSES[56],
    toTokenDecimals: 18,
    toTokenPrice: "1",
    fromAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    toAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    slippage: 0.02,
    ...overrides,
  };
}
jest.setTimeout(15000);
describe("across tests", () => {
  describe("get route", () => {
    it("should return route for USDC", async () => {
      const validRouteParams = createRouteParams();
      const routeResult = await getRoute(bridgeName, validRouteParams);
      // console.log('RouteResult ==>> ',routeResult)
      expect(!!routeResult).toEqual(true);
      expect(!!routeResult?.code).toEqual(false);
    });

    it("should return route for ETH", async () => {
      const validRouteParams = createRouteParams({
        fromTokenAddress: "0x0000000000000000000000000000000000000000",
        fromChainId: 1,
        toTokenAddress: "0x0000000000000000000000000000000000000000",
        toChainId: 56,
        fromAmount: "1000000000000000000",
      });
      const routeResult = await getRoute(bridgeName, validRouteParams);

      expect(!!routeResult).toEqual(true);
      expect(!!routeResult?.code).toEqual(false);
    });

    // it("should return error if unsupported token", async () => {
    //   const invalidRouteParams = createRouteParams({
    //     fromChainId: 12345,
    //   });
    //   const routeResult = await getRoute(bridgeName, invalidRouteParams);
    //
    //   expect(!!routeResult).toEqual(true);
    //   expect(routeResult?.code).toEqual("UNSUPPORTED_TOKEN");
    // });

    // it("should return error if amount too low", async () => {
    //   const invalidRouteParams = createRouteParams({
    //     fromAmount: "1",
    //   });
    //   const routeResult = await getRoute(bridgeName, invalidRouteParams);
    //
    //   expect(!!routeResult).toEqual(true);
    //   expect(routeResult?.code).toEqual("AMOUNT_TOO_LOW");
    // });
  });
  // return


  // describe("build transaction data", () => {
  //   it("should build tx for USDC", async () => {
  //     const validRouteParams = createRouteParams();
  //     const routeResult = await getRoute(bridgeName, validRouteParams);
  //
  //     const transactionInfo = await buildTransactionData(
  //       bridgeName,
  //       validRouteParams,
  //       routeResult?.interfaceParamData
  //     );
  //
  //     expect(!!transactionInfo).toEqual(true);
  //     expect(!!transactionInfo?.code).toEqual(false);
  //   });
  //
  //   it("should build tx for ETH", async () => {
  //     const validRouteParams = createRouteParams({
  //       fromTokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  //       fromChainId: 1,
  //       toTokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  //       toChainId: 10,
  //       fromAmount: "1000000000000000000",
  //     });
  //     const routeResult = await getRoute(bridgeName, validRouteParams);
  //
  //     const transactionInfo = await buildTransactionData(
  //       bridgeName,
  //       validRouteParams,
  //       routeResult?.interfaceParamData
  //     );
  //
  //     expect(!!transactionInfo).toEqual(true);
  //     expect(!!transactionInfo?.code).toEqual(false);
  //   });
  // });

  describe("deposit details", () => {
    it("should get status for existing deposit", async () => {
      const validRouteParams = createRouteParams({
        fromHash: "0x0bf8595b56b2b0dbcff45f70ac2fdce3477a5ef46cfc2dd1c12d03f4306de0a8",
        fromChainId: 1,
      });
      const status = await getStatus(bridgeName, validRouteParams);
      expect(!!status).toEqual(true);
      expect(status?.statusInfo.status).toEqual("DONE");
      expect(!!status?.code).toEqual(false);
    });

    it("should return error is deposit unknown", async () => {
      const invalidRouteParams = createRouteParams({
        fromHash: "0x0",
        fromChainId: 1,
      });
      const status = await getStatus(bridgeName, invalidRouteParams);
      expect(!!status).toEqual(true);
      // expect(status?.code).toEqual("NOT_FOUND");
    });
  });

  describe("token list", () => {
    it("should get token list", async () => {
      const validRouteParams = createRouteParams();

      const tokenList = await getTokenList(bridgeName, validRouteParams);

      expect(!!tokenList).toEqual(true);
      expect(!!tokenList?.code).toEqual(false);
    });
  });
});
