import { CrossChainConfigField, CrossChainConfigInterface, FieldMapping } from './../types/index';


import axios from 'axios';
import { get } from 'lodash';
import { CrossChainParamsData } from '../types';

/**
 * 配置数据映射转换方法
 * @param {*} data 数据源
 * @param {*} dataMapping 数据字段映射
 * @param {*} otherData 其他数据体
 * @returns 
 */
export async function configMappingConvert(data: any, dataMapping: CrossChainConfigField | undefined, otherData: any) {
    if (!data || !dataMapping) return null;
    const returnData: any = {}
    const dataKeys = Object.keys(data);
    for (const key of Object.keys(dataMapping)) {
        const dataMappingValue = dataMapping[key];
        if (typeof dataMappingValue === 'string') {
            if (dataKeys.includes(dataMappingValue)) {
                returnData[key] = data[dataMappingValue];
            } else if (get(data, dataMappingValue) !== undefined) {
                returnData[key] = get(data, dataMappingValue);
            } else {
                returnData[key] = dataMappingValue;
            }
        } else if (Object.prototype.toString.call(dataMappingValue) === '[object Object]') {
            const { field, type, defaultValue, format } = dataMappingValue as FieldMapping;
            if (field || defaultValue !== undefined || format) {
                if (format) {
                    returnData[key] = await format(data, otherData)
                }
                else if (field && dataKeys.includes(field)) {
                    returnData[key] = data[field];
                }
                else if (defaultValue !== undefined) {
                    returnData[key] = defaultValue;
                }
            } else {
                returnData[key] = await configMappingConvert(data, dataMappingValue as CrossChainConfigField, otherData)
            }
        } else if (Object.prototype.toString.call(dataMappingValue) === '[object Array]') {

        } else {
            returnData[key] = dataMappingValue;
        }
    }

    return returnData;
}



export async function request(url: string, method: string, params: any, requestAfter: Function, headers?: { [key: string]: any },) {
    headers = headers || {}
    let res;
    if (method.toLocaleLowerCase() === 'get') {
        res = await axios.get(url, { params, headers });
    } else if (method.toLocaleLowerCase() === 'post') {
        res = await axios.post(url, params, { headers });
    } else if (method.toLocaleLowerCase() === 'put') {
        res = await axios.put(url, params, { headers });
    } else {
        res = await (axios as any)[method.toLocaleLowerCase()](url, params, { headers });
    }
    if (res.status !== 200) throw Error('失败')
    return requestAfter(res.data);
}


export async function getData<T>(dodoData: CrossChainParamsData & { [key: string]: any }, apiInterface: CrossChainConfigInterface, interfaceParamData?: { [key: string]: any }): Promise<T | null> {
    const { url, method, requestMapping, responseMapping, headers, before, requestAfter, after } = apiInterface;
    if (interfaceParamData && Object.prototype.toString.call(interfaceParamData) === '[object Object]') {
        dodoData = Object.assign(dodoData, interfaceParamData);
    }
    let error;
    let returnData: T | null = null;
    try {
        const beforeResult = before ? await beforeHandle(before, dodoData) : null;
        const requestData = await configMappingConvert(dodoData, requestMapping, { beforeResult });
        const responseData = await request(url, method, requestData || {}, requestAfter, headers);
        returnData = await configMappingConvert(responseData, responseMapping, { dodoData, beforeResult, interfaceParamData });
    } catch (e) {
        error = e;
    } finally {
        if (typeof after === 'function') {
            returnData = await after<T>(error as Error, returnData);
        } else if (!!error) {
            throw error;
        }
    }
    return returnData;
}

const beforeHandle = async (fun: Function, data: any) => {
    if (typeof fun === 'function') return fun(data);
    return null;
}