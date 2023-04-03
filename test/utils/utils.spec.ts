import axios from "axios";
jest.mock("axios");

import * as utils from '../../src/utils/utils';

describe("utils file method test", () => {
  it("method is get", async () => {
    const url = 'http://127.0.0.1:8001/get';
    const method = 'get';
    console.log('axios:', typeof axios);
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

});