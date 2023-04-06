
import * as bridgeIndex from '../../src/bridge/index';

import fs from "fs";
jest.mock("fs");



// getBridgeConfig
describe("getBridgeConfig method test", () => {
  (fs as any).readdirSync.mockImplementation(() => ['swft'])
  it("should return swft_test config", async () => {
    const name = 'swft_test';
    const bridgeConfig = await bridgeIndex.getBridgeConfig(name);
    expect(bridgeConfig.name).toEqual(name);
  });

  it("should return undefined", async () => {
    const name = 'test';
    const bridgeConfig = await bridgeIndex.getBridgeConfig(name);
    expect(bridgeConfig).toEqual(undefined);
  });

  it("should throw error", async () => {
    const name = 'test';
    let error: any;
    try {
      await bridgeIndex.getBridgeConfig(name, true);
    } catch (e) {
      error = e;
    }
    expect(!!error).toEqual(true);
    expect(error.message).toEqual(`${name} 配置不存在`);
  });
});


// loadBridgeConfig
describe("loadBridgeConfig method test", () => {
  it("should return all config", async () => {
    (fs as any).readdirSync.mockImplementation(() => ['swft'])
    const bridgeConfig = await bridgeIndex.loadBridgeConfig();
    expect(Object.keys(bridgeConfig).length).toEqual(1);
    expect(bridgeConfig.swft_test.name).toEqual('swft_test');

    const bridgeConfigCache = await bridgeIndex.loadBridgeConfig();
    expect(bridgeConfigCache === bridgeConfig).toEqual(true);

    const bridgeConfigReload = await bridgeIndex.loadBridgeConfig(true);
    expect(bridgeConfigReload !== bridgeConfig).toEqual(true);
  });

  it("should throw error", async () => {
    (fs as any).readdirSync.mockImplementation((path: string) => {
      return ['swft', 'test'];
    })

    let error;
    try {
      await bridgeIndex.loadBridgeConfig(true);
    } catch (e) {
      error = e;
    }
    expect(!!error).toEqual(true);
  });

});
