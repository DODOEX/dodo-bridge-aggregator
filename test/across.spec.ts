import {
  buildTransactionData,
  CrossChainParamsData,
  getRoute,
  getStatus,
  getTokenList,
} from "../src/index";

const bridgeName = "across";
const USDC_ADDRESSES = {
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  10: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
};

function createRouteParams(overrides: Partial<CrossChainParamsData> = {}) {
  return {
    fromChainId: 1,
    fromAmount: "100000000",
    fromTokenAddress: USDC_ADDRESSES[1],
    fromTokenDecimals: 6,
    fromTokenPrice: "1",
    fromPlatformTokenPrice: "1",
    toChainId: 10,
    toTokenAddress: USDC_ADDRESSES[10],
    toTokenDecimals: 6,
    toTokenPrice: "1",
    fromAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    toAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    slippage: 0,
    ...overrides,
  };
}
jest.setTimeout(15000);
describe("across tests", () => {
  describe("get route", () => {
    it("should return route for USDC", async () => {
      const validRouteParams = createRouteParams();
      const routeResult = await getRoute(bridgeName, validRouteParams);

      expect(!!routeResult).toEqual(true);
      expect(!!routeResult?.code).toEqual(false);
    });

    it("should return route for ETH", async () => {
      const validRouteParams = createRouteParams({
        fromTokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        fromChainId: 1,
        toTokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        toChainId: 10,
        fromAmount: "1000000000000000000",
      });
      const routeResult = await getRoute(bridgeName, validRouteParams);

      expect(!!routeResult).toEqual(true);
      expect(!!routeResult?.code).toEqual(false);
    });

    it("should return error if unsupported token", async () => {
      const invalidRouteParams = createRouteParams({
        fromChainId: 12345,
      });
      const routeResult = await getRoute(bridgeName, invalidRouteParams);

      expect(!!routeResult).toEqual(true);
      expect(routeResult?.code).toEqual("UNSUPPORTED_TOKEN");
    });

    it("should return error if amount too low", async () => {
      const invalidRouteParams = createRouteParams({
        fromAmount: "1",
      });
      const routeResult = await getRoute(bridgeName, invalidRouteParams);

      expect(!!routeResult).toEqual(true);
      expect(routeResult?.code).toEqual("AMOUNT_TOO_LOW");
    });
  });

  describe("build transaction data", () => {
    it("should build tx for USDC", async () => {
      const validRouteParams = createRouteParams();
      const routeResult = await getRoute(bridgeName, validRouteParams);

      const transactionInfo = await buildTransactionData(
        bridgeName,
        validRouteParams,
        routeResult?.interfaceParamData
      );

      expect(!!transactionInfo).toEqual(true);
      expect(!!transactionInfo?.code).toEqual(false);
    });

    it("should build tx for ETH", async () => {
      const validRouteParams = createRouteParams({
        fromTokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        fromChainId: 1,
        toTokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        toChainId: 10,
        fromAmount: "1000000000000000000",
      });
      const routeResult = await getRoute(bridgeName, validRouteParams);

      const transactionInfo = await buildTransactionData(
        bridgeName,
        validRouteParams,
        routeResult?.interfaceParamData
      );

      expect(!!transactionInfo).toEqual(true);
      expect(!!transactionInfo?.code).toEqual(false);
    });
  });

  describe("deposit details", () => {
    it("should get status for existing deposit", async () => {
      const validRouteParams = createRouteParams({
        // Example https://arbiscan.io/tx/0xdf8cea428f711a0bc5afefa9632a2033cd63ca872b8fc344daee9781094eb4a6
        fromHash:
          "0xdf8cea428f711a0bc5afefa9632a2033cd63ca872b8fc344daee9781094eb4a6",
        fromChainId: 42161,
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
    //   expect(status?.code).toEqual("DEPOSIT_NOT_FOUND");
      expect(status?.statusInfo.status).toEqual("NOT_FOUND");
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
