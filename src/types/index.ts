
export type CrossChainParamsData = {
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
    fromHash?: string
};

export type ErrorCodes = {
    [key: string]: ErrorCode
};

export type ErrorCode = {
    code: string,
    message: string
};



export type CrossChainConfig = {
    name: string,
    apiInterface: CrossChainApiInterface,
    errorCodes?: ErrorCodes
};

export type CrossChainApiInterface = {
    route: RouteInterface,
    status: StatusInterface,
    tokenList: TokenListInterface,
    buildTransactionData?: BuildTransactionDataInterface,
    createOrder?: CreateOrderInterface,
    health?: HealthInterface,
};


export type CrossChainConfigInterface = {
    url: string,
    method: 'get' | 'post' | 'put',
    headers?: { [key: string]: any }
    before?: (crossChainParamsData: CrossChainParamsData & { [key: string]: any }) => any,
    requestAfter: (res: any) => any,
    after?: <T>(error: Error, body: T | null) => T | ErrorCode | null,
    requestMapping?: CrossChainConfigField,
    responseMapping?: CrossChainConfigField,
};

export type FieldMapping = {
    field?: string,
    type?: 'number' | 'string',
    defaultValue?: any,
    format?: (data: CrossChainParamsData & { [key: string]: any }, otherData: { crossChainParamsData: CrossChainParamsData, beforeResult: any }) => any
};

export type Field = FieldMapping | string | number | boolean | CrossChainConfigField

export type CrossChainConfigField = {
    [key: string]: Field
}

// route
export interface RouteInterface extends CrossChainConfigInterface {
    requestMapping: CrossChainConfigField,
    responseMapping: { [T in keyof RouteResponse]: Field }
}

export type RouteResponse = {
    depositContract: string,
    toAmount: string,
    executionDuration?: number,
    fee: {
        swapFee?: string,
        destinationGasFee: string,
        crossChainFee?: string,
        otherFee?: string,
    },
    otherPayOut: string,
    transactionData?: BuildTransactionDataResponse
    interfaceParamData?: CrossChainConfigField
}

// buildTransactionData

export interface BuildTransactionDataInterface extends CrossChainConfigInterface {
    requestMapping: CrossChainConfigField,
    responseMapping: { [T in keyof BuildTransactionDataResponse]: Field },
}

export type BuildTransactionDataResponse = {
    data: string,
    value: string,
}

// status

export interface StatusInterface extends CrossChainConfigInterface {
    requestMapping: CrossChainConfigField,
    responseMapping: {
        toHash: Field,
        statusInfo: {
            status: Field,
            subStatus?: Field,
            message?: Field
        } | { format?: (data: any, otherData: { crossChainParamsData: CrossChainParamsData, beforeResult: any }) => StatusInfo }
    },
}

export type StatusResponse = {
    toHash: string,
    statusInfo: StatusInfo
}

export type StatusInfo = {
    status: 'PENDING' | 'DONE' | 'FAILED' | 'TRANSFER_REFUNDED' | 'INVALID' | 'NOT_FOUND',
    message?: string,
    bridgeResponseResult: any
}

// createOrder

export interface CreateOrderInterface extends CrossChainConfigInterface {
    requestMapping: CrossChainConfigField,
    responseMapping?: CreateOrderResponse,
}

export type CreateOrderResponse = {
    interfaceParamData: CrossChainConfigField,
}


// tokenList

export interface TokenListInterface extends CrossChainConfigInterface {
    requestMapping?: CrossChainConfigField,
    responseMapping: { [T in keyof TokenListResponse]: Field },
}

export type TokenListResponse = {
    tokens: Field | {
        chainId: number,
        address: string,
        name: string,
        symbol: string,
        decimals: number,
        logoImg: string
    }
}


// createOrder

export interface HealthInterface extends CrossChainConfigInterface {
    requestMapping?: CrossChainConfigField,
    responseMapping?: { [T in keyof HealthResponse]: Field },
}

export type HealthResponse = {
    isAvailable: boolean,
    description?: string
}