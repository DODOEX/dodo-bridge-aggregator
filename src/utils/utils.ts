import { CrossChainConfigField, CrossChainConfigInterface, CrossChainParamsDataAndOther, ErrorCode, FieldMapping, OtherData } from './../types/index';


import axios from 'axios';
import { get } from 'lodash';
import { CrossChainBusinessException } from '../exception';


export function _configMappingConvertString(data: CrossChainParamsDataAndOther, dataKeys: string[], dataMappingValue: string) {
    if (dataKeys.includes(dataMappingValue)) {
        return data[dataMappingValue];
    } else if (get(data, dataMappingValue) !== undefined) {
        return get(data, dataMappingValue);
    } else {
        return dataMappingValue;
    }
}

export async function _configMappingConvertObject(data: CrossChainParamsDataAndOther, dataKeys: string[], dataMappingValue: FieldMapping | CrossChainConfigField, otherData: OtherData) {
    const { field, type, defaultValue, format } = dataMappingValue as FieldMapping;
    if (field || defaultValue !== undefined || format) {
        if (format) {
            return format(data, otherData)
        } else if (field && dataKeys.includes(field)) {
            if (type) {
                return _formatType(type, data[field])
            } else {
                return data[field];
            }
        } else if (defaultValue !== undefined) {
            return defaultValue;
        }
    } else {
        return configMappingConvert(data, dataMappingValue as CrossChainConfigField, otherData)
    }
}

export async function _formatType(type: 'string' | 'number', str: any) {
    if (typeof str !== 'string' && typeof str !== 'number') return str;
    if (type === 'number') {
        return Number(str)
    } else {
        return String(str);
    }
}

/**
 * 配置数据映射转换方法
 * @param {*} data 数据源
 * @param {*} dataMapping 数据字段映射
 * @param {*} otherData 其他数据体
 * @returns 
 */
export async function configMappingConvert(data: CrossChainParamsDataAndOther, dataMapping: CrossChainConfigField | undefined, otherData: OtherData) {
    if (!data || !dataMapping) return null;
    const returnData: any = {}
    const dataKeys = Object.keys(data);
    for (const key of Object.keys(dataMapping)) {
        const dataMappingValue = dataMapping[key];
        if (typeof dataMappingValue === 'string') {
            returnData[key] = _configMappingConvertString(data, dataKeys, dataMappingValue);
        } else if (Object.prototype.toString.call(dataMappingValue) === '[object Object]') {
            returnData[key] = await _configMappingConvertObject(data, dataKeys, dataMappingValue as FieldMapping | CrossChainConfigField, otherData);
        } else {
            returnData[key] = dataMappingValue;
        }
    }
    return returnData;
}



export async function request(url: string, method: string, params: any, requestAfter: Function, headers?: { [key: string]: any }) {
    params = params || {}
    headers = headers || {}
    method = method.toLocaleLowerCase();
    let res;
    if (method === 'get') {
        res = await axios.get(url, { params, headers });
    } else if (method.toLocaleLowerCase() === 'post') {
        res = await axios.post(url, params, { headers });
    } else if (method.toLocaleLowerCase() === 'put') {
        res = await axios.put(url, params, { headers });
    } else {
        throw new Error(`【request】"${method}" method not support`)
    }
    if (res.status !== 200) throw Error(`【request】 api return status ${res.status}`)
    return requestAfter(res.data);
}


export async function getData<T>(crossChainParamsData: CrossChainParamsDataAndOther, apiInterface: CrossChainConfigInterface, interfaceParamData?: { [key: string]: any }): Promise<T & ErrorCode | null> {
    const { url, method, requestMapping, responseMapping, headers, before, requestAfter, after } = apiInterface;
    if (interfaceParamData && Object.prototype.toString.call(interfaceParamData) === '[object Object]') {
        crossChainParamsData = Object.assign(crossChainParamsData, interfaceParamData);
    }
    let error;
    let appingConvertResult: T & ErrorCode | null = null;
    try {
        const beforeResult = before ? await _beforeHandle(before, crossChainParamsData) : null;
        const requestData = await configMappingConvert(crossChainParamsData, requestMapping, { crossChainParamsData, beforeResult, interfaceParamData });
        const responseData = await request(url, method, requestData, requestAfter, headers);
        appingConvertResult = await configMappingConvert(responseData, responseMapping, { crossChainParamsData, beforeResult, interfaceParamData });
    } catch (e) {
        error = e;
    } finally {
        if (typeof after === 'function') {
            try {
                return after<T>(error as Error, appingConvertResult) as any;
            } catch (err) {
                error = err;
            }
        }
        if (error instanceof CrossChainBusinessException) {
            return { code: error.code, message: error.message } as any;
        } else if (!!error) {
            throw error;
        }
    }
    return appingConvertResult;
}

export const _beforeHandle = async (fun: Function, data: any) => {
    if (typeof fun === 'function') return fun(data);
    return null;
}