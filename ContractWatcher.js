
import api from "./api/utils/axios.js"
import { Telegraf } from 'telegraf';
import { ethers, utils } from "ethers"
import SwapParser from './api/utils/swapParser.js'
import fetch from 'node-fetch';

const v3topic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Swap(address,address,int256,int256,uint160,uint128,int24)"));
const v2topic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Swap(address,uint256,uint256,uint256,uint256,event PairCreatedaddress)"));
const addZeros = "0x000000000000000000000000"
const v3factory = "0x1F98431c8aD98523631AE4a59f267346ea31F984"
const v2factory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"
const sushiFactory1 = "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac"
const v3_poolCreatedTopic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PoolCreated(address,address,uint24,int24,address)"))
const v2_pairCreatedTopic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PairCreated(address,address,address,uint256)"))
const saitaFactory = "0x35113a300ca0D7621374890ABFEAC30E88f214b1"
const sushiv1_pairCreatedTopic = v2_pairCreatedTopic
class ContractWatcher {

    currentBlock;
    volumeBotKey;
    chatId;
    httpProvider;
    archiveProvider;
    archiveNodeUrl;
    gettingPrintout = true;
    blocksPerMin = 5;
    latestBlockNumber;
    busy;
    blocks = 0;

    constructor(chatId, volumeBotKey, fullNodeUrl, archiveNodeUrl) {

        this.chatId = chatId;
        this.volumeBot = new Telegraf(volumeBotKey);
        this.httpProvider = new ethers.providers.JsonRpcProvider(fullNodeUrl);
        this.archiveProvider = new ethers.providers.JsonRpcProvider(archiveNodeUrl);
        this.batchProvider = new ethers.providers.JsonRpcBatchProvider(archiveNodeUrl);
        this.archiveNodeUrl = archiveNodeUrl;
        this.swapParser = new SwapParser(fullNodeUrl,archiveNodeUrl);
        this.setUpVolumeBot();
        this.node();
    }

    async node() {
        this.httpProvider.on('block', (latestBlockNumber)=>{
            this.latestBlockNumber = latestBlockNumber;
            this.blocks++;
            if (!(this.blocks % 25)) {
                console.log('running 5m job')
                this.run5mJob();
            }

        })
        
    }

    async getLiqAddBlock(contract, _fromBlock) {
        let fromBlock = _fromBlock;
        if (!_fromBlock) fromBlock = 1000000;
        const contractTopic = contract.toLowerCase().replace("0x", addZeros)
        try {

            let univ2Pos1 = await this.archiveProvider.getLogs({address: v2factory, topics: [[v2_pairCreatedTopic], [contractTopic]], fromBlock})
            let univ2Pos2 = await this.archiveProvider.getLogs({address: v2factory, topics: [[v2_pairCreatedTopic], null, [contractTopic]], fromBlock})
            let univ3Pos1 = await this.archiveProvider.getLogs({address: v3factory, topics: [[v3_poolCreatedTopic], [contractTopic]], fromBlock})
            let univ3Pos2 = await this.archiveProvider.getLogs({address: v3factory, topics: [[v3_poolCreatedTopic], null, [contractTopic]], fromBlock})
            const v3v2Events = [ univ2Pos1, univ2Pos2, univ3Pos1, univ3Pos2 ].flat()
            if (!v3v2Events.length) {
                let sushiPos1 = await this.archiveProvider.getLogs({address: sushiFactory1, topics: [[v2_pairCreatedTopic], [contractTopic]], fromBlock});
                let sushiPos2 = await this.archiveProvider.getLogs({address: sushiFactory1, topics: [[v2_pairCreatedTopic],null, [contractTopic]], fromBlock});
                const { blockNumber } =  [sushiPos1, sushiPos2].flat().sort(((a,b)=>a.blockNumber-b.blockNumber))[0];
                const { timestamp } = await this.archiveProvider.getBlock(blockNumber)
                return timestamp

            } else {
                const { blockNumber } =  v3v2Events.sort(((a,b)=>a.blockNumber-b.blockNumber))[0];
                const { timestamp } = await this.archiveProvider.getBlock(blockNumber)
                return timestamp
            }
        } catch(e) {
            console.log('error getting add block', e, contract)
            return 1000000;
        }
    }

    async fillBlockRange(startBlock, endBlock) {
        const time1 = Date.now()
        let swapLogs = await this.archiveProvider.getLogs({topics:[[v2topic, v3topic]], fromBlock: startBlock,toBlock: endBlock})
        let swaps = []
        for (let i in swapLogs) {
            console.log(i)
            const swap = await this.swapParser.grabSwap(swapLogs[i]);
            swaps = [...swaps, swap]
        }
        console.log((Date.now()-time1)/1000)
        console.log(swaps)
        
    }

