import axios from "axios";
import { CrossChainConfigField, CrossChainConfigInterface, CrossChainParamsData, FieldMapping } from "../../src";
import { CrossChainBusinessException } from "../../src/exception";
jest.mock("axios");

import * as utils from '../../src/utils/utils';

// request
describe("request method test", () => {
  it("method is get", async () => {
    const url = 'http://127.0.0.1:8001/get';
    const method = 'get';
    (axios as any).get.mockImplementation((_url: string, config: any) => {
      expect(_url).toEqual(url);
      expect(config.params.a).toEqual(1);
      expect(config.headers['Content-Type']).toEqual('application/json');
      return { status: 200, data: { code: 0, data: true } }
    })
    const requestAfter = (data: any) => {
      expect(data.code).toEqual(0);
      expect(data.data).toEqual(true);
      return data.data;
    }
    const data = await utils.request(url, method, { a: 1 }, requestAfter, { "Content-Type": "application/json" });
    expect(data).toEqual(true);
  });

  it("method is post", async () => {
    const url = 'http://127.0.0.1:8001/post';
    const method = 'post';
    (axios as any).post.mockImplementation((_url: string, body: any, config: any) => {
      expect(_url).toEqual(url);
      expect(body.a).toEqual(1);
      expect(config.headers['Content-Type']).toEqual('application/json');
      return { status: 200, data: { code: 0, data: true } }
    })
    const requestAfter = (data: any) => {
      expect(data.code).toEqual(0);
      expect(data.data).toEqual(true);
      return data.data;
    }
    const data = await utils.request(url, method, { a: 1 }, requestAfter, { "Content-Type": "application/json" });
    expect(data).toEqual(true);
  });

  it("method is put", async () => {
    const url = 'http://127.0.0.1:8001/put';
    const method = 'put';
    (axios as any).put.mockImplementation((_url: string, body: any) => {
      expect(_url).toEqual(url);
      expect(body.b).toEqual(2);
      return { status: 200, data: { code: 0, data: true } }
    })
    const requestAfter = (data: any) => {
      expect(data.code).toEqual(0);
      expect(data.data).toEqual(true);
      return data.data;
    }
    const data = await utils.request(url, method, { b: 2 }, requestAfter);
    expect(data).toEqual(true);
  });


  it("should throw error", async () => {
    const url = 'http://127.0.0.1:8001/delete';
    const method = 'delete';
    let error: any;
    try {
      await utils.request(url, method, null, () => { });
    } catch (e) {
      error = e;
    }
    expect(!!error).toEqual(true);
    expect(error.message).toEqual(`【request】"${method}" method not support`);
  });


});

// _configMappingConvertString
describe("_configMappingConvertString method test", () => {
  it("should return corresponding value", async () => {
    const crossChainParamsData: any = {
      fromChainId: 56,
      fromAmount: '20000000000000000000',
      toChainId: 137,
      toTokenAddress: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
      other: {
        test: 'testData'
      }
    }
    const result = await utils._configMappingConvertString(crossChainParamsData, Object.keys(crossChainParamsData), "fromChainId");
    expect(result).toEqual(crossChainParamsData.fromChainId);

    const result2 = await utils._configMappingConvertString(crossChainParamsData, Object.keys(crossChainParamsData), "other.test");
    expect(result2).toEqual(crossChainParamsData.other.test);
  });

  it("should return dataMappingValue", async () => {
    const crossChainParamsData: any = {
      test: 'testData'
    }
    const result = await utils._configMappingConvertString(crossChainParamsData, Object.keys(crossChainParamsData), "1000000");
    expect(result).toEqual("1000000");
  });

});

// _configMappingConvertObject
describe("_configMappingConvertObject method test", () => {
  const crossChainParamsData: any = {
    fromChainId: 56,
    fromAmount: '20000000',
    slippage: 0.01,
  }
  it("should return slippage * 100", async () => {
    const dataMappingValue: FieldMapping = {
      format: data => data.slippage * 100
    };
    const result = await utils._configMappingConvertObject(crossChainParamsData, Object.keys(crossChainParamsData), dataMappingValue, {});
    expect(result).toEqual(crossChainParamsData.slippage * 100);
  });

  it("should return 【fromAmount】 corresponding value", async () => {
    const dataMappingValue: FieldMapping = {
      field: 'fromAmount'
    };
    const result = await utils._configMappingConvertObject(crossChainParamsData, Object.keys(crossChainParamsData), dataMappingValue, {});
    expect(result).toEqual(crossChainParamsData.fromAmount);
  });

  it("should return 【fromAmount】 corresponding number value", async () => {
    const dataMappingValue: FieldMapping = {
      field: 'fromAmount', type: 'number'
    };
    const result = await utils._configMappingConvertObject(crossChainParamsData, Object.keys(crossChainParamsData), dataMappingValue, {});
    expect(result).toEqual(Number(crossChainParamsData.fromAmount));
  });

  it("should return defaultValue", async () => {
    const dataMappingValue: FieldMapping = {
      defaultValue: 'DODO'
    };
    const result = await utils._configMappingConvertObject(crossChainParamsData, Object.keys(crossChainParamsData), dataMappingValue, {});
    expect(result).toEqual(dataMappingValue.defaultValue);
  });

  it("should return other field", async () => {
    const dataMappingValue: CrossChainConfigField = {
      fromChainIdTest: { field: 'fromChainId', type: 'string' },
      fromAmountTest: 'fromAmount',
      defaultValueTest: 'DODO'
    };
    const result = await utils._configMappingConvertObject(crossChainParamsData, Object.keys(crossChainParamsData), dataMappingValue, {});
    expect(!!result).toEqual(true);
    expect(result.fromChainIdTest).toEqual(String(crossChainParamsData.fromChainId));
    expect(result.fromAmountTest).toEqual(crossChainParamsData.fromAmount);
    expect(result.defaultValueTest).toEqual(dataMappingValue.defaultValueTest);
  });

});

