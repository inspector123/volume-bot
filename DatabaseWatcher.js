
import api from "./api/utils/axios.js"
import { Telegraf } from "telegraf"
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import epiwallets4interactions from './epi_wallets/wallets_orderbydesc_4.json' assert { type: "json"};

import epiwallets2interactions from './epi_wallets/wallets_orderbydesc_object_2.json' assert { type: "json"};
const chatId_Epi = -1001752055128
dotenv.config();
//TOPIC_ID_ETH_WALLETS

export class DatabaseWatcher {

    volumeBot;
    to100k = 2;
    to1m = 4;
    to10m = 6;
    to1b  = 8;
    //volume1m=1;
    volume1m = 7000;
    volume5m = 9000;
    volume15m = 25000;
    volume30m = 45000;
    volume60m = 100000;
    volume240m = 25000000;
    volume10MMinThreshold = 60000;
    volume1BMinThreshold = 1000000;
    newVolumeAlertsTopic = 3102;
    contractsToIgnore = ["0xd5De579f8324E3625bDC5E8C6F3dB248614a41C5", "0x41f7B8b9b897276b7AAE926a9016935280b44E97", "0xC89d9aa9D9E54bb196319c6195AEA1038d2bc936", "0xf1B99e3E573A1a9C5E6B2Ce818b617F0E664E86B"]; //shibone, ,osqth
    pairs = []
    wallets = [{address:"0xee7Ad10fBf6bAE8f53A7AF42c78659a49aE3aBdF", name:"Bird 1 ee7a"}, {address:"0xB60bFd02207823360263Ed5886c9f3c240A05045", name:"Bird 2 b60b"}, {address: "0xDf043d2D5aD5f618e74f793B976E30605DC7a1d4", name:"Bird Possible 3"}]
    archiveProvider;
    PercentChangeThreshold = {
        m15: 100,
        m60: 100
    }
    buyThreshold = 50;
    ageThreshold = 16;
    // ignoredAlerts = {
    //     to100k: {m1: [], m5: [], m15:[]},
    //     to1m: {m1: [], m5: [], m15:[]}
    // }

    marketCaps = [
        {mc: 100000, topicId: this.to100k, volumeMin: 0,ignoredAlerts: []}
        ,{mc: 1000000, topicId: this.to1m, volumeMin: 0, ignoredAlerts:[]}
        ,{mc: 10000000, topicId: this.to10m, volumeMin: this.volume10MMinThreshold , ignoredAlerts:[]}
        ,{mc: 1000000000, topicId: this.to1b, volumeMin: this.volume1BMinThreshold , ignoredAlerts:[]}
    ]

    constructor(volumeBotKey, chatId, archiveNodeUrl) {
        this.volumeBot = new Telegraf(volumeBotKey);
        this.chatId = chatId;
        this.archiveProvider = new ethers.providers.JsonRpcProvider(archiveNodeUrl);
        
    }
    async start() {
        //setInterval(()=>run1mJob(),600000);

        this.runVolumeJob(1, this.volume1m);

        this.node();

        
        this.setUpCommands();

        this.setIntervals();
        

    }


    async setIntervals() {
        setInterval(()=>this.runVolumeJob(1, this.volume1m),1*60*1000);
        setInterval(()=>this.runVolumeJob(5, this.volume5m),5*60*1000);
        setInterval(()=>this.runVolumeJob(15, this.volume15m),15*60*1000);
        setInterval(()=>this.runVolumeJob(60, this.volume60m),60*60*1000);

        setInterval(()=>this.runContractsJob(5),5*60*1000);
        setInterval(()=>this.runContractsJob(15),15*60*1000);
        setInterval(()=>this.runContractsJob(60),60*60*1000);
    }

    async node() {
        this.archiveProvider.on('block', async (blockNumber)=>{
            console.log('latest block: ', blockNumber)
            await this.runWalletJob(blockNumber-1);
            await this.runEpiJob(blockNumber-1);
        })
    }

    async startTest() {
        // try { 
        //     const response = await this.getLimitQuery("Contracts15m", "0xb33bfaB26984a3135D6c36E7E362a1B61cb17A64", 16744036, 20);
        //     console.log(response)
        // }
        // catch(e) {
        //     console.log(e)
        // }
            // this.setUpCommands();

        // this.runVolumeChangeJobHandler();

    }

