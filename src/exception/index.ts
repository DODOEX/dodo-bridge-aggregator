import { ErrorCode } from "../types";

export class CrossChainBusinessException extends Error {
    public code;
    constructor(codeInfo: ErrorCode) {
        super(codeInfo.message);
        this.code = codeInfo.code;
    }
}
