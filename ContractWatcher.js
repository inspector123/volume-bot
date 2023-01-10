
import api from "./api/utils/axios.js"
import { Telegraf } from 'telegraf';
import { ethers, utils } from "ethers"
import SwapParser from './api/utils/swapParser.js'

const v3topic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Swap(address,address,int256,int256,uint160,uint128,int24)"));
const v2topic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Swap(address,uint256,uint256,uint256,uint256,event PairCreatedaddress)"));
const addZeros = "0x000000000000000000000000"
const v3factory = "0x1F98431c8aD98523631AE4a59f267346ea31F984"
//const poolCreatedTopic = "0x783cca1c0412dd0d695e784568c96da2e9c22ff989357a2e8b1d9b2b4e6b7118"
const v2factory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"
//const pairCreatedTopic = "0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9"
const poolCreatedTopic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PoolCreated(address,address,uint24,int24,address)"))
const pairCreatedTopic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PairCreated(address,address,address,uint256)"))
console.log(pairCreatedTopic)
class ContractWatcher {

    currentBlock;
    volumeBotKey;
    chatId;
    httpProvider;
    archiveProvider;
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
        this.swapParser = new SwapParser(fullNodeUrl,archiveNodeUrl);
        this.setUpVolumeBot();
        this.node();
    }

    node() {
        this.httpProvider.on('block', (latestBlockNumber)=>{
            this.latestBlockNumber = latestBlockNumber;
            this.blocks++;
            // if (!(this.blocks % 25)) {
            //     this.run5MJob(blockNumber);
            // }

        })

        this.test();
    }
    async getAge(contract) {

        const contract = `${addZeros}${contract.toLowerCase()}`;
        try {
            let univ2Pos1 = await this.archiveProvider.getLogs({address: v2factory, topics: [[pairCreatedTopic], [contract]], fromBlock: 13000000})
            let univ2Pos2 = await this.archiveProvider.getLogs({address: v2factory, topics: [[pairCreatedTopic], null, [contract]], fromBlock: 13000000})
            let univ3Pos1 = await this.archiveProvider.getLogs({address: v3factory, topics: [[poolCreatedTopic], [contract]], fromBlock: 13000000})
            let univ3Pos2 = await this.archiveProvider.getLogs({address: v3factory, topics: [[poolCreatedTopic], null, [contract]], fromBlock: 13000000})
            const earliestLiquidityEvent = [ univ2Pos1, univ2Pos2, univ3Pos1, univ3Pos2 ].flat().sort(((a,b)=>a.blockNumber-b.blockNumber))[0].blockNumber;

            const age = this.latestBlockNumber - earliestLiquidityEvent;
            console.log(age)
        } catch(e) {
            console.log('error getting age', e)
        }
    }

    // async run5mJob() {
    //     const filter = {
    //         topics: [[v3topic, v2topic]],
    //         fromBlock: this.latestBlockNumber-60,
    //         toBlock: this.latestBlockNumber
    //     }
    //     const logs = await this.httpProvider.getLogs(filter);
    //     let swaps = []
    //     for (let i in logs) {
    //         const swap = await this.swapParser.grabSwap(logs[i]);
    //         swaps = [...swaps, swap]

    //     }

    // }

    async run5mJob() {
        
        try {
            //         1. read from blockevents table last 5m of entries (last 25 blocks.)
            //  - SQL QUERY: get blockevents last 25 blocks (already done)
            const sortedVolume = await this.sortedSpecifyBlockNumber(this.currentBlock-25);
            
            const contracts = sortedVolume.map(b=>b.contract);

            // 2. get all contracts that match those contracts from the last 25 blocks
            //  - SQL QUERY: get contracts matching contracts from last sql query.
            const contractsMatching = await api.post('/api/contracts/matching', sortedVolume.map(b=>b.contract))
            console.log(contractsMatching.data)


            // 3. for each contract that does not exist, make a POST with the 5m volume and contract age (using archive node).
            //  - sql query - see above
            // 3a. get contracts that don't exist. then compile statistics and get object.

            const nonExistentContracts = sortedVolume.filter(symbol=>!contractsMatching.includes(symbol.contract));

            const contractObjects = await Promise.all(contractsToPost.map(sym=>{
                //const age = //get logs where the pair , and get the first log. except gettign every log is going to take forever?
                /*
                how will we handle getting the first swap?

                if it's v3 get v3 liquidity topic.
                
                if it's v2 get v2 liquiity topic.
                */
                const isV3 = true; // testing only
                if (isV3) {
                    const poolCreatedLog = this.archiveProvider.getLogs({address: v3factory, topics: [[poolCreatedTopic], [sym.contract, null], [sym.contract, null]], })
                } else {
                    const pairCreatedLog = this.archiveProvider.getLogs({address: v2factory, topics: [[pairCreatedTopic], [null, sym.contract], [null, sym.contract]]})
                }
                return {
                    symbol: sym.symbol,
                    decimals: 0,
                    contract: sym.contract,
                    age

                }
            }));
            
            


/*CREATE TABLE Contracts(id int NOT NULL AUTO_INCREMENT,
                        symbol varchar(50) NOT NULL,
                        decimals varchar(50) NOT NULL,
                        contract varchar(50) NOT NULL,
                        age varchar(50) NOT NULL,
                        volume5m varchar(50) NOT NULL,
                        volume15m varchar(50) NOT NULL,
                        volume1h varchar(50) NOT NULL,
                        volume1d varchar(50) NOT NULL,
                        PRIMARY KEY (id)
                        
                        );*/

            
            // 4. for each contract that does exist, make a PUT with the 5m volume.
            //  - sql query - see above

            // 5. Telegram bot message: if volume is greater than 10k in last 5 minutes and age is less than 30 minutes, send message.



            //
        } catch(e) {
            console.log(e)
        }

    }

    setUpVolumeBot() {

        this.volumeBot.command('run5m', async ()=>{
            this.volumeBot.telegram.sendMessage(this.chatId, 'running 5m Job')
            await this.run5mJob();
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
        console.log(response.data.data.length)
        return response.data.data;
    }

    async createContracts() {
        return;
    }

    async getFromBlock(block){
        const response = await api.get(`/api/blocks/from/${block}`);
        console.log(response.data.data)
        return response.data;
    }


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