    async runWalletJob(blockNumber) {
        try {
            const data = await this.getWalletSwaps(blockNumber);
            if (data.length) {
                for (let d of data) {
                    let walletObject = this.wallets.filter(w=>w.address==d.wallet)[0];
                    let messageText = `
                    ${walletObject.name} ${d.isBuy == 1 ? `bought` : `sold`} $${d.symbol}!
                    MC: ${d.marketCap}
                    Amount: $${d.usdVolume}
                    Contract: \`\`\`${d.contract}\`\`\`
                    TxHash: https://etherscan.io/tx/${d.txHash}
                    Link to wallet: https://etherscan.io/address/${d.wallet}
                    Chart: https://dextools.io/app/ether/pair-explorer/${d.pairAddress}
                    `
                    messageText = this.fixText(messageText);
                    this.volumeBot.telegram.sendMessage(this.chatId, messageText, {parse_mode: 'MarkdownV2', reply_to_message_id: process.env.TOPIC_ID_ETH_WALLETS}).catch(e=>console.log(e))
                }
            }
        } catch(e) {
            console.log(e)
        }
    }

    async runEpiJob(blockNumber) {
        try {
            const blockSwaps = await this.getAllSwaps(blockNumber);
            let epiSwaps2Interactions = blockSwaps.filter(s=>epiwallets2interactions.map(e=>e.wallet).includes(s.wallet.toLowerCase()) || epiwallets2interactions.map(e=>e.wallet).includes(s.wallet));
            if (epiSwaps2Interactions.length) {
                for (let d of epiSwaps) {
                    let messageText = `
                    An epi wallet ${d.isBuy == 1 ? `bought` : `sold`} $${d.symbol}!
                    MC: ${d.marketCap}
                    Amount: $${d.usdVolume}
                    Contract: \`\`\`${d.contract}\`\`\`
                    TxHash: https://etherscan.io/tx/${d.txHash}
                    Link to wallet: https://etherscan.io/address/${d.wallet}
                    Chart: https://dextools.io/app/ether/pair-explorer/${d.pairAddress}
                    `
                    messageText = this.fixText(messageText);
                    this.volumeBot.telegram.sendMessage(chatId_Epi, messageText, {parse_mode: 'MarkdownV2', reply_to_message_id: 5}).catch(e=>console.log(e))
                }
            }
            let epiSwaps4Interactions = blockSwaps.filter(s=>epiwallets4interactions.map(e=>e.wallet).includes(s.wallet.toLowerCase()) || epiwallets4interactions.map(e=>e.wallet).includes(s.wallet));
            if (epiSwaps4Interactions.length) {
                for (let d of epiSwaps) {
                    let messageText = `
                    An epi wallet ${d.isBuy == 1 ? `bought` : `sold`} $${d.symbol}!
                    MC: ${d.marketCap}
                    Amount: $${d.usdVolume}
                    Contract: \`\`\`${d.contract}\`\`\`
                    TxHash: https://etherscan.io/tx/lo${d.txHash}
                    Link to wallet: https://etherscan.io/address/${d.wallet}
                    Chart: https://dextools.io/app/ether/pair-explorer/${d.pairAddress}
                    `
                    messageText = this.fixText(messageText);
                    this.volumeBot.telegram.sendMessage(chatId_Epi, messageText, {parse_mode: 'MarkdownV2', reply_to_message_id: 2}).catch(e=>console.log(e))
                }
            }
        } catch(e) {
            console.log(e)
        }
    }

    async getAllSwaps(blockNumber) {
        try {
            const response = await api.get(`/api/swaps/${blockNumber}`);
            return response.data.data;
        } catch(e) {
            console.log(e)
        }
    }


    async getWalletSwaps(blockNumber) {
        try {
            const response = await api.post(`/api/swaps/${blockNumber}`, this.wallets.map(w=>w.address))
            return response.data.data
        } catch(e) {
            console.log(e)
        }
    }

    async getAlert(blocks, volume) {
        try {
            const response = await api.get(`/api/alerts?volume=${volume}&blocks=${blocks}`);
            return response.data.data;
        } catch(e) {
            console.log(e.response.data, 'error')
        }
    }

    async getLookBackAlert(table,blocks) {
        try {
            const response = await api.get(`/api/contracts?table=${table}&blocks=${blocks}&marketCap=10000000`)
            return response.data.data;
        } catch(e) {
            console.log(e.response.data, 'error lookback')
        }
    }