    async run5mJob() {
        
        try {
            //read from blockevents table last 5m of entries (last 25 blocks.)
            const sortedVolume = await this.sortedSpecifyBlockNumber(this.latestBlockNumber-25);
            
            //get contracts that currently exist in Contracts table from last sql query.
            const existingContracts = await api.post('/api/contracts?matching=true', sortedVolume.map(b=>b.contract))
            let existingContractsData = []
            if (existingContracts.data.data.length) existingContractsData = existingContracts.data.data;
            console.log('matching', existingContracts.data.data.length)

            //for contracts that don't exist, get their age and add them
            const newContracts = sortedVolume.filter(symbol=>!existingContractsData.map(d=>d.contract).includes(symbol.contract));
            console.log('newContracts length', newContracts.length)
            const postObjects = await Promise.all(newContracts.map(async sym=>{
                const liqAddBlock = await this.getLiqAddBlock(sym.contract)
                return {
                    symbol: sym.symbol,
                    contract: sym.contract,
                    liqAddBlock,
                    volume5m: sym.volume,
                    volume15m: 0,
                    volume1h: 0,
                    volume1d: 0
                }
            }));


            console.log('got liq add blocks')
            await this.postContracts(postObjects);

            
            // 4. for each contract that does exist, make a PUT with the 5m volume.
            //take sorted volume and sort by "existingContracts"
            let putObjects = [];
            if (existingContractsData.length) {

                putObjects = existingContractsData.map(c=>{
                    const { volume: volume5m } = sortedVolume.filter(b=>b.contract == c.contract)[0];
                    return {
                        volume5m,
                        ...c
                    }

                })
                await this.putContracts(putObjects);
            }
            
            let allObjects = [...putObjects, postObjects].flat();
            for (let i in allObjects) {
                let timeSinceAdd = (Date.now()/1000 - allObjects[i].liqAddBlock)/60
                if (allObjects[i].volume5m > 20000 && timeSinceAdd < 30) {
                    this.volumeBot.telegram.sendMessage(this.chatId, `volume alert on ${allObjects[i].symbol}, contract ${allObjects[i].contract}, volume5m ${allObjects[i].volume5m}`)
                }
            }

            // 5. Telegram bot message: if volume is greater than 10k in last 5 minutes and age is less than 30 minutes, send message.



            //
        } catch(e) {
            console.log(e)
        }

    }

    //next is run15mjob

    async postContracts(contractsArray) {
            //console.log(contractsArray)
            for (let i in contractsArray) {
                try {
                    const response = await api.post('/api/contracts', contractsArray[i])
                }
                catch(e) {
                    console.log(e.response?.err?.data)
                    return;
                }
            }
            if (contractsArray.length) console.log(`${contractsArray.length} new contracts added to table`)
        
    }
    async putContracts(array) {
        for (let i in array) {
            try {
                const response = await api.put(`/api/contracts/${array[i].contract}?volume5m=${array[i].volume5m}`)
            } catch(e) {
                console.log('error putting', e.response?.status, e.response?.data)
            }
        }
        if (array.length) console.log(`${array.length} contracts 5m Volume updated.`)
    }

