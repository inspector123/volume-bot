
import api from "./api/utils/axios.js"
import { Telegraf } from 'telegraf';
import { ethers, utils } from "ethers"
import SwapParser from './api/utils/swapParser.js'
import fetch from 'node-fetch';
import Constants from "./api/utils/constants.js";
import cliProgress from 'cli-progress'
import * as fs from 'fs'

const v3topic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Swap(address,address,int256,int256,uint160,uint128,int24)"));
const v2topic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Swap(address,uint256,uint256,uint256,uint256,event PairCreatedaddress)"));
const addZeros = "0x000000000000000000000000"
const v3factory = "0x1F98431c8aD98523631AE4a59f267346ea31F984"
const v2factory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"
const sushiFactory1 = "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac"
const shibaFactory = "0x115934131916C8b277DD010Ee02de363c09d037c"
const v3_poolCreatedTopic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PoolCreated(address,address,uint24,int24,address)"))
const v2_pairCreatedTopic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PairCreated(address,address,address,uint256)"))
const ownershipTransferredTopic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("OwnershipTransferred(address,address)"))
const unicryptTopic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("onDeposit(address,address,uint256uint256uint256)"))
const teamFinanceTopic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Deposit (uint256,address,address,uint256,uint256)"))
const deadAddressTopicAddress = "0x0000000000000000000000000000000000000000000000000000000000000000"
const saitaFactory = "0x35113a300ca0D7621374890ABFEAC30E88f214b1"
const sushiv1_pairCreatedTopic = v2_pairCreatedTopic
const UniV2BurnTopic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Burn(address,uint256,uint256,address)"))
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

    constructor(chatId, volumeBotKey, archiveNodeUrl) {

        this.chatId = chatId;
        this.volumeBot = new Telegraf(volumeBotKey);
        this.volumeBot.catch(e=>console.log(e))
        this.archiveProvider = new ethers.providers.JsonRpcProvider(archiveNodeUrl);
        this.httpProvider = this.archiveProvider;
        this.archiveNodeUrl = archiveNodeUrl;
        this.swapParser = new SwapParser(archiveNodeUrl);
    }

    start() {
        this.setUpVolumeBot();
        this.node();
    }


    async node() {
        this.httpProvider.on('block', (latestBlockNumber)=>{
            this.latestBlockNumber = latestBlockNumber;
            console.log('latest block: ', latestBlockNumber)
            if (this.blocks == 0) this.run1mJob();
            this.blocks++;
            if (!(this.blocks % 5)) {
                console.log('running 1m job')
                this.run1mJob();
            }
            // if (!(this.blocks % 25)) {
            //     console.log('running 5m job')
            //     this.run5mJob();
            // }
            // if (!(this.blocks % 75)) {
            //     console.log('running 15m job')
            //     this.run15mJob();
            // }


        })
        // this.httpProvider.on({topics: [ownershipTransferredTopic]}, async (log)=>{
        //     if (!log.topics.includes(deadAddressTopicAddress))
        //         return;
        //     if (log.topics[2]!=deadAddressTopicAddress) console.log('not in position 2');
        //     else {
        //         console.log('renounce')
        //         console.log(contract.data.data)
        //      const contract = await api.put(`/api/contracts`, { renounceBlock: log.blockNumber });
        //        }


        // })

        // const log = await this.httpProvider.getLogs({topics: [[ownershipTransferredTopic]], fromBlock:16451383, toBlock:16451383})
        // console.log(log)

        //this.httpProvider.on()
        

        
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
                let shibaPos1 = await this.archiveProvider.getLogs({address: shibaFactory, topics: [[v2_pairCreatedTopic], [contractTopic]], fromBlock})
                let shibaPos2 = await this.archiveProvider.getLogs({address: shibaFactory, topics: [[v2_pairCreatedTopic], null, [contractTopic]], fromBlock})
                const shibaEvents = [shibaPos1, shibaPos2].flat()
                if (shibaEvents.length) {
                    const { blockNumber } =  [shibaPos1, shibaPos2].flat().sort(((a,b)=>a.blockNumber-b.blockNumber))[0];
                    const { timestamp } = await this.archiveProvider.getBlock(blockNumber)
                    return timestamp
                }
                if (!shibaEvents.length) {
                    let sushiPos1 = await this.archiveProvider.getLogs({address: sushiFactory1, topics: [[v2_pairCreatedTopic], [contractTopic]], fromBlock});
                    let sushiPos2 = await this.archiveProvider.getLogs({address: sushiFactory1, topics: [[v2_pairCreatedTopic],null, [contractTopic]], fromBlock});
                    const sushiEvents = [sushiPos1, sushiPos2].flat()
                    if (sushiEvents.length) {
                        const { blockNumber } =  [sushiPos1, sushiPos2].flat().sort(((a,b)=>a.blockNumber-b.blockNumber))[0];
                        const { timestamp } = await this.archiveProvider.getBlock(blockNumber)
                        return timestamp
                    }
                }

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

    async getLiqLockBlock(contract) {
        try {
            const lockEventLogs = await this.archiveProvider.getLogs({address: contract, topics: [[unicryptTopic, teamFinanceTopic]]})
            if (lockEventLogs.length) {
                lockEventLogs.sort((a,b)=>a.blockNumber - b.blockNumber);
                return lockEventLogs[0]
            }
            return 0
        } catch(e) {
            console.log('error getting liqlock block ', e)
        }
    }

    async getRenounceBlock(contract) {
        try {
            const renounceEventLog = await this.archiveProvider.getLogs({address: contract, topics: [[ownershipTransferredTopic]]})
            console.log(renounceEventLog)
            if (renounceEventLog.length) {
                console.log(renounceEventLog)
                return renounceEventLog[0].blockNumber
            }
            return 0
        } catch(e) {
            console.log('error getting renounce block', e)
        }
        return;
    }

    async run1mJob() {
        
        try {
            //1. Update contracts table with new contracts.


            //read from blockevents table last 1m of entries (last 5 blocks)
            const sortedVolume = await this.sortedSpecifyBlockNumber(this.latestBlockNumber-5);
            console.log(sortedVolume)
            
            //get contracts that currently exist in Contracts table from last sql query.
            const existingContracts = await api.post('/api/contractDetails?matching=true', sortedVolume.map(b=>b.contract))
            let existingContractsData = []
            if (existingContracts.data.data.length) existingContractsData = existingContracts.data.data;
            console.log('matching', existingContracts.data.data.length)

            //for contracts that don't exist, get their age and add them
            const newContracts = sortedVolume.filter(symbol=>!existingContractsData.map(d=>d.contract).includes(symbol.contract));
            console.log('newContracts length', newContracts.length)
            const postObjects = await Promise.all(newContracts.map(async sym=>{
                const liqAddBlock = await this.getLiqAddBlock(sym.contract)
                const liqLockBlock = 0, renounceBlock = 0;
                // const liqLockBlock = await this.getLiqLockBlock(sym.contract);
                // let renounceBlock = await this.getRenounceBlock(sym.contract);
                return {
                    symbol: sym.symbol,
                    contract: sym.contract,
                    liqAddBlock,
                    liqLockBlock: liqLockBlock || 0,
                    renounceBlock: renounceBlock || 0
                }
            }));


            console.log('got liq add blocks')
            await this.postContracts(postObjects);

            //STEP 2: add to time contract table.


            //existingContracts and newContracts with postObjects
            const allContracts = [...existingContractsData, ...postObjects].flat();
            let contractObjects = []
            for (let i in allContracts) {
                const getExistingVolume = sortedVolume.filter(s=>s.contract == allContracts[i].contract)[0];
                if (getExistingVolume) {
                    let contractObject = {
                        contract: getExistingVolume.contract,
                        symbol: getExistingVolume.symbol,
                        dateTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
                        blockNumber: this.latestBlockNumber,
                        marketCap: getExistingVolume.marketCap,
                        price: getExistingVolume.price,
                        volume1m: getExistingVolume.volume,
                        volume5m: 0,
                        volume15m: 0,
                        volume1h: 0,
                        volume1d: 0,
                        buyRatio1m: (getExistingVolume.sumBuys + getExistingVolume.sumSells) / (getExistingVolume.sumBuys + getExistingVolume.sumSells),
                        buyRatio15m: 0,
                        buyRatio1d: 0,
                        ageInMinutes: 0

                    }
                    contractObjects = [...contractObjects, contractObject]
                }
            }
            contractObjects = contractObjects.flat();

            try {
                await api.post(`api/contracts`, contractObjects)
            } catch(e) {
                console.log(e.response.data)
            }




            //PUT









            // //ALERTS FOR 5M
            // let allObjects = [...putObjects, postObjects].flat();
            // for (let i in allObjects) {
            //     let timeSinceAdd = (Date.now()/1000 - allObjects[i].liqAddBlock)/60
            //     if (allObjects[i].volume5m > 10000 && timeSinceAdd < 30) {
            //         this.volumeBot.telegram.sendMessage(this.chatId, `volume alert on ${allObjects[i].symbol}, contract ${allObjects[i].contract}, volume5m ${allObjects[i].volume5m}`)
            //     }
            // }

            // // 5. Telegram bot message: if volume is greater than 10k in last 5 minutes and age is less than 30 minutes, send message.



            //
        } catch(e) {
            console.log(e)
        }

    }


    async run5mJob() {
        
        try {




            // let allObjects = [...putObjects, postObjects].flat();
            // for (let i in allObjects) {
            //     let timeSinceAdd = (Date.now()/1000 - allObjects[i].liqAddBlock)/60
            //     if (allObjects[i].volume5m > 10000 && timeSinceAdd < 30) {
            //         this.volumeBot.telegram.sendMessage(this.chatId, `volume alert on ${allObjects[i].symbol}, contract ${allObjects[i].contract}, volume5m ${allObjects[i].volume5m}`)
            //     }
            // }

            // // 5. Telegram bot message: if volume is greater than 10k in last 5 minutes and age is less than 30 minutes, send message.



            //
        } catch(e) {
            console.log(e)
        }

    }
    
    async run15mJob() {
        try {
            // //read from blockevents table last 5m of entries (last 25 blocks.)
            // const sortedVolume = await this.sortedSpecifyBlockNumber(this.latestBlockNumber-75);
            
            // //get contracts that currently exist in Contracts table from last sql query.
            // const existingContracts = await api.post('/api/contracts?matching=true', sortedVolume.map(b=>b.contract))
            // let existingContractsData = []
            // if (existingContracts.data.data.length) existingContractsData = existingContracts.data.data;
            // console.log('matching', existingContracts.data.data.length)

            // //for contracts that don't exist, get their age and add them
            // const newContracts = sortedVolume.filter(symbol=>!existingContractsData.map(d=>d.contract).includes(symbol.contract));
            // console.log('newContracts length', newContracts.length)
            // const postObjects = await Promise.all(newContracts.map(async sym=>{
            //     const liqAddBlock = await this.getLiqAddBlock(sym.contract)
            //     await this.getLiqLockBlock(sym);
            //     let renounceBlock = await this.getRenounceBlock(sym);
            //     return {
            //         symbol: sym.symbol,
            //         contract: sym.contract,
            //         liqAddBlock,
            //         volume5m: 0,
            //         volume15m: sym.volume,
            //         volume1h: 0,
            //         volume1d: 0,
            //         liqlockBlock: 0,
            //         renounceBlock
            //     }
            // }));


            // console.log('got liq add blocks')
            // await this.postContracts(postObjects);

            
            // // 4. for each contract that does exist, make a PUT with the 5m volume.
            // //take sorted volume and sort by "existingContracts"
            // let putObjects = [];
            // if (existingContractsData.length) {

            //     putObjects = existingContractsData.map(c=>{
            //         const { volume: volume15m } = sortedVolume.filter(b=>b.contract == c.contract)[0];
            //         return {
            //             volume15m,
            //             ...c
            //         }

            //     })
            //     await this.putContracts(putObjects);
            // }
            
            // let allObjects = [...putObjects, postObjects].flat();
            // for (let i in allObjects) {
            //     let timeSinceAdd = (Date.now()/1000 - allObjects[i].liqAddBlock)/60
            //     if (allObjects[i].volume15m > 10000 && timeSinceAdd < 30) {
            //         this.volumeBot.telegram.sendMessage(this.chatId, `volume alert on ${allObjects[i].symbol}, contract ${allObjects[i].contract}, volume5m ${allObjects[i].volume5m}`)
            //     }
            // }

            // // 5. Telegram bot message: if volume is greater than 10k in last 5 minutes and age is less than 30 minutes, send message.



            //
        } catch(e) {
            console.log(e)
        }
    }

    async run1DJob() {
        try {
            // //read from blockevents table last 5m of entries (last 25 blocks.)
            // const sortedVolume = await this.sortedSpecifyBlockNumber(this.latestBlockNumber-7200);
            
            // //get contracts that currently exist in Contracts table from last sql query.
            // const existingContracts = await api.post('/api/contracts?matching=true', sortedVolume.map(b=>b.contract))
            // let existingContractsData = []
            // if (existingContracts.data.data.length) existingContractsData = existingContracts.data.data;
            // console.log('matching', existingContracts.data.data.length)

            // //for contracts that don't exist, get their age and add them
            // const newContracts = sortedVolume.filter(symbol=>!existingContractsData.map(d=>d.contract).includes(symbol.contract));
            // console.log('newContracts length', newContracts.length)
            // const postObjects = await Promise.all(newContracts.map(async sym=>{
            //     const liqAddBlock = await this.getLiqAddBlock(sym.contract)
            //     await this.getLiqLockBlock(sym);
            //     let renounceBlock = await this.getRenounceBlock(sym);
            //     return {
            //         symbol: sym.symbol,
            //         contract: sym.contract,
            //         liqAddBlock,
            //         volume5m: 0,
            //         volume15m: sym.volume,
            //         volume1h: 0,
            //         volume1d: 0,
            //         liqlockBlock: 0,
            //         renounceBlock
            //     }
            // }));


            // console.log('got liq add blocks')
            // await this.postContracts(postObjects);

            
            // // 4. for each contract that does exist, make a PUT with the 5m volume.
            // //take sorted volume and sort by "existingContracts"
            // let putObjects = [];
            // if (existingContractsData.length) {

            //     putObjects = existingContractsData.map(c=>{
            //         const { volume: volume15m } = sortedVolume.filter(b=>b.contract == c.contract)[0];
            //         return {
            //             volume15m,
            //             ...c
            //         }

            //     })
            //     await this.putContracts(putObjects);
            // }
            
            // let allObjects = [...putObjects, postObjects].flat();
            // for (let i in allObjects) {
            //     let timeSinceAdd = (Date.now()/1000 - allObjects[i].liqAddBlock)/60
            //     if (allObjects[i].volume15m > 10000 && timeSinceAdd < 30) {
            //         this.volumeBot.telegram.sendMessage(this.chatId, `volume alert on ${allObjects[i].symbol}, contract ${allObjects[i].contract}, volume5m ${allObjects[i].volume5m}`)
            //     }
            // }

            // // 5. Telegram bot message: if volume is greater than 10k in last 5 minutes and age is less than 30 minutes, send message.



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
                    const response = await api.post('/api/contractDetails', contractsArray[i])
                }
                catch(e) {
                    console.log(e.response)
                    return;
                }
            }
            if (contractsArray.length) console.log(`${contractsArray.length} new contracts added to table`)
        
    }
    // async putContracts(array) {
    //     for (let i in array) {
    //         try {
    //             const response = await api.put(`/api/contracts`, array[i])
    //         } catch(e) {
    //             console.log('error putting', e.response?.status, e.response?.data)
    //         }
    //     }
    //     if (array.length) console.log(`${array.length} contracts 5m Volume updated.`)
    // }

    setUpVolumeBot() {

        this.volumeBot.command('run5m', async ()=>{
            this.volumeBot.telegram.sendMessage(this.chatId, 'running 5m Job')
            this.run5mJob();
        })

        this.volumeBot.command('run1m', async ()=>{
            this.volumeBot.telegram.sendMessage(this.chatId, 'running 1m Job')
            this.run1mJob();
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
        api.get('/api/swaps?')
    }

    // async getBasicSortedVolumePrintout(time) {
    //     let blocks = this.getBlocksfromTime(time);
    //     console.log(blocks)
    //     if (blocks == 0) return 'error';

    //     const response = await api.get(`api/swaps/from/${blocks}?sortBySymbol=1`);
    //     const data = response.data.data;

    //     const _string = data.reduce((i, j)=> {
    //         return `symbol: ${i.symbol}, sum(usdVolume): ${i.volume}, contract: ${i.contract}
    //         ----------------------------------------------------------------------------------
    //         symbol: ${j.symbol}, sum(usdVolume): ${j.volume}, contract: ${j.contract}
    //         ----------------------------------------------------------------------------------`
    //     })
    //     console.log(_string, 'asdfkjl')
    //     return data;
    // }

    async sortedSpecifyBlockNumber(blockNumber) {
        const response = await api.get(`/api/swaps/${blockNumber}?sortBySymbol=1`)
        return response.data.data;
    }

    async createContracts() {
        return;
    }

    // async getFromBlock(block){
    //     const response = await api.get(`/api/swaps/from/${block}`);
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