// _formatType
describe("_formatType method test", () => {
  const fromAmount = "1000000";
  it("should return number value", async () => {
    const result = await utils._formatType("number", fromAmount);
    expect(result).toEqual(Number(1000000));
  });

  it("should return string value", async () => {
    const result = await utils._formatType("string", Number(1000000));
    expect(result).toEqual(fromAmount);
  });

  it("Other types should return original data", async () => {
    const result = await utils._formatType("string", true);
    expect(result).toEqual(true);
  });

});


// configMappingConvert
describe("configMappingConvert method test", () => {
  const crossChainParamsData: CrossChainParamsData = {
    fromChainId: 56,
    fromAmount: '20000000000000000000',
    fromTokenAddress: '0x55d398326f99059ff775485246999027b3197955',
    fromTokenDecimals: 18,
    fromTokenPrice: '1',
    toChainId: 137,
    toTokenAddress: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    toTokenDecimals: 6,
    toTokenPrice: '1',
    fromAddress: '0x0000000000000000000000000000000000000000',
    toAddress: '0x0000000000000000000000000000000000000000',
    slippage: 0.03
  }
  it("should return corresponding value", async () => {
    const beforeResult = {
      field: "test"
    }
    const dataMapping: CrossChainConfigField = {
      fromChainIdTest: 'fromChainId',
      fromAmountTest: { field: 'fromAmount' },
      fromTokenAddressTest: { field: 'fromTokenAddress' },
      toChainIdTest: { field: 'toChainId', type: 'string' },
      toTokenAddressTest: 'toTokenAddress',
      fromAddressTest: 'fromAddress',
      toAddressTest: 'toAddress',
      slippageTest: {
        format: (data, otherData) => {
          expect(otherData.crossChainParamsData.fromAddress).toEqual(crossChainParamsData.fromAddress);
          expect(otherData.beforeResult.field).toEqual(beforeResult.field);
          return data.slippage * 100
        }
      },
      platfrom: "DODO",
      enableForecall: true,
      quoteOnly: { defaultValue: false }
    }
    const result = await utils.configMappingConvert(crossChainParamsData, dataMapping, { crossChainParamsData, beforeResult });
    expect(result.fromChainIdTest).toEqual(crossChainParamsData.fromChainId);
    expect(result.fromAmountTest).toEqual(crossChainParamsData.fromAmount);
    expect(result.fromTokenAddressTest).toEqual(crossChainParamsData.fromTokenAddress);
    expect(result.toChainIdTest).toEqual(String(crossChainParamsData.toChainId));
    expect(result.toTokenAddressTest).toEqual(crossChainParamsData.toTokenAddress);
    expect(result.fromAddressTest).toEqual(crossChainParamsData.fromAddress);
    expect(result.toAddressTest).toEqual(crossChainParamsData.toAddress);
    expect(result.slippageTest).toEqual(crossChainParamsData.slippage * 100);
    expect(result.platfrom).toEqual(dataMapping.platfrom);
    expect(result.enableForecall).toEqual(dataMapping.enableForecall);
    expect(result.quoteOnly).toEqual(false);
  });

  it("should return corresponding value", async () => {
    const result = await utils.configMappingConvert(crossChainParamsData, undefined, {});
    expect(result).toEqual(null);
  });

});

// _beforeHandle
describe("_beforeHandle method test", () => {
  const data = { test: '1' }
  it("should return 1", async () => {
    const result = await utils._beforeHandle((_data: any) => {
      expect(_data.test).toEqual(data.test);
      return data.test;
    }, data);
    expect(result).toEqual(data.test);
  });

  it("should return null", async () => {
    const result = await utils._beforeHandle(null as any, data);
    expect(result).toEqual(null);
  });

});

