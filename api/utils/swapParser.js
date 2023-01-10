import { ethers, utils } from "ethers"
import axios from 'axios'
import USDCABI from "../abi/usdcabi.json" assert { type: "json" };
import USDTABI from "../abi/usdtabi.json" assert { type: "json" };
import WETHABI from '../abi/wethabi.json' assert { type: "json" };
import univ3v2ABI from '../abi/univ3v2abi.json' assert { type: "json" };
import tokenABI from '../abi/tokenABI.json' assert { type: "json" };
import univ2PairABI from '../abi/univ2PairABI.json' assert { type: "json" };
import univ3PoolABI from '../abi/uniV3PoolABI.json' assert { type: "json" };
import KyberswapABI from '../abi/KyberswapABI.json' assert { type: "json" };
import basicTokenABI from '../abi/basicTokenABI.json' assert { type: "json" };

import Constants from './constants.js';
const { daiContract, disallowedPools, disallowedSymbols, disallowedTo, 
    mevBot1, mevBot2, busdETH, USDCUSDT, v2USDTDAI, sushiswapUSDTv2, v3DAI_2, v2USDC, 
    pancakeUSDC, pancakeUSDT, v2USDT, v3_DaiUSDCv4, v3USDC, v3Usdt, v3DaiUsdt,
    KyberSwap, KyberSwapInBetweenContract, USDC, WETH, WBTC, FRAX, BUSD, DAI, USDT,
    acceptedRouters, botContracts, UniswapV3Router2, OneInchV4Router,OneInchv5Router,SushiSwapRouter, UniswapV2, StablesOrEth, apiKey, v2topic, v3topic } = Constants;


class SwapParser {

    currentBlockSwaps = [];
    httpProvider;
    etherPrice = 1200;
    btcPrice = 16900;


    constructor(fullUrl, archiveUrl) {
        this.httpProvider = new ethers.providers.JsonRpcProvider(fullUrl);
        this.archiveProvider = new ethers.providers.JsonRpcProvider(archiveUrl);
        this.intervalGetPrice();
    }

    async grabSwap(log) {
        try {
            let swap;
            if (log.topics[0] == v2topic) {
                swap = await this.handlev2Log(log);
            } else if (log.topics[0] == v3topic) {
                swap = await this.handlev3Log(log);
            }
            return swap;
        } catch(e) {
            console.log(e)
        }
    }



