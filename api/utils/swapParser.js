import { ethers, utils } from "ethers"
import axios from 'axios'
import api from './axios.js'
import USDCABI from "../abi/usdcabi.json" assert { type: "json" };
import USDTABI from "../abi/usdtabi.json" assert { type: "json" };
import WETHABI from '../abi/wethabi.json' assert { type: "json" };
import univ3v2ABI from '../abi/univ3v2abi.json' assert { type: "json" };
import tokenABI from '../abi/tokenABI.json' assert { type: "json" };
import univ2PairABI from '../abi/univ2PairABI.json' assert { type: "json" };
import univ3PoolABI from '../abi/uniV3PoolABI.json' assert { type: "json" };
import KyberswapABI from '../abi/KyberswapABI.json' assert { type: "json" };
import basicTokenABI from '../abi/basicTokenABI.json' assert { type: "json" };
import veryBankingBytes32ABI from '../abi/veryBankingBytes32ABI.json' assert { type: "json"};

import Constants from './constants.js';
const { daiContract, disallowedPools, disallowedSymbols, disallowedTo, 
    mevBot1, mevBot2, busdETH, USDCUSDT, v2USDTDAI, sushiswapUSDTv2, v3DAI_2, v2USDC, 
    pancakeUSDC, pancakeUSDT, v2USDT, v3_DaiUSDCv4, v3USDC, v3Usdt, v3DaiUsdt,
    KyberSwap, KyberSwapInBetweenContract, USDC, WETH, WBTC, FRAX, BUSD, DAI, USDT,
    acceptedRouters, botContracts, UniswapV3Router2, OneInchV4Router,OneInchv5Router,SushiSwapRouter, UniswapV2, StablesOrEth, apiKey, v2topic, v3topic, WETHContractDetails, USDCContractDetails, USDTContractDetails, DAIContractDetails } = Constants;



class SwapParser {

    currentBlockSwaps = [];
    httpProvider;
    etherPrice = 1200;
    btcPrice = 16900;
    allPairsData = [];
    newPairsData = [];
    allSwapsData = [];
    alreadyFoundPairs = [];
    pairsAsNumberSorted = [];
    pairAddress;
    blockTimestamp;



    constructor(httpProviderUrl) {
        this.httpProvider = new ethers.providers.JsonRpcProvider(httpProviderUrl);
        this.intervalGetPrice();
    }

    setPairAddress(pairAddress) {
        this.pairAddress = pairAddress;
    }

    async grabSwap(log) {
        try {
            let swap;
            if (log.topics[0] == v2topic) {
                swap = await this.handlev2Log(log);
                return swap;
            } else if (log.topics[0] == v3topic) {
                swap = await this.handlev3Log(log);
                return swap;
            }
        } catch(e) {
            console.log(e)
        }
    }


    async postPair(pairBody) {
        try {
            const response = await api.post(`/api/pairs`, pairBody)
        } catch(e) {
            console.log('error posting pair')
        }
    }

    async getBlockTimestamp(blockNumber) {
        if (this.blockNumber != blockNumber) {
            this.blockTimestamp = (await this.httpProvider.getBlock(blockNumber)).timestamp*1000;
            return this.blockTimestamp
        } else return this.blockTimestamp
    }

    async getAllPairs() {
        try {
            const response = await api.get(`/api/pairs`)
            this.allPairsData = response.data.data;
        } catch(e) {
            console.log('error getting pairs', e)
        }
    }

    reset() {
        this.allPairsData = [];
        this.newPairsData = [];
        this.allSwapsData = [];
        this.alreadyFoundPairs = [];
        this.getAllPairs();
    }

    getPair(pairAddress) {
        const alreadyFoundPair = this.alreadyFoundPairs.filter(p=>p.pairAddress==pairAddress);
        if (alreadyFoundPair.length) {
            return alreadyFoundPair[0];
        } else {
            const findPair = this.allPairsData.filter(p=>p.pairAddress == pairAddress);
            if (findPair.length) {
                this.alreadyFoundPairs = [...this.alreadyFoundPairs, findPair[0]];
            }
            return findPair
        }

    }

    addToSwaps(swap) {
        this.allSwapsData = [...this.allSwapsData, swap]
    }