    async getLastFromContractsTable(table) {
        try {
            const response = await api.get(`/api/contracts?table=${table}&marketCap=10000000`)
            return response.data.data;
        } catch(e) {
            console.log(e.response.data, 'error')
        }
    }

    async getLimitQuery(table,contract,blockNumber,limit) {
        try {
            const response = await api.get(`/api/contracts?table=${table}&contract=${contract}&blockNumber=${blockNumber}&limit=${limit}`)
            return response.data.data;
        } catch(e) {
            console.log(e.response.data, 'error getlimitquery')
        }
    }

    average (array) { 
        return array.reduce((a, b) => a + b) / array.length;
    }

    async runVolumeJob(time, volume) {
        try { 
            const blocks = time*5;
            const alerts = await this.getAlert(blocks, volume);
            console.log(time, volume, alerts.length,  new Date().toISOString())
            if (alerts.length) {
                let marketCaps = this.marketCaps;
                for (let i in marketCaps) {
                    const marketCapAlerts = alerts.filter(a=> {
                        if (i > 0) {
                            return a.mc > marketCaps[i-1].mc && a.mc < marketCaps[i].mc
                        } else return a.mc < marketCaps[i].mc;
                    })
                    for (let coin of marketCapAlerts) {
                        let { sm, mc, totalBuys, priceRatio, ageInMinutes: age, buyRatio, contract, symbol, pairAddress } = coin;
                        if (sm < marketCaps[i].volumeMin || this.contractsToIgnore.includes(contract.toLowerCase()) || this.contractsToIgnore.includes(contract) || this.marketCaps[i].ignoredAlerts.includes(contract)) continue;
                        else {
                            const { table, volume, buyRatio: _buyRatio, limit } = this.getTable(blocks);
                            const getLimitQuery = await this.getLimitQuery(table, contract, 1, limit);
                            console.log(getLimitQuery)
                            let averageVolume =0;
                            let averageBuys =0;
                            if (getLimitQuery.length > 1) {
                                const first = getLimitQuery[0];
                                const rest = getLimitQuery.slice(1,)
                                const restVolumeAvg = this.average(rest.map(r=>r[volume]))
                                const restTotalBuysAvg = this.average(rest.map(r=>r.totalBuys))
                                averageVolume = restVolumeAvg;
                                averageBuys = restTotalBuysAvg;
                                console.log(restVolumeAvg, restTotalBuysAvg)
                                // if (first[volume] > 5*restVolumeAvg && first.totalBuys > 5*restTotalBuysAvg) {
                                //     //possible reversal
                                //     const text = `possible 5m reversal on ${first.symbol}
                                //     average volume last 20*5m: ${restVolumeAvg}
                                //     average total buys last 20*5m: ${restTotalBuysAvg}
                                //     MC: ${first.marketCap}
                                //     Total Buys : ${first.totalBuys}
                                //     Buy Ratio :${first[buyRatio]}
                                //     chart: https://dextools.io/app/ether/pair-explorer/${pairAddress}

                                //     `
                                // }
                            }
                            let messageText = `$${symbol}: ${time}m: $${sm}. MC:${mc}
                            Total buys: ${totalBuys}
                            Buy/sell ratio: ${buyRatio} ( 0 = all sells, 1 = all buys)
                            Contract age in minutes: ${age} (${age/1440} days)
                            Contract: \`\`\`${contract}\`\`\`
                            ${averageBuys != 0 ? `Average # buys for last ${limit} periods: ${averageBuys}`: ''}
                            ${averageVolume != 0 ? `Average volume for last ${limit} periods: ${averageVolume}`: ''}
                            Chart: https://dextools.io/app/ether/pair-explorer/${pairAddress}
                            `
                            this.marketCaps[i].ignoredAlerts=[...this.marketCaps[i].ignoredAlerts, contract].flat()
                            messageText = this.fixText(messageText)
                            this.volumeBot.telegram.sendMessage(this.chatId, messageText, {parse_mode: 'MarkdownV2', reply_to_message_id: marketCaps[i].topicId}).catch(e=>console.log(e));
                        }
                    }


                    // for (let coin of marketCapAlerts) {
                    //     let { sm, mc, totalBuys, priceRatio, ageInMinutes: age, buyRatio, contract, symbol, pairAddress } = coin;
                    //     if (this.contractsToIgnore.includes(contract.toLowerCase()) || this.contractsToIgnore.includes(contract)) continue;
                    //     else {
                    //         if (age <= this.ageThreshold && totalBuys >= this.buyThreshold) {
                    //             let messageText = `$${symbol}: Over ${this.buyThreshold} buys spotted on new coin!
                    //             Volume: ${sm}
                    //             MC: ${mc}
                    //         Total buys: ${totalBuys}
                    //         Buy/sell ratio: ${buyRatio} ( 0 = all sells, 1 = all buys)
                    //         Contract age in minutes: ${age} 
                    //         Contract: \`\`\`${contract}\`\`\`
                    //         Chart: https://dextools.io/app/ether/pair-explorer/${pairAddress}
                    //         `
                    //         messageText = this.fixText(messageText)
                    //         this.volumeBot.telegram.sendMessage(this.chatId, messageText, {parse_mode: 'MarkdownV2', reply_to_message_id: process.env.TOPIC_ID_ETH_LAUNCH_ALERTS}).catch(e=>console.log(e));
                    //         }
                    //     }
                    // }


                    
                }
            }
        } catch(e) {
            console.log(e);
        }

    }

    async getPairs(){
        try {
            const pairsResponse = await api.get(`/api/pairs`)
            return pairsResponse.data.data;
        } catch(e) {
            console.log(e, 'getpairs')
        }
    }

    getPair(contract) {
        try {
            return this.pairs.filter(p=>p.token0==contract||p.token1==contract)[0].pairAddress;
        } catch(e) {
            console.log(e)
        }
    }

    resetIgnored() {
        for (let obj of this.marketCaps) {
            obj.ignoredAlerts = [];
        }
    }
    async runContractsJob(time) {
        try {
            const blocks = time*5;
            console.log(`running ${time}m contracts job`)
            const { table, volume, buyRatio } = this.getTable(blocks);
            let alertDataSingle = await this.getLookBackAlert(table, 0);
            alertDataSingle = alertDataSingle.filter(i=>!this.contractsToIgnore.includes(i.contract) || !this.contractsToIgnore.includes(i.contract.toLowerCase()));
            this.pairs = await this.getPairs();
            if (alertDataSingle.length) {
                for (let i in alertDataSingle) {
                    const pairAddress = this.getPair(alertDataSingle[i].contract);
                    if (table == 'Contracts5m') {
                        //5m alert 1: odoge
                        if (alertDataSingle[i].ageInMinutes < 11 && alertDataSingle[i].totalBuys > 20 && alertDataSingle[i].buyRatio5m == 1 && alertDataSingle[i].volume5m>4500) {
                            let messageText = `ALERT ON $${alertDataSingle[i].symbol}: ${time}m: $${alertDataSingle[i].volume5m}. highest MC:${alertDataSingle[i].marketCap}
                                    Age: ${alertDataSingle[i].ageInMinutes}
                                    Buys: ${alertDataSingle[i].totalBuys}
                                    Buy Ratio: ${alertDataSingle[i].buyRatio5m}
                                    Volume: ${alertDataSingle[i].volume5m}
                                    Contract: \`\`\`${alertDataSingle[i].contract}\`\`\`
                                    Chart: https://dextools.io/app/ether/pair-explorer/${pairAddress}

                                    This alert was designed from ODOGE launch.
                                    age<11,totalBuys>20,buyRatio==1,volume5m>6000 (changed to 4500 for more flex)
                                    `
                                    console.log(messageText)
                                    messageText = this.fixText(messageText)
                                    this.volumeBot.telegram.sendMessage(this.chatId, messageText, {parse_mode: 'MarkdownV2', reply_to_message_id: process.env.TOPIC_ID_ETH_NEW_VOLUME_ALERTS}).catch(e=>console.log(e))
                        }

                        //5m reversal
                        //console.log(alertDataSingle[i].buyRatio5m, parseInt(alertDataSingle[i].buyRatio5m)>0.75)
                        if (alertDataSingle[i][volume] > 3000 && alertDataSingle[i].totalBuys >= 10 && alertDataSingle[i].marketCap < 1000000 && alertDataSingle[i].ageInMinutes>100 && parseInt(alertDataSingle[i].buyRatio5m) > 0.75) {
                            //look back at contracts5m table for the last entries for this coin

                            const getLimitQuery = await this.getLimitQuery(table, alertDataSingle[i].contract, alertDataSingle[i].blockNumber, 20);

                            if (getLimitQuery.length > 1){
                                const first = getLimitQuery[0];
                                const rest = getLimitQuery.slice(1,)
                                const restVolumeAvg = this.average(rest.map(r=>r[volume]))
                                const restTotalBuysAvg = this.average(rest.map(r=>r.totalBuys))
                                console.log(restVolumeAvg, restTotalBuysAvg)
                                if (first[volume] > 5*restVolumeAvg && first.totalBuys > 5*restTotalBuysAvg && restTotalBuysAvg<1000) {
                                    //possible reversal
                                    let  messageText = `possible 5m reversal on ${first.symbol}

                                    MC: ${first.marketCap}

                                    Buy Ratio :${first.buyRatio5m}
                                    Latest Volume: ${first[volume]}
                                    Average volume last 20 intervals: ${restVolumeAvg}
                                    Total Buys last 5m : ${first.totalBuys}
                                    Average total buys last 20 intervals: ${restTotalBuysAvg}
                                    Contract: \`\`\`${first.contract}\`\`\`
                                    
                                    Chart: https://dextools.io/app/ether/pair-explorer/${pairAddress}

                                    `
                                    messageText=this.fixText(messageText);
                                    this.volumeBot.telegram.sendMessage(this.chatId, messageText, {parse_mode: 'MarkdownV2', reply_to_message_id: process.env.TOPIC_ID_ETH_NEW_VOLUME_ALERTS}).catch(e=>console.log(e));
                                }
                            }
                        }
                    }
                    if (table == 'Contracts15m') {

                        //special 15m alerts go here


                        //reversal alerts
                        if (alertDataSingle[i][volume] > 6000 && alertDataSingle[i].totalBuys >= 10 && alertDataSingle[i].marketCap < 1000000 && alertDataSingle[i].ageInMinutes>1000 && parseInt(alertDataSingle[i].buyRatio)>0.75) {
                            //look back at contracts5m table for the last entries for this coin

                            const getLimitQuery = await this.getLimitQuery(table, alertDataSingle[i].contract, alertDataSingle[i].blockNumber, 20);
                            if (getLimitQuery.length > 1) {
                                const first = getLimitQuery[0];
                                const rest = getLimitQuery.slice(1,)
                                const restVolumeAvg = this.average(rest.map(r=>r[volume]))
                                const restTotalBuysAvg = this.average(rest.map(r=>r.totalBuys))
                                if (first[volume] > 5*restVolumeAvg && first.totalBuys > 5*restTotalBuysAvg && first.totalBuys > 10) {
                                    //possible reversal
                                    let messageText = `possible 15m reversal on ${first.symbol}
                                   
                                    MC: ${first.marketCap}

                                    Buy Ratio :${first[buyRatio]}
                                    Latest Volume: ${first[volume]}
                                    Average volume last 20 intervals: ${restVolumeAvg}
                                    Total Buys last 15m : ${first.totalBuys}
                                    Average total buys last 20 intervals: ${restTotalBuysAvg}
                                    
                                    
                                    Chart: https://dextools.io/app/ether/pair-explorer/${pairAddress}

                                    `

                                    messageText = this.fixText(messageText)
                                    this.volumeBot.telegram.sendMessage(this.chatId, messageText, {parse_mode: 'MarkdownV2', reply_to_message_id: process.env.TOPIC_ID_ETH_NEW_VOLUME_ALERTS}).catch(e=>console.log(e))
                                }
                            }
                        }
                    }
                    if (table == 'Contracts1h') {
                        //special hourly alert 1
                        if (alertDataSingle[i].marketCap > 50000 && alertDataSingle[i].volume1h > 20000 && alertDataSingle[i].totalBuys > 100 && alertDataSingle[i].ageInMinutes < 121 && parseInt(alertDataSingle[i].buyRatio)>0.75) {
                            let messageText = `ALERT ON $${alertDataSingle[i].symbol}: ${time}m: $${alertDataSingle[i].volume1h}. MC:${alertDataSingle[i].marketCap}
                                    Age: ${alertDataSingle[i].ageInMinutes}
                                    Buys: ${alertDataSingle[i].totalBuys}
                                    Buy Ratio: ${alertDataSingle[i].buyRatio1h}
                                    Volume: ${alertDataSingle[i].volume1h}
                                    Contract: \`\`\`${alertDataSingle[i].contract}\`\`\`
                                    Chart: https://dextools.io/app/ether/pair-explorer/${pairAddress}
                                    
                                    This alert was designed from SIGIL launch.
                                    Mc>50000,volume1h>20000,totalBuys>100,age>121
                                    `
                                    console.log(messageText)
                                    messageText = this.fixText(messageText)
                                    this.volumeBot.telegram.sendMessage(this.chatId, messageText, {parse_mode: 'MarkdownV2', reply_to_message_id: process.env.TOPIC_ID_ETH_NEW_VOLUME_ALERTS}).catch(e=>console.log(e))
                        }

                        //reversal 1: shibtc, volume jumped from basically nothing to 17022 with buyRatio=0.8 & 32 buys
                        if (alertDataSingle[i][volume] >= 17000 && alertDataSingle[i].totalBuys > 30 && parseInt(alertDataSingle[i][buyRatio]) > 0.5 && alertDataSingle[i].ageInMinutes>1000) {
                            let limit = 10;
                            const getLimitQuery = await this.getLimitQuery(table, alertDataSingle[i].contract, alertDataSingle[i].blockNumber, limit);

                            const first = getLimitQuery[0];
                            if (getLimitQuery.length > 1) {
                                const rest = getLimitQuery.slice(1,)
                                const restVolumeAvg = this.average(rest.map(r=>r[volume]))
                                const restTotalBuysAvg = this.average(rest.map(r=>r.totalBuys))
                                if (first[volume] > 5*restVolumeAvg && first.totalBuys > 5*restTotalBuysAvg && first.totalBuys > 30) {
                                    //possible reversal
                                    let messageText = `possible 1h reversal on ${first.symbol}
                                   
                                    MC: ${first.marketCap}

                                    Buy Ratio :${first[buyRatio]}
                                    Latest Volume: ${first[volume]}
                                    Average volume last 20 intervals: ${restVolumeAvg}
                                    Total Buys last 1h : ${first.totalBuys}
                                    Average total buys last 20 intervals: ${restTotalBuysAvg}
                                    
                                    
                                    Chart: https://dextools.io/app/ether/pair-explorer/${pairAddress}

                                    `
                                    messageText = this.fixText(messageText)
                                    this.volumeBot.telegram.sendMessage(this.chatId, messageText, {parse_mode: 'MarkdownV2', reply_to_message_id: process.env.TOPIC_ID_ETH_NEW_VOLUME_ALERTS}).catch(e=>console.log(e))

                                }
                            }
                        }


                    }
                }
            }
        } catch(e) {
            console.log(e);
            let messageText = this.fixText(`error sending contracts message, ${e}`)
            //this.volumeBot.telegram.sendMessage(this.chatId, messageText, {parse_mode: 'MarkdownV2', reply_to_message_id: process.env.TOPIC_ID_ETH_NEW_VOLUME_ALERTS}).catch(e=>console.log(e))
        }
    }


    

    async runEpiJob() {
        //run 1m but then check to see if in...

        
    }

    getTable(blocks){
        switch(blocks) {
            case 5: 
                return {table: 'Contracts1m', volume: 'volume1m', buyRatio: 'buyRatio1m', limit:100};
            case 25:
                return {table: 'Contracts5m', volume: 'volume5m', buyRatio: 'buyRatio5m', limit:30};
            case 75:
                return {table: 'Contracts15m', volume: 'volume15m', buyRatio: 'buyRatio15m', limit:10};        
            case 300:
                return {table: 'Contracts1h', volume: 'volume1h', buyRatio: 'buyRatio1h', limit:5};
            case 1200:
                return {table: 'Contracts4h', volume: 'volume4h', buyRatio: 'buyRatio4h', limit: 1};
            case 7200:
                return {table: 'Contracts1d', volume: 'volume1d', buyRatio: 'buyRatio1d', limit: 1};
            default:
                return {table: '', volume: ''};
        }
    }

    



    async TrendSpotter() {
        return;
    }
    async runChangeInVolumeJob() {
       // const response = await api.get()
    }

    fixText(text) {
        //replace .,!,-,=,(,),> with \\+ $1,fix tabs.
        return text.replace(/\s{3,}([A-Z])/gm, '\n$1').replace(/\./g, "\\.").replace(/\!/g,"\\!").replace(/-/g, "\\-").replace(/(\(|\))/g,"\\$1").replace(/=/g, "\\=").replace(/>/g,"\\>").replace(/#/g,"\\#");
    }


  async setUpCommands() {
    const commands = [ 'volume1m', 'volume5m', 'volume15m', 'volume60m', 'volume10MMinThreshold', 'volume1BMinThreshold', 'ageThreshold']
    this.volumeBot.command('help', (ctx)=>{
        try {
            this.volumeBot.telegram.sendMessage(ctx.chat.id, `
            LIST OF COMMANDS: 
            /help: this one.
            /areyouonline : check if i am online, if not i won't respond.
            /volume1m {number} (current=${this.volume1m})
            /volume5m {number}  (current=${this.volume5m})
            /volume15m {number} (current=${this.volume15m})
            /volume60m {number} (current=${this.volume60m})
            /volume10MMinThreshold {number}  (current=${this.volume10MMinThreshold})
            /volume1BMinThreshold {number} (current=${this.volume1BMinThreshold})
            set threshold for volume alerts.
            /turnoff {contract}: ignore contract. current turned off: ${this.contractsToIgnore.length ? this.contractsToIgnore.length : `0`}
            /turnbackon {contract}: turn alerts back on for contract. (doesnt work lol)
            /ageThreshold {number}: threshold for spotting buys at start (current=${this.ageThreshold})
            /buyThreshold {number}: threshold for spotting buys at start (current=${this.buyThreshold})
            `).catch(e=>console.log(e))
        } catch(e) {
            console.log(e)
        }
    })
    this.volumeBot.command('turnoff', (ctx)=>{
        try {
            const contract = ctx.message.text.match(/\s(0x[0-9A-Za-z]{40})/)[1];
            console.log(contract)
            if (contract && !this.contractsToIgnore.includes(contract)) {
                this.contractsToIgnore = [...this.contractsToIgnore, contract]
                this.volumeBot.telegram.sendMessage(ctx.chat.id, `turned off alerts for ${contract}`).catch(e=>console.log(e))
            }
        } catch(e) {
            console.log(e);
        }
    })

    this.volumeBot.command('resetignored', (ctx)=>{
        try {
            this.volumeBot.telegram.sendMessage(ctx.chat.id, `resetting ignored`)
            this.resetIgnored();
        } catch(e) {
            console.log(e);
        }
    })



    this.volumeBot.command('gettopicid', (ctx)=>{
        try {
            this.volumeBot.telegram.sendMessage(ctx.chat.id, `${ctx.update.message.reply_to_message.message_thread_id}`, {reply_to_message_id: ctx.update.message.reply_to_message.message_thread_id}).catch(e=>console.log(e))
        } catch(e) {
            console.log(e);
            this.volumeBot.telegram.sendMessage(ctx.chat.id, `${e}`).catch(e=>console.log(e))
        }
    })
    this.volumeBot.command('turnbackon', (ctx)=>{
        try {
            const contract = ctx.message.text.match(/\s(0x[0-9A-Za-z]{40})/)[1];
            console.log(contract)
            if (!contract) throw new Error('no contract provided')
            if (!this.contractsToIgnore.includes(contract)) throw new Error('contract not in turned off list')
            if (contract && this.contractsToIgnore.includes(contract)) {
                this.contractsToIgnore = this.contractsToIgnore.filter(c=> c.toLowerCase() != contract || c != contract);
                this.volumeBot.telegram.sendMessage(ctx.chat.id, `turned alerts back on  for ${contract}`).catch(e=>console.log(e))
            }
        } catch(e) {
            this.volumeBot.telegram.sendMessage(ctx.chat.id, `error ${e}`).catch(e=>console.log(e))
            console.log(e);
        }
    })

    this.volumeBot.command('areyouonline', (ctx)=>{
        this.volumeBot.telegram.sendMessage(this.chatId, `i am online`, {parse_mode: 'MarkdownV2'})
    })

    commands.forEach(c=>{
        this.volumeBot.command(c, async (ctx)=> {
            const command = `${c} `;
            try {
                const number = ctx.message.text.match(/\s([0-9]+)/)[1];
                this[c] = number;
                //this[c] = number;
                this.volumeBot.telegram.sendMessage(ctx.chat.id, `changed ${c} to ${number}`)
            } catch(e) {
                console.log(e)
                this.volumeBot.telegram.sendMessage(ctx.chat.id, `error processing ${command} command, ${e}`)
            }
        })
    })
    this.volumeBot.launch();

}







}