// getData
describe("getData method test", () => {
  const crossChainParamsData: CrossChainParamsData = {
    fromChainId: 56,
    fromAmount: '20000000000000000000',
    fromTokenAddress: '0x55d398326f99059ff775485246999027b3197955',
    fromTokenDecimals: 18,
    fromTokenPrice: '1',
    toChainId: 137,
    toTokenAddress: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    toTokenDecimals: 6,
    toTokenPrice: '1',
    fromAddress: '0x0000000000000000000000000000000000000000',
    toAddress: '0x0000000000000000000000000000000000000000',
    slippage: 0.03
  }

  const interfaceParamData = {
    test: 'test123'
  }

  it("should return mapping corresponding value", async () => {
    const apiInterface: CrossChainConfigInterface = {
      url: `http://127.0.0.1:8001/api/route`,
      method: 'post',
      headers: { "Content-Type": "application/json" },
      before: async (params) => {
        expect(params.fromChainId).toEqual(crossChainParamsData.fromChainId);
        expect(params.test).toEqual(interfaceParamData.test);
        return { fromChainInfo: { symbol: 'USDT1' }, toChainInfo: { symbol: 'USDT2' } };
      },
      after: (error, body) => {
        expect(error).toEqual(undefined);
        expect(!!body).toEqual(true);
        return body;
      },
      requestAfter: (res) => {
        expect(res.code).toEqual(0);
        return res.data;
      },
      requestMapping: {
        fromChainId: 'fromChainId',
        fromAmount: 'fromAmount',
        slippage: {
          format: (data, otherData) => {
            expect(otherData.beforeResult.fromChainInfo.symbol).toEqual('USDT1');
            expect(otherData.beforeResult.toChainInfo.symbol).toEqual('USDT2');
            return data.slippage * 100;
          }
        },
        test: 'test'
      },
      responseMapping: {
        depositContract: 'txData.contractAddress',
        toAmount: 'txData.amountOutMin',
      }
    };

    (axios as any).post.mockImplementation((_url: string, body: any, config: any) => {
      expect(_url).toEqual(apiInterface.url);
      expect(body.fromChainId).toEqual(crossChainParamsData.fromChainId);
      expect(body.fromAmount).toEqual(crossChainParamsData.fromAmount);
      expect(body.slippage).toEqual(crossChainParamsData.slippage * 100);
      expect(body.test).toEqual(interfaceParamData.test);
      expect(config.headers['Content-Type']).toEqual('application/json');
      return {
        status: 200,
        data: {
          code: 0,
          data: {
            txData: {
              contractAddress: '0x0000000000000000000000000000000000000000',
              amountOutMin: '1900000'
            }
          }
        }
      }
    })

    const result = await utils.getData<any>(crossChainParamsData, apiInterface, interfaceParamData);
    expect(!!result).toEqual(true);
    expect(result.depositContract).toEqual('0x0000000000000000000000000000000000000000');
    expect(result.toAmount).toEqual('1900000');

  });


  it("should return mapping corresponding value, not have before and after", async () => {
    const apiInterface: CrossChainConfigInterface = {
      url: `http://127.0.0.1:8001/api/route`,
      method: 'get',
      requestAfter: (res) => res,
      requestMapping: {
        fromChainId: 'fromChainId',
      },
      responseMapping: {
        toAmount: 'txData.amountOutMin',
      }
    };

    (axios as any).get.mockImplementation((_url: string, config: any) => {
      expect(_url).toEqual(apiInterface.url);
      expect(config.params.fromChainId).toEqual(crossChainParamsData.fromChainId);
      return {
        status: 200,
        data: {
          txData: {
            amountOutMin: '1900000'
          }
        }
      }
    })

    const result = await utils.getData<any>(crossChainParamsData, apiInterface, interfaceParamData);
    expect(!!result).toEqual(true);
    expect(result.toAmount).toEqual('1900000');

  });


  it("should return ERROR", async () => {
    const apiInterface: CrossChainConfigInterface = {
      url: `http://127.0.0.1:8001/api/route`,
      method: 'post',
      after: (error) => {
        expect(!!error).toEqual(true);
        expect(error.message).toEqual(`【request】 api return status 500`);
        throw new CrossChainBusinessException({ code: 'ERROR', message: 'api not available' });
      },
      requestAfter: (res) => res,
      requestMapping: {
        fromChainId: 'fromChainId',
        fromAmount: 'fromAmount',
        test: 'test'
      },
      responseMapping: {
        depositContract: 'txData.contractAddress',
        toAmount: 'txData.amountOutMin',
      }
    };

    (axios as any).post.mockImplementation(() => {
      return { status: 500, data: null }
    })

    const result = await utils.getData<any>(crossChainParamsData, apiInterface, interfaceParamData);
    expect(!!result).toEqual(true);
    expect(result.code).toEqual("ERROR");
    expect(result.message).toEqual("api not available");
  });


  it("should throw error", async () => {
    const apiInterface: CrossChainConfigInterface = {
      url: `http://127.0.0.1:8001/api/route`,
      method: 'post',
      requestAfter: (res) => res,
      requestMapping: {
        fromChainId: 'fromChainId',
      },
      responseMapping: {
        depositContract: 'txData.contractAddress',
      }
    };

    (axios as any).post.mockImplementation(() => {
      return { status: 500, data: null }
    })

    let error: any;
    try {
      await utils.getData<any>(crossChainParamsData, apiInterface, interfaceParamData);
    } catch (e) {
      error = e;
    }
    expect(!!error).toEqual(true);
    expect(error.message).toEqual(`【request】 api return status 500`);
  });

})