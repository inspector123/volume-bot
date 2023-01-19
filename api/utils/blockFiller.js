// Bot which backfills old or missing blocks using archive node.



import axios from 'axios'
import api from './axios.js'
import { Telegraf } from 'telegraf';
//import wallets from './wallets.js'
import UniV2FactoryABI from '../abi/uniswapFactoryABI.json' assert { type: "json" };
import { ethers } from "ethers"
import USDCABI from "../abi/usdcabi.json" assert { type: "json" };
import USDTABI from "../abi/usdtabi.json" assert { type: "json" };
import WETHABI from '../abi/wethabi.json' assert { type: "json" };
import DAIABI from '../abi/DAIABI.json' assert { type: "json" };
import univ3v2ABI from '../abi/univ3v2abi.json' assert { type: "json" };
import tokenABI from '../abi/tokenABI.json' assert { type: "json" };
import univ2PairABI from '../abi/univ2PairABI.json' assert { type: "json" };
import univ3PoolABI from '../abi/uniV3PoolABI.json' assert { type: "json" };
import KyberswapABI from '../abi/KyberswapABI.json' assert { type: "json" };
import basicTokenABI from '../abi/basicTokenABI.json' assert { type: "json" };
import swapParser from './swapParser.js'
import Constants from "./constants.js"
import cliProgress from 'cli-progress'


const { daiContract, disallowedPools, disallowedSymbols, disallowedTo, 
    mevBot1, mevBot2, busdETH, USDCUSDT, v2USDTDAI, sushiswapUSDTv2, v3DAI_2, v2USDC, 
    pancakeUSDC, pancakeUSDT, v2USDT, v3_DaiUSDCv4, v3USDC, v3Usdt, v3DaiUsdt,
    KyberSwap, KyberSwapInBetweenContract, USDC, WETH, WBTC, FRAX, BUSD, DAI, USDT, wstETH,
    acceptedRouters, botContracts, UniswapV3Router2, OneInchV4Router,OneInchv5Router,SushiSwapRouter, UniswapV2, StablesOrEth, apiKey } = Constants;
import SwapParser from '../utils/swapParser.js';

export class BlockFiller {

    chatId;
    archiveProvider;
    swapParser;


    constructor(chatId, archiveUrl) {
        this.chatId = chatId;
        this.archiveProvider = new ethers.providers.JsonRpcProvider(archiveUrl);
        this.swapParser = new SwapParser(archiveUrl);
        this.contractsSetup();
    }

    async contractsSetup() {
        
        const blockNumber = await this.archiveProvider.getBlockNumber();

        console.log(`latest archive block: ${blockNumber}`)
    }

    async fillBlocksFromBehind(blocks) {
        // step 1: get first blockNumber in your database.
        const response = await api.get(`/api/blocks/1?min=true`);
        const { minBlockNumber } = response.data.data[0];
        console.log('starting block: ', minBlockNumber)
        const time1 = Date.now();
        const v3topic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Swap(address,address,int256,int256,uint160,uint128,int24)"))
        const v2topic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Swap(address,uint256,uint256,uint256,uint256,address)"))

        let swaps = await this.archiveProvider.getLogs({topics:[[v2topic,v3topic]], fromBlock: minBlockNumber-1000, toBlock: minBlockNumber-1})
        console.log('swaps length: ', swaps.length)
        let swapsToSend = []

        //progress bar
        const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        bar1.start(swaps.length, 0);

        for (let i in swaps) {
            let parsedSwap = await this.swapParser.grabSwap(swaps[i]);
            bar1.increment();
        }
        // stop the progress bar
        bar1.stop();
        console.log('SWAPS TO SEND LENGTH:', swapsToSend.length)
        const totalTime = Date.now()-time1;
        console.log(`time for blocks: ${totalTime/1000}`)
        return;
    }

    async sendToApi(swaps) {
        try {
            //Blocks
            if (!swaps || !swaps.length) return;
            let _swaps = swaps
            
            for (let i in _swaps.flat()) {
                const response = await api.post(`/api/blocks`, _swaps[i]);
            }
            this.swapParser.currentBlockSwaps = []
           
        } catch (e) {
            console.log(e)
            this.previousBlockSwaps = []

        }
    }


}

//notes

//select blockNumber, txHash, usdVolume, wallet, COUNT(*) from BlockEvents where blockNumber,txHash,usdVolume,wallet,pairAddress HAVING COUNT(*)>1
//need to use this query to get all duplicates that came from the inclusive getLogs query where I ended up writing 2 times into the final block of the iteration