    async handlev2Log(log) {
        try {
        
            //blockObject

            const _interface = new utils.Interface(univ2PairABI);
            const _v2Pair = new ethers.Contract(log.address, univ2PairABI, this.httpProvider);
            //get swap log for v2
            const parsedLog = _interface.parseLog(log);
            //get tokens from pool interface
            const token0 = await _v2Pair.token0();
            const token1 = await _v2Pair.token1();
            if (Constants.StablesOrEth.includes(token0) && Constants.StablesOrEth.includes(token1)) return;
            const poolToken = Constants.StablesOrEth.includes(token0) ? token0 : token1;
            const desiredToken = poolToken == token0 ? token1 : token0;
            //console.log(poolToken, desiredToken)
            
            //set up contracts
            const _desiredToken = new ethers.Contract(desiredToken, basicTokenABI, this.httpProvider);
            const _poolToken = new ethers.Contract(poolToken, basicTokenABI, this.httpProvider);
            //console.log(poolToken,desiredToken)

            
            //v2
            let details = {
                poolTokenOut: 0,
                poolTokenIn: 0,
                desiredTokenIn: 0,
                desiredTokenOut: 0
            }

            if (poolToken == token0) {
                details.poolTokenOut = parsedLog.args.amount0Out,
                details.poolTokenIn = parsedLog.args.amount0In,
                details.desiredTokenIn = parsedLog.args.amount1In,
                details.desiredTokenOut = parsedLog.args.amount1Out
            }
            else {
                //poolToken = token1
                details.desiredTokenIn = parsedLog.args.amount0In,
                details.desiredTokenOut = parsedLog.args.amount0Out,
                details.poolTokenIn = parsedLog.args.amount1In,
                details.poolTokenOut = parsedLog.args.amount1Out
            }

            let transactionType,usdVolume = 0,usdPrice = 0, amountPoolTokenWithDecimals, amountDesiredTokenWithDecimals;

            //v3&v2y
            const totalSupply = await _desiredToken.totalSupply();
            const poolDecimals = await _poolToken.decimals();
            const desiredDecimals = await _desiredToken.decimals();
            const desiredSymbol = await _desiredToken.symbol();
            const isStableCoin = [USDC,USDT,BUSD,DAI].includes(poolToken);
            const isWeth = poolToken == WETH;
            const isWBTC = poolToken == WBTC;
            //v2
            //possible scenarios
            /*
            amount1In 0, 2
            amount1Out 2,0
            amount0In 0, 2
            amount0Out 2,0
            */
            if (details.desiredTokenOut == 0 && details.poolTokenIn == 0)  { 
                transactionType = 0;
                amountPoolTokenWithDecimals = details.poolTokenOut / 10**poolDecimals
                amountDesiredTokenWithDecimals = details.desiredTokenIn / 10**desiredDecimals
                if (isStableCoin) {
                    usdVolume = amountPoolTokenWithDecimals;
                    usdPrice = amountPoolTokenWithDecimals / amountDesiredTokenWithDecimals;
                } 
                if (isWeth) {
                    usdVolume = amountPoolTokenWithDecimals * this.etherPrice;
                    usdPrice = amountPoolTokenWithDecimals / amountDesiredTokenWithDecimals * this.etherPrice;
                }
                if (isWBTC) {
                    usdVolume = amountPoolTokenWithDecimals * this.btcPrice;
                    usdPrice = amountPoolTokenWithDecimals / amountDesiredTokenWithDecimals * this.btcPrice;
                }

            } else {
                transactionType = 1;
                amountPoolTokenWithDecimals = details.poolTokenIn / 10**poolDecimals;
                amountDesiredTokenWithDecimals = details.desiredTokenOut / 10**desiredDecimals;
                if (isStableCoin) {
                    usdVolume = amountPoolTokenWithDecimals
                    usdPrice = amountPoolTokenWithDecimals / amountDesiredTokenWithDecimals;
                } 
                if (isWeth) {
                    usdVolume = amountPoolTokenWithDecimals * this.etherPrice;
                    usdPrice = amountPoolTokenWithDecimals / amountDesiredTokenWithDecimals * this.etherPrice;
                }
                if (isWBTC) {
                    usdVolume = amountPoolTokenWithDecimals * this.btcPrice;
                    usdPrice = amountPoolTokenWithDecimals / amountDesiredTokenWithDecimals * this.btcPrice;
                }
            }

            //v3
            //v3
            let marketCap;
            try {
                marketCap = usdPrice*totalSupply/10**desiredDecimals;
            }catch(e) {
                console.log(e)
                marketCap = 0;
            }

            const v2SwapsToAdd = {
                blockNumber: log.blockNumber,
                symbol: `${desiredSymbol}`,
                contract: desiredToken,
                usdVolume: usdVolume,
                usdPrice: usdPrice,
                isBuy: transactionType,
                txHash: log.transactionHash,
                wallet: "",
                router: "",
                logIndex: log.logIndex,
                v3Orv2: "v2",
                isEpiWallet: false,
                etherPrice: this.etherPrice,
                marketCap: marketCap == null ? 0 : marketCap
            }
            
            return v2SwapsToAdd
        } catch(e) {
            console.log(e)
        }
    }   

