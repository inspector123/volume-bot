
import api from "./api/utils/axios.js"
import {Telegraf} from "telegraf"
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
dotenv.config();

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
    contractsToIgnore = ["0xd5De579f8324E3625bDC5E8C6F3dB248614a41C5", "0xC89d9aa9D9E54bb196319c6195AEA1038d2bc936"]; //shibone
    pairs = []
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

    constructor(volumeBotKey, chatId, archiveNodeUrl) {
        this.volumeBot = new Telegraf(volumeBotKey);
        this.chatId = chatId;
        this.archiveProvider = new ethers.providers.JsonRpcProvider(archiveNodeUrl);
        
    }
    async start() {
        //setInterval(()=>run1mJob(),600000);

        this.runVolumeJob(1, this.volume1m);
        this.runContractsJob(5);
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
                let marketCaps = [{mc: 100000, topicId: this.to100k, volumeMin: 0,ignoredAlerts: []},{mc: 1000000, topicId: this.to1m, volumeMin: 0, ignoredAlerts:[]},{mc: 10000000, topicId: this.to10m, volumeMin: this.volume10MMinThreshold , ignoredAlerts:[]},{mc: 1000000000, topicId: this.to1b, volumeMin: this.volume1BMinThreshold , ignoredAlerts:[]}];
                for (let i in marketCaps) {
                    const marketCapAlerts = alerts.filter(a=> {
                        if (i > 0) {
                            return a.mc > marketCaps[i-1].mc && a.mc < marketCaps[i].mc
                        } else return a.mc < marketCaps[i].mc;
                    })
                    for (let coin of marketCapAlerts) {
                        let { sm, mc, totalBuys, priceRatio, ageInMinutes: age, buyRatio, contract, symbol, pairAddress } = coin;
                        if (sm < marketCaps[i].volumeMin || this.contractsToIgnore.includes(contract.toLowerCase()) || this.contractsToIgnore.includes(contract) || marketCaps[i].ignoredAlerts.includes(contract)) continue;
                        else {
                            const { table, volume, buyRatio: _buyRatio } = this.getTable(blocks);
                            const getLimitQuery = await this.getLimitQuery(table, contract, 0, 10);
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
                            ${averageBuys != 0 ? `Average # buys for last 10 periods: ${averageBuys}`: ''}
                            ${averageVolume != 0 ? `Average volume for last 10 periods: ${averageVolume}`: ''}
                            Chart: https://dextools.io/app/ether/pair-explorer/${pairAddress}
                            `
                           // marketCaps[i].ignoredAlerts=[...marketCaps[i].ignoredAlerts, contract].flat()
                            messageText = this.fixText(messageText)
                            this.volumeBot.telegram.sendMessage(this.chatId, messageText, {parse_mode: 'MarkdownV2', reply_to_message_id: marketCaps[i].topicId}).catch(e=>console.log(e));
                        }
                    }


                    for (let coin of marketCapAlerts) {
                        let { sm, mc, totalBuys, priceRatio, ageInMinutes: age, buyRatio, contract, symbol, pairAddress } = coin;
                        if (this.contractsToIgnore.includes(contract.toLowerCase()) || this.contractsToIgnore.includes(contract)) continue;
                        else {
                            if (age <= this.ageThreshold && totalBuys >= this.buyThreshold) {
                                let messageText = `$${symbol}: Over ${this.buyThreshold} buys spotted on new coin!
                                Volume: ${sm}
                                MC: ${mc}
                            Total buys: ${totalBuys}
                            Buy/sell ratio: ${buyRatio} ( 0 = all sells, 1 = all buys)
                            Contract age in minutes: ${age} 
                            Contract: \`\`\`${contract}\`\`\`
                            Chart: https://dextools.io/app/ether/pair-explorer/${pairAddress}
                            `
                            messageText = this.fixText(messageText)
                            this.volumeBot.telegram.sendMessage(this.chatId, messageText, {parse_mode: 'MarkdownV2', reply_to_message_id: process.env.TOPIC_ID_ETH_LAUNCH_ALERTS}).catch(e=>console.log(e));
                            }
                        }
                    }


                    
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

                        // if (alertDataSingle[i][volume] > 5500 || alertDataSingle[i].totalBuys >= 10 && alertDataSingle[i].marketCap < 1000000 && alertDataSingle[i].ageInMinutes>100 && alertDataSingle[i].buyRatio5m >0.6) {
                        //     //look back at contracts5m table for the last entries for this coin

                        //     const getLimitQuery = await this.getLimitQuery(table, alertDataSingle[i].contract, alertDataSingle[i].blockNumber, 20);
                        //     console.log(alertDataSingle[i], getLimitQuery[0])
                        //     if (getLimitQuery.length > 1){
                        //         const first = getLimitQuery[0];
                        //         const rest = getLimitQuery.slice(1,)
                        //         const restVolumeAvg = this.average(rest.map(r=>r[volume]))
                        //         const restTotalBuysAvg = this.average(rest.map(r=>r.totalBuys))
                        //         console.log(restVolumeAvg, restTotalBuysAvg)
                        //         if (first[volume] > 5*restVolumeAvg && first.totalBuys > 5*restTotalBuysAvg) {
                        //             //possible reversal
                        //             let  messageText = `possible 5m reversal on ${first.symbol}

                        //             MC: ${first.marketCap}

                        //             Buy Ratio :${first.buyRatio5m}
                        //             Latest Volume: ${first[volume]}
                        //             Average volume last 20 intervals: ${restVolumeAvg}
                        //             Total Buys last 5m : ${first.totalBuys}
                        //             Average total buys last 20 intervals: ${restTotalBuysAvg}
                                    
                                    
                        //             chart: https://dextools.io/app/ether/pair-explorer/${pairAddress}

                        //             `
                        //             messageText=this.fixText(messageText);
                        //             this.volumeBot.telegram.sendMessage(this.chatId, messageText, {parse_mode: 'MarkdownV2', reply_to_message_id: process.env.TOPIC_ID_ETH_NEW_VOLUME_ALERTS}).catch(e=>console.log(e));
                        //         }
                        //     }
                        // }
                    }
                    if (table == 'Contracts15m') {

                        //special 15m alerts go here


                        //reversal alerts
                        if (alertDataSingle[i][volume] > 6000 || alertDataSingle[i].totalBuys >= 10 && alertDataSingle[i].marketCap < 1000000 && alertDataSingle[i].ageInMinutes>1000) {
                            //look back at contracts5m table for the last entries for this coin

                            const getLimitQuery = await this.getLimitQuery(table, alertDataSingle[i].contract, alertDataSingle[i].blockNumber, 20);
                            if (getLimitQuery.length > 1) {
                                const first = getLimitQuery[0];
                                const rest = getLimitQuery.slice(1,)
                                const restVolumeAvg = this.average(rest.map(r=>r[volume]))
                                const restTotalBuysAvg = this.average(rest.map(r=>r.totalBuys))
                                if (first[volume] > 8*restVolumeAvg && first.totalBuys > 8*restTotalBuysAvg && first.totalBuys > 10) {
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
                        if (alertDataSingle[i].marketCap > 50000 && alertDataSingle[i].volume1h > 20000 && alertDataSingle[i].totalBuys > 100 && alertDataSingle[i].ageInMinutes < 121) {
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
                        if (alertDataSingle[i][volume] >= 17000 && alertDataSingle[i].totalBuys > 30 && alertDataSingle[i][buyRatio] > 0.75 && alertDataSingle[i].ageInMinutes>1000) {
                            let limit = 10;
                            const getLimitQuery = await this.getLimitQuery(table, alertDataSingle[i].contract, alertDataSingle[i].blockNumber, limit);

                            const first = getLimitQuery[0];
                            if (getLimitQuery.length > 1) {
                                const rest = getLimitQuery.slice(1,)
                                const restVolumeAvg = this.average(rest.map(r=>r[volume]))
                                const restTotalBuysAvg = this.average(rest.map(r=>r.totalBuys))
                                if (first[volume] > 8*restVolumeAvg && first.totalBuys > 8*restTotalBuysAvg && first.totalBuys > 30) {
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
            this.volumeBot.telegram.sendMessage(this.chatId, messageText, {parse_mode: 'MarkdownV2', reply_to_message_id: process.env.TOPIC_ID_ETH_NEW_VOLUME_ALERTS}).catch(e=>console.log(e))
        }
    }


    

    async runEpiJob() {
        //run 1m but then check to see if in...

        
    }

    getTable(blocks){
        switch(blocks) {
            case 5: 
                return {table: 'Contracts1m', volume: 'volume1m', buyRatio: 'buyRatio1m'};
            case 25:
                return {table: 'Contracts5m', volume: 'volume5m', buyRatio: 'buyRatio5m'};
            case 75:
                return {table: 'Contracts15m', volume: 'volume15m', buyRatio: 'buyRatio15m'};        
            case 300:
                return {table: 'Contracts1h', volume: 'volume1h', buyRatio: 'buyRatio1h'};
            case 1200:
                return {table: 'Contracts4h', volume: 'volume4h', buyRatio: 'buyRatio4h'};
            case 7200:
                return {table: 'Contracts1d', volume: 'volume1d', buyRatio: 'buyRatio1d'};
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
        return text.replace(/\s{3,}([A-Z])/gm, '\n$1').replace(/\./g, "\\.").replace(/\!/g,"\\!").replace(/-/g, "\\-").replace(/(\(|\))/g,"\\$1").replace(/=/g, "\\=").replace(/>/g,"\\>").replace(/</g,"\\<");
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
