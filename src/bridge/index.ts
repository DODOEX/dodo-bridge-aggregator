
import fs from "fs"
import { CrossChainConfig } from "../types";
let configs: { [key: string]: CrossChainConfig }
export const loadBridgeConfig = async (reload?: boolean) => {
    if (!reload && configs) return configs;
    configs = {};
    let files = await fs.readdirSync(__dirname);
    files = files.filter(s => s.indexOf('.') === -1);
    for (const fileName of files) {
        const configPath = __dirname + '/' + fileName + '/config';
        // const exist = await fs.existsSync(configPath);
        // if (exist) {
        try {
            const bridgeConfig = require(configPath).default;
            if (!bridgeConfig || !bridgeConfig.name) throw Error(`${fileName} 配置加载失败`)
            configs[bridgeConfig.name] = bridgeConfig;
        } catch (error) {
            throw Error(`加载 ${fileName} 配置报错: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`)
        }

        // }
    }

    return configs;
}


export const getBridgeConfig = async (bridgeName: string, check?: boolean) => {
    if (!configs) await loadBridgeConfig();
    if (check && !configs[bridgeName]) throw new Error(`${bridgeName} 配置不存在`);
    return configs[bridgeName];
}

