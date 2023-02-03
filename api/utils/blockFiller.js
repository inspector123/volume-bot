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
import univ2FactoryABI from '../abi/UniV2FactoryABI.json' assert { type: "json" };
import univ3FactoryABI from '../abi/UniV3FactoryABI.json' assert { type: "json" };
import KyberswapABI from '../abi/KyberswapABI.json' assert { type: "json" };
import basicTokenABI from '../abi/basicTokenABI.json' assert { type: "json" };
import swapParser from './swapParser.js'
import Constants from "./constants.js"
import cliProgress from 'cli-progress'
import SwapParser from '../utils/swapParser.js';

const { uniV3Factory, univ2Factory, daiContract, disallowedPools, disallowedSymbols, disallowedTo, 
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
        this.archiveProvider = new ethers.providers.JsonRpcProvider({url: archiveUrl, timeout: 1200000});
        this.swapParser = new SwapParser(archiveUrl);
        this.contractsSetup();
    }

    async contractsSetup() {
        const blockNumber = await this.archiveProvider.getBlockNumber();
        console.log(`latest archive block: ${blockNumber}`)
    }

    async getLiqAddLog(contract, _fromBlock) {
        let fromBlock = _fromBlock;
        if (!_fromBlock) fromBlock = 10000000;
        const contractTopic = contract.toLowerCase().replace("0x", Constants.addZeros)
        try {

            let univ2Pos1 = await this.archiveProvider.getLogs({address: Constants.univ2Factory, topics: [[Constants.topics.UniV2PairCreatedTopic], [contractTopic]], fromBlock})
            let univ2Pos2 = await this.archiveProvider.getLogs({address: Constants.univ2Factory, topics: [[Constants.topics.UniV2PairCreatedTopic], null, [contractTopic]], fromBlock})
            let univ3Pos1 = await this.archiveProvider.getLogs({address: Constants.univ3Factory, topics: [[Constants.topics.UniV3PoolCreatedTopic], [contractTopic]], fromBlock})
            let univ3Pos2 = await this.archiveProvider.getLogs({address: Constants.univ3Factory, topics: [[Constants.topics.UniV3PoolCreatedTopic], null, [contractTopic]], fromBlock})
            const v3v2Events = [ univ2Pos1, univ2Pos2, univ3Pos1, univ3Pos2 ].flat()
            if (!v3v2Events.length) {
                let sushiPos1 = await this.archiveProvider.getLogs({address: sushiFactory1, topics: [[v2_pairCreatedTopic], [contractTopic]], fromBlock});
                let sushiPos2 = await this.archiveProvider.getLogs({address: sushiFactory1, topics: [[v2_pairCreatedTopic],null, [contractTopic]], fromBlock});
                const log =  [sushiPos1, sushiPos2].flat().sort(((a,b)=>a.blockNumber-b.blockNumber))[0];
                return timestamp

            } else {
                const log =  v3v2Events.sort(((a,b)=>a.blockNumber-b.blockNumber))[0];
                return log
            }
        } catch(e) {
            console.log('error getting add block', e, contract)
            return 1000000;
        }
    }

    async getAllSwapsFromContract(contract, blockRangeEnd) {
        //for now will have to specify if it's univ2 or univ3...
        // const pairAddress = new ethers.Contract(contract, )
        // const response = await this.archiveProvider.getLogs({})
        //step 0: check if contract already in DB
        try {
            const response = await api.get(`/api/swaps/${contract}?max=true`)
            let pairAddress, router, liqAddBlockNumber, allSwaps, fromBlock;
            if (response.data.data[0].latestBlock != null) {
                fromBlock = response.data.data[0].latestBlock
                pairAddress = response.data.data[0].pairAddress

            } else {
                //get liquidity add event
                const log = await this.getLiqAddLog(contract, 14000000);
                console.log('pair created at block',log.blockNumber )
                if (!log) throw new Error('no log found');
                liqAddBlockNumber = log.blockNumber;
                fromBlock = liqAddBlockNumber;
                if (log.address == Constants.univ2Factory) {
                    const _interface = new ethers.utils.Interface(univ2FactoryABI);
                    const parsedLog = _interface.parseLog(log);
                    pairAddress = parsedLog.args.pair;
                    this.swapParser.setPairAddress(pairAddress);
                    router = "v2"
                } else if (log.address == Constants.univ3Factory) {
                    const _interface = new ethers.utils.Interface(univ3FactoryABI);
                    const parsedLog = _interface.parseLog(log);
                    pairAddress = parsedLog.args.pool;
                    this.swapParser.setPairAddress(pairAddress);
                    router = "v3"
                }
            }
            
            const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

            let toBlock;
            if (blockRangeEnd) {
                toBlock = fromBlock + blockRangeEnd;
            }
            await this.swapParser.getAllPairs();
            if (router == "v2") {
                allSwaps = await this.archiveProvider.getLogs({address: pairAddress, topics: [[Constants.v2topic]], fromBlock, toBlock })
                bar1.start(allSwaps.length, 0);
                for (let i in allSwaps) {
                    await this.swapParser.grabSwap(allSwaps[i])
                    bar1.increment();
                }
            } else if (router == "v3") {
                allSwaps = await this.archiveProvider.getLogs({address: pairAddress, topics: [[Constants.v3topic]], fromBlock, toBlock })
                bar1.start(allSwaps.length, 0);
                for (let i in allSwaps) {
                    await this.swapParser.grabSwap(allSwaps[i])
                    bar1.increment();
                }
            } else {
                allSwaps = await this.archiveProvider.getLogs({address: pairAddress, topics: [[Constants.v3topic, Constants.v2topic]], fromBlock, toBlock })
                console.log(allSwaps)
                bar1.start(allSwaps.length, 0);
                for (let i in allSwaps) {
                    await this.swapParser.grabSwap(allSwaps[i])
                    bar1.increment();
                }
            }
            console.log(this.swapParser.newPairsData, 'pair length to post')

            if (this.swapParser.newPairsData.length) {
                try {
                    await api.post('/api/pairs', this.swapParser.newPairsData)
                }catch(e) {
                    console.log(e.response.data)
                }
            }
            console.log('sending swaps to db.')
            if (this.swapParser.allSwapsData.length) {
                try {
                    await api.post(`/api/swaps?table=ContractSwaps`, this.swapParser.allSwapsData)
                }catch(e) {
                    console.log(e.response.data)
                }
            }
            this.swapParser.reset();
        } catch(e) {
            console.log('error', e)
        }

        //step 2: 

        

    }

    async runSwapParseSqlRoutine(fromBlock, toBlock) {
        try {
            if (!fromBlock || !toBlock) throw new Error('missing from or to block')
            if (!table) throw new Error('missing table');
            

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
            time1 = Date.now();
            console.log(this.swapParser.newPairsData.length, 'pair length to post')
            if (this.swapParser.newPairsData.length) {
                try {
                    await api.post('/api/pairs', this.swapParser.newPairsData)
                }catch(e) {
                    console.log(e.response.data)
                }
            }
            totalTime = Date.now()-time1;
            console.log('time to post all pairs: ', totalTime/1000)
            console.log('part 3: sending blocks to api. ')
            time1 = Date.now();
            if (this.swapParser.allSwapsData.length) {
                try {
                    await api.post('/api/blocks', this.swapParser.allSwapsData)
                }catch(e) {
                    console.log(e.response.data)
                }
            }
            totalTime = (Date.now()-time1)/1000;
            console.log('time to post all blocks: ', totalTime)
            console.log('DONE.')
            // if (stats) {
            //     const { data: {data: _data}} = await api.get('/api/blocks/1?count=true');

            //     console.log('current block count: ', _data[0].count);
            // }
            this.swapParser.reset();
            return;
        } catch(e) {
            console.error(e)
        }
    }


}


//notes

//select blockNumber, txHash, usdVolume, wallet, COUNT(*) from BlockEvents where blockNumber,txHash,usdVolume,wallet,pairAddress HAVING COUNT(*)>1
//need to use this query to get all duplicates that came from the inclusive getLogs query where I ended up writing 2 times into the final block of the iteration