    addToPairs(pairBody) {
        this.newPairsData = [...this.newPairsData, pairBody];
        this.allPairsData = [...this.allPairsData, pairBody];
    }
    async handlev2Log(log) {
        try {
        
            const tx = await this.httpProvider.getTransaction(log.transactionHash);
            if (!acceptedRouters.includes(tx.to)) return; 
            this.blockTimestamp = await this.getBlockTimestamp(tx.blockNumber);
            const pair = this.getPair(log.address);
            let token0, token1, 
            token0Decimals, token1Decimals, 
            token0Symbol, token1Symbol, 
            token0TotalSupply, token1TotalSupply;


            const _interface = new utils.Interface(univ2PairABI);
            const _v2Pair = new ethers.Contract(log.address, univ2PairABI, this.httpProvider);
            //get swap log for v2
            const pairAddress = log.address;
            const parsedLog = _interface.parseLog(log);
            if (pair.length) {
                ({ token0, token1, 
                    token0Decimals, token1Decimals, 
                    token0Symbol, token1Symbol, 
                    token0TotalSupply, token1TotalSupply } = pair[0] );
            } else {
                token0 = await _v2Pair.token0();
                token1 = await _v2Pair.token1();

                try {
                    ({decimals: token0Decimals, symbol: token0Symbol, totalSupply: token0TotalSupply } = await this.getTokenDetails(token0));
                    ({decimals: token1Decimals, symbol: token1Symbol, totalSupply: token1TotalSupply } = await this.getTokenDetails(token1));
                } catch(e) {
                    // console.log(e, parsedLog, poolToken, desiredToken)
                    console.log('error getting token details', e)
                    return {};
                }

            }
            if (Constants.StablesOrEth.includes(token0) && Constants.StablesOrEth.includes(token1)) return;
            if (!Constants.StablesOrEth.includes(token0) && !Constants.StablesOrEth.includes(token1)) return;
            //need case where neither is a stablecoin.
            const poolToken = Constants.StablesOrEth.includes(token0) ? token0 : token1;
            const desiredToken = poolToken == token0 ? token1 : token0;
            //console.log(poolToken, desiredToken)
            
            //set up contracts
            const _desiredToken = new ethers.Contract(desiredToken, basicTokenABI, this.httpProvider);
            const _poolToken = new ethers.Contract(poolToken, basicTokenABI, this.httpProvider);
            //console.log(poolToken,desiredToken)

            
            // //v2
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
            let poolDecimals, desiredDecimals, desiredSymbol, totalSupply, poolSymbol;
            poolDecimals = token0 == poolToken ? token0Decimals : token1Decimals;
            desiredDecimals = token1 == poolToken ? token0Decimals : token1Decimals;
            poolSymbol = token0 == poolToken ? token0Symbol : token1Symbol;
            desiredSymbol = token1 == poolToken ? token0Symbol : token1Symbol;
            totalSupply = token1 == poolToken ? token0TotalSupply : token1TotalSupply;

            const isStableCoin = [USDC,USDT,BUSD,DAI, FRAX].includes(poolToken);
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
                transactionType = -1;
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
            let marketCap = 0;
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
                pairAddress: log.address,
                usdVolume: usdVolume,
                usdPrice: usdPrice,
                isBuy: transactionType,
                txHash: log.transactionHash,
                wallet: tx.from,
                router: this.routerName(tx.to),
                etherPrice: this.etherPrice,
                marketCap: marketCap == null ? 0 : marketCap,
                dateTime: new Date(this.blockTimestamp).toISOString()
            }
            
            //post to pairs if pairs didnt exist
            if (!pair.length) {
                const pairBody = {
                    pairAddress: log.address,
                    token0,
                    token1,
                    token0Decimals,
                    token1Decimals,
                    token0Symbol,
                    token1Symbol,
                    token0TotalSupply,
                    token1TotalSupply
                }

                this.addToPairs(pairBody)
            }
            //his.addToSwaps(v2SwapsToAdd)
            return v2SwapsToAdd
        } catch(e) {
            console.log(e)
        }
    }   

    async handlev3Log(log) {
        try {
            //console.log(receipt)
            const tx = await this.httpProvider.getTransaction(log.transactionHash)
            if (!acceptedRouters.includes(tx.to)) return; 
            this.blockTimestamp = await this.getBlockTimestamp(tx.blockNumber);
            const pair = this.getPair(log.address);
            let token0, token1, 
            token0Decimals, token1Decimals, 
            token0Symbol, token1Symbol, 
            token0TotalSupply, token1TotalSupply;


            const _interface = new utils.Interface(univ3PoolABI);
            const pairAddress = log.address;
            const _v3Pair = new ethers.Contract(log.address, univ2PairABI, this.httpProvider);
            //get swap log for v3
            let parsedLog;
            try {
                parsedLog = _interface.parseLog(log);
            } catch(e) {
                console.log(e, parsedLog)
            }
            if (pair.length) {
                ({ token0, token1, 
                    token0Decimals, token1Decimals, 
                    token0Symbol, token1Symbol, 
                    token0TotalSupply, token1TotalSupply } = pair[0]);
                
                const _token0 = new ethers.Contract(token0, basicTokenABI, this.httpProvider);
                const _token1 = new ethers.Contract(token1, basicTokenABI, this.httpProvider);
            } else {
                token0 = await _v3Pair.token0();
                token1 = await _v3Pair.token1();
                try {
                    ({decimals: token0Decimals, symbol: token0Symbol, totalSupply: token0TotalSupply } = await this.getTokenDetails(token0));
                    ({decimals: token1Decimals, symbol: token1Symbol, totalSupply: token1TotalSupply } = await this.getTokenDetails(token1));
                    
                } catch(e) {
                    // console.log(e, parsedLog, poolToken, desiredToken)
                    console.log('error getting token details', e)
                    return {};
                }

            }
            if (Constants.StablesOrEth.includes(token0) && Constants.StablesOrEth.includes(token1)) return;
            if (!Constants.StablesOrEth.includes(token0) && !Constants.StablesOrEth.includes(token1)) return;
            //need case where neither is a stablecoin.
            const poolToken = Constants.StablesOrEth.includes(token0) ? token0 : token1;
            const desiredToken = poolToken == token0 ? token1 : token0;

            let transactionType, usdVolume, usdPrice,amountPoolTokenWithDecimals, amountDesiredTokenWithDecimals;
            //set up contracts
            let poolDecimals, desiredDecimals, desiredSymbol, totalSupply, poolSymbol;
            //set pool / decimal attributes
            poolDecimals = token0 == poolToken ? token0Decimals : token1Decimals;
            desiredDecimals = token1 == poolToken ? token0Decimals : token1Decimals;
            poolSymbol = token0 == poolToken ? token0Symbol : token1Symbol;
            desiredSymbol = token1 == poolToken ? token0Symbol : token1Symbol;
            totalSupply = token1 == poolToken ? token0TotalSupply : token1TotalSupply;
            
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
            //console.log(log.transactionHash, details)
            amountDesiredTokenWithDecimals = details.desiredTokenAmount / 10**desiredDecimals;
            amountPoolTokenWithDecimals = details.poolTokenAmount / 10 ** poolDecimals;
            const isStableCoin = [USDC,USDT,DAI,FRAX].includes(poolToken);
            const isWeth = poolToken == WETH;
            const isWBTC = poolToken == WBTC;
            
            if (details.desiredTokenAmount < 0) {
            
                transactionType = 1;
                if (isStableCoin) {
                    usdVolume = amountPoolTokenWithDecimals;
                    usdPrice = amountPoolTokenWithDecimals/amountDesiredTokenWithDecimals*-1;
                } 
                else if (isWeth) {
                    usdVolume = amountPoolTokenWithDecimals  * this.etherPrice ;
                    usdPrice = amountPoolTokenWithDecimals/amountDesiredTokenWithDecimals * this.etherPrice * -1;
                }
                else if (isWBTC) {
                    usdVolume = amountPoolTokenWithDecimals  * this.btcPrice ;
                    usdPrice = amountPoolTokenWithDecimals/amountDesiredTokenWithDecimals * this.btcPrice * -1;
                }
            } 
            else if (details.poolTokenAmount < 0) {
                
                transactionType = -1;
                if (isStableCoin) {
                    usdVolume = -1*amountPoolTokenWithDecimals;
                    usdPrice = -1*amountPoolTokenWithDecimals / amountDesiredTokenWithDecimals;
                } 
                else if (isWeth) {
                    usdVolume = -1*(amountPoolTokenWithDecimals ) * this.etherPrice;
                    usdPrice = -1*amountPoolTokenWithDecimals / amountDesiredTokenWithDecimals * this.etherPrice;
                }
                else if (isWBTC) {
                    usdVolume = -1*(amountPoolTokenWithDecimals ) * this.btcPrice;
                    usdPrice = -1*amountPoolTokenWithDecimals / amountDesiredTokenWithDecimals * this.btcPrice;
                }
            }
            //v3
            let marketCap = 0;
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
                pairAddress: log.address,
                usdVolume: usdVolume,
                usdPrice: usdPrice,
                isBuy: transactionType,
                txHash: log.transactionHash,
                wallet: tx.from,
                router: this.routerName(tx.to),
                etherPrice: this.etherPrice,
                marketCap: marketCap == null ? 0 : marketCap,
                dateTime: new Date(this.blockTimestamp).toISOString()
            }
            //post to pairs if pairs didnt exist
            if (!pair.length) {
                const pairBody = {
                    pairAddress: log.address,
                    token0,
                    token1,
                    token0Decimals,
                    token1Decimals,
                    token0Symbol,
                    token1Symbol,
                    token0TotalSupply,
                    token1TotalSupply
                }

                this.addToPairs(pairBody)
            }
            //this.addToSwaps(v3Swap)
            return v3Swap
        }
        catch(e) {
            console.log('v3Logs error', e)
        }
    }

    async getTokenDetails(token) {
        switch(token) {
            case WETH:
                return WETHContractDetails;
            case USDC:
                return USDCContractDetails;
            case USDT: 
                return USDTContractDetails;
            case DAI:
                return DAIContractDetails;
            case Constants.veryBankingContract:
                let _token = new ethers.Contract(token, veryBankingBytes32ABI, this.httpProvider)
                const details = {
                    totalSupply: (await _token.totalSupply()).toString(),
                    decimals: parseInt((await _token.decimals()).toString()),
                    symbol: ethers.utils.parseBytes32String(await _token.symbol())
                };
                return details;
            default:
                let _token2 = new ethers.Contract(token, basicTokenABI, this.httpProvider)
                
                return {
                    totalSupply: (await _token2.totalSupply()).toString(),
                    decimals: await _token2.decimals(),
                    symbol: await _token2.symbol()
                };
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
            case Constants.UniswapUniversalRouter:
                return "UniswapUniversalRouter";
            case Constants.MetamaskSwap:
                return "MetamaskRouter";
            case Constants.coinbasewalletProxy0x:
                return "CoinbaseWallet0x"
            case Constants.UniswapV3:
                return "UniswapV3";
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