    setUpVolumeBot() {

        this.volumeBot.command('run5m', async ()=>{
            this.volumeBot.telegram.sendMessage(this.chatId, 'running 5m Job')
            this.run5mJob();
        })

        this.volumeBot.command('fill', async (ctx)=>{
            this.volumeBot.telegram.sendMessage(this.chatId, 'disabled')
            // const replacedText = ctx.message.text.replace('/fill ', '')
            // //now have 1349339 32893903
            // const re = replacedText.match(/([0-9]*)\w([0-9]*)/g)
            // const blockNumberStart = parseInt(re[0])
            // const blockNumberEnd = parseInt(re[1])
            // if (blockNumberStart > blockNumberEnd ) {
            //     this.volumeBot.telegram.sendMessage(this.chatId, 'number1 must be > number2');
            //     return;
            // } else {
            //     this.fillBlockRange(blockNumberStart,blockNumberEnd)
            // }
        
            
            //await this.run5mJob();
        })



        this.volumeBot.command('printout', (ctx)=> {
                const messageText = '/printout ';
                this.volumeBot.telegram.sendMessage(this.chatId, 'test');
                
                const replacedText = ctx.message.text.replace(messageText, '')
                console.log(replacedText)
            
        })



        this.volumeBot.command('reset', ()=>{
            this.gettingPrintout = false;
            this.busy = false;
        })

        this.volumeBot.command('sortedmanual', async (ctx) => {
            try {
                this.volumeBot.telegram.sendMessage(this.chatId, 'this command is disabled')
                // const messageText = '/sortedmanual ';
                // this.volumeBot.telegram.sendMessage(this.chatId, 'test');
                
                // const replacedText = ctx.message.text.replace("/sortedmanual ", ' ')
                // if (parseInt(replacedText) < 100000) {
                //     const response = await this.getFromBlock(replacedText)
                //     this.sortOutput(response)
                // } else {
                //     this.volumeBot.telegram.sendMessage(this.chatId, `error processing, non number or bad number given`)
                // }
            } catch(e) {
                this.volumeBot.telegram.sendMessage(this.chatId, `error try again`)
            }
        })

        this.volumeBot.command('sorted', async (ctx) => {
            try {
                const messageText = '/sorted ';
                this.volumeBot.telegram.sendMessage(this.chatId, 'processing');
                
                const replacedText = ctx.message.text.replace("/sorted ", '')
                if (parseInt(replacedText) < 100000) {
                    const response = await this.sortedSpecifyBlockNumber(this.currentBlock - replacedText)
                    if (response.length > 50) {
                        for (let i = 0; i<response.length; i+50) {
                            const end = i+50 > response.length ? response.length : i+50;
                            const start = end-49
                            this.volumeBot.telegram.sendMessage(this.chatId, JSON.stringify(response.data.data.slice(start,end)))
                        }
                    } else {
                        this.volumeBot.telegram.sendMessage(this.chatId, `${JSON.stringify(response)}`)
                    }
                    
                    // if (response.length < 50) {
                    //    
                    // } else {
                    //     this.volumeBot.telegram.sendMessage(this.chatId, `${JSON.stringify(response.slice(0,50))}`)
                    // }

                } else {
                    this.volumeBot.telegram.sendMessage(this.chatId, `error processing, non number or bad number given`)
                }
                return;
            } catch(e) {
                this.volumeBot.telegram.sendMessage(this.chatId, `error try again`)
            }
        })
        
        this.volumeBot.launch();
    }

    async getBasicPrintout(time) {
        api.get('/api/blocks?')
    }

    async getBasicSortedVolumePrintout(time) {
        let blocks = this.getBlocksfromTime(time);
        console.log(blocks)
        if (blocks == 0) return 'error';

        const response = await api.get(`api/blocks/from/${blocks}?sortBySymbol=1`);
        const data = response.data.data;

        const _string = data.reduce((i, j)=> {
            return `symbol: ${i.symbol}, sum(usdVolume): ${i.volume}, contract: ${i.contract}
            ----------------------------------------------------------------------------------
            symbol: ${j.symbol}, sum(usdVolume): ${j.volume}, contract: ${j.contract}
            ----------------------------------------------------------------------------------`
        })
        console.log(_string, 'asdfkjl')
        return data;
    }

    async sortedSpecifyBlockNumber(blockNumber) {
        const response = await api.get(`/api/blocks/from/${blockNumber}?sortBySymbol=1`)
        return response.data.data;
    }

    async createContracts() {
        return;
    }

    async testBatch() {
        const object = [16300000,16299999,16299998,16299997,16299996,1629995]
            const reqs = []
            for (let i in object) {
                reqs.push({
                    method: 'eth_getBlockByNumber',
                    params: [ethers.utils.hexValue(object[i]), true],
                    id:parseInt(i)+1,
                    jsonrpc: 2.0
                })
            }
            console.log(reqs)
            let response = await fetch(this.archiveNodeUrl, {
                method: 'POST',
                body: JSON.stringify(reqs),
                headers: { 
                    'Content-Type': 'application/json'
                }
            });
            console.log(await response.json());
    }

    // async getFromBlock(block){
    //     const response = await api.get(`/api/blocks/from/${block}`);
    //     return response.data;
    // }


    getBlocksfromTime(time){
        let blocks;
        console.log(time)
        switch (time) {
            case '5m':
                blocks = 25
                break;
            case '15m':
                blocks = 75
                break;
            case '1h':
                blocks = 300
                break;
            case '1D':
                blocks = 7200
                break;
            default:
                blocks = 0
                break;
        }
        return blocks;
    }
}


export default ContractWatcher;