    async handlev3Log(log) {
        try {
            //console.log(receipt)
            const _interface = new utils.Interface(univ3PoolABI);
            const _v3Pair = new ethers.Contract(log.address, univ2PairABI, this.httpProvider);
            //get swap log for v3
            let parsedLog;
            try {
                parsedLog = _interface.parseLog(log);
            } catch(e) {
                console.log(e, parsedLog)
            }
            const token0 = await _v3Pair.token0();
            const token1 = await _v3Pair.token1();
            if (Constants.StablesOrEth.includes(token0) && Constants.StablesOrEth.includes(token1)) return;
            const poolToken = Constants.StablesOrEth.includes(token0) ? token0 : token1;
            const desiredToken = poolToken == token0 ? token1 : token0;
            let transactionType, usdVolume, usdPrice,amountPoolTokenWithDecimals, amountDesiredTokenWithDecimals;
            //set up contracts
            const _desiredToken = new ethers.Contract(desiredToken, basicTokenABI, this.httpProvider);
            const _poolToken = new ethers.Contract(poolToken, basicTokenABI, this.httpProvider);
            //console.log(parsedLog)
            let poolDecimals, desiredDecimals, desiredSymbol, totalSupply, poolSymbol;
            try {
                poolDecimals = await _poolToken.decimals();
                desiredDecimals = await _desiredToken.decimals();
                desiredSymbol = await _desiredToken.symbol();
                totalSupply = await _desiredToken.totalSupply();
                poolSymbol = await _poolToken.symbol();
            } catch(e) {
                // console.log(e, parsedLog, poolToken, desiredToken)
                console.log('asdflasdflkjasdfkljafsdkjlafdkjlafdkjlakjldfskjl')
                return {};
            }
            
            //console.log(desiredToken, poolToken, 'success')

            let details = {
                desiredTokenAmount: 0,
                poolTokenAmount: 0
            };
            if (desiredToken == token0) {
                details.desiredTokenAmount = parsedLog.args.amount0,
                details.poolTokenAmount = parsedLog.args.amount1
                
            }
            else {
                details.desiredTokenAmount = parsedLog.args.amount1,
                details.poolTokenAmount = parsedLog.args.amount0
            }
            amountDesiredTokenWithDecimals = details.desiredTokenAmount / 10**desiredDecimals;
            amountPoolTokenWithDecimals = details.poolTokenAmount / 10 ** poolDecimals;
            const isStableCoin = [USDC,USDT,DAI,FRAX].includes(poolToken);
            const isWeth = poolToken == WETH;
            const isWBTC = poolToken == WBTC;
            
            if (details.desiredTokenAmount < 0) {
            
                transactionType = 1;
                if (isStableCoin) {
                    usdVolume = amountPoolTokenWithDecimals;
                    usdPrice = amountPoolTokenWithDecimals / -1*amountDesiredTokenWithDecimals;
                } 
                if (isWeth) {
                    usdVolume = amountPoolTokenWithDecimals  * this.etherPrice ;
                    usdPrice = (amountPoolTokenWithDecimals * this.etherPrice )/ -1*amountDesiredTokenWithDecimals;
                }
                if (isWBTC) {
                    usdVolume = amountPoolTokenWithDecimals  * this.btcPrice ;
                    usdPrice = (amountPoolTokenWithDecimals * this.btcPrice )/ -1*amountDesiredTokenWithDecimals;
                }
            } 
            if (details.poolTokenAmount < 0) {
                
                transactionType = 0;
                if (isStableCoin) {
                    usdVolume = -1*amountPoolTokenWithDecimals;
                    usdPrice = -1*amountPoolTokenWithDecimals / amountDesiredTokenWithDecimals;
                } 
                if (isWeth) {
                    usdVolume = -1*(amountPoolTokenWithDecimals ) * this.etherPrice;
                    usdPrice = -1*amountPoolTokenWithDecimals / amountDesiredTokenWithDecimals * this.etherPrice;
                }
                if (isWBTC) {
                    usdVolume = -1*(amountPoolTokenWithDecimals ) * this.btcPrice;
                    usdPrice = -1*amountPoolTokenWithDecimals / amountDesiredTokenWithDecimals * this.btcPrice;
                }
            }
            //v3
            let marketCap;
            try {
                marketCap = usdPrice*totalSupply/10**desiredDecimals;
            }catch(e) {
                console.log('adfkljafsdkjldaf')
                console.log(e)
                marketCap = 0;
            }
            const v3Swap =
            {
                blockNumber: log.blockNumber,
                symbol: `${desiredSymbol}`,
                contract: desiredToken,
                usdVolume: usdVolume,
                usdPrice: usdPrice,
                isBuy: transactionType,
                txHash: log.transactionHash,
                wallet: "",
                router: "",
                logIndex: log.logIndex,
                v3Orv2: "v3",
                isEpiWallet: false,
                etherPrice: this.etherPrice,
                marketCap: marketCap == null ? 0 : marketCap,
            }
            
            return v3Swap
        }
        catch(e) {
            console.log('v3Logs error', e, v3Logs)
        }
    }


    routerName(address) {
        switch (address) {
            case UniswapV3Router2:
                return "UniswapV3Router2";
            case OneInchv5Router:
                return "1InchV5";
            case KyberSwap: 
                return "Kyberswap";
            case UniswapV2:
                return "UniswapV2";
            case OneInchV4Router: 
                return "1InchV4";
            default: 
                return address;
        }
    }

    async getEtherPrice() {
        const url = `https://api.etherscan.io/api?module=stats&action=ethprice&apikey=${Constants.apiKey}`;
        
        await axios.get(url).then((r) => {
            if (r.data.status !== 0) {
                if (r.data.message != "NOTOK") {
                    this.etherPrice = parseInt(r.data.result.ethusd)
                    const {ethusd, ethbtc} = r.data.result;
                    //console.log(r.data.result)
                    //console.log(ethusd/ethbtc);
                    this.btcPrice = ethusd/ethbtc

                    console.log('Current Price of Ether: $', this.etherPrice)
                    console.log('Current Price of BTC:', this.btcPrice)
                    return;
                } else {
                    console.log('Error getting price')
                    return;
                }
            } 
        }).catch(e=>{
            console.log(e)
            this.etherPrice = 1200;
            this.btcPrice = 16000;
        });
        return this.etherPrice;
    }

    async intervalGetPrice() {
        await this.getEtherPrice();
        setInterval(this.getEtherPrice, 60000)
    }
}

export default SwapParser;