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
import SwapParser from '../utils/swapParser.js';

const { daiContract, disallowedPools, disallowedSymbols, disallowedTo, 
    mevBot1, mevBot2, busdETH, USDCUSDT, v2USDTDAI, sushiswapUSDTv2, v3DAI_2, v2USDC, 
    pancakeUSDC, pancakeUSDT, v2USDT, v3_DaiUSDCv4, v3USDC, v3Usdt, v3DaiUsdt,
    KyberSwap, KyberSwapInBetweenContract, USDC, WETH, WBTC, FRAX, BUSD, DAI, USDT, wstETH,
    acceptedRouters, botContracts, UniswapV3Router2, OneInchV4Router,OneInchv5Router,SushiSwapRouter, UniswapV2, StablesOrEth, apiKey } = Constants;
const v3topic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Swap(address,address,int256,int256,uint160,uint128,int24)"))
const v2topic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Swap(address,uint256,uint256,uint256,uint256,address)"))


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
        await this.runSwapParseSqlRoutine(minBlockNumber-1000, minBlockNumber-1)
        
    }

    async fillBetween(block1,block2) {
        console.log('starting block: ', block1, 'ending block: ', block2)
        await this.runSwapParseSqlRoutine(block1, block2)
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

    async runSwapParseSqlRoutine(fromBlock, toBlock) {
        try {
            if (!fromBlock || !toBlock) throw new Error('missing from or to block')
            console.log('getting all pairs')
            await this.swapParser.getAllPairs();
            let time1 = Date.now();

            let swaps = await this.archiveProvider.getLogs({topics:[[v2topic,v3topic]], fromBlock, toBlock})
            console.log('swaps length: ', swaps.length)

            const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

            bar1.start(swaps.length, 0);

            for (let i in swaps) {
                let parsedSwap = await this.swapParser.grabSwap(swaps[i]);
                bar1.increment();
            }
            // stop the progress bar
            bar1.stop();
            let totalTime = Date.now()-time1;
            console.log(`time for blocks: ${totalTime/1000}`)

            console.log('part 2: sending pairs to api. ')
            const bar2 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

            bar2.start(this.swapParser.newPairsData.length, 0);
            time1 = Date.now();
            for (let i in this.swapParser.newPairsData) {
                try {
                    await api.post('/api/pairs', this.swapParser.newPairsData[i])
                    bar2.increment();
                }catch(e) {
                    console.log(e.response.data)
                }
            }
            totalTime = Date.now()-time1;
            console.log('time to post all pairs: ', totalTime)

            const bar3 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

            bar3.start(this.swapParser.allSwapsData.length, 0);
            time1 = Date.now();


            for (let i in this.swapParser.allSwapsData) {
                try {
                    await api.post('/api/blocks', this.swapParser.allSwapsData[i])
                    bar3.increment();
                }catch(e) {
                    console.log(e.response.data)
                }
            }
            totalTime = Date.now()-time1;
            console.log('time to post all pairs: ', totalTime)
            return;
        } catch(e) {
            console.error(e)
        }
    }


}


//notes

//select blockNumber, txHash, usdVolume, wallet, COUNT(*) from BlockEvents where blockNumber,txHash,usdVolume,wallet,pairAddress HAVING COUNT(*)>1
//need to use this query to get all duplicates that came from the inclusive getLogs query where I ended up writing 2 times into the final block of the iteration