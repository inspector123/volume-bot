
import api from "./api/utils/axios.js"
import {Telegraf} from "telegraf"

export class DatabaseWatcher {

    volumeBot;
    to100k = 2;
    to1m = 4;
    to10m = 6;
    to1b  = 8;
    volume1m = 500000;
    volume5m = 500000;
    volume15m = 700000;
    volume30m = 2500000;
    volume60m = 10000000;
    volume240m = 25000000;
    volume10MMinThreshold = 40000;
    volume1BMinThreshold = 100000;
    contractsToIgnore = [];
    PercentChangeThreshold = {
        m15: 100,
        m60: 100
    }
    ageThreshold = 16;

    constructor(volumeBotKey, chatId) {
        this.volumeBot = new Telegraf(volumeBotKey);
        this.chatId = chatId;
        
    }
    async start() {
        //setInterval(()=>run1mJob(),600000);
        this.setUpCommands();

        this.runVolumeChangeJobHandler();




        //this.runLookbackJob(15);
        // this.runVolumeJob(1,10000);
        // setInterval(()=>this.runVolumeJob(1, this.volume1m),1*60*1000);

        // setInterval(()=>this.runVolumeJob(5, this.volume5m),5*60*1000);

        // //setInterval(()=>this.runVolumeJob(5, this.volume5m),5*60*1000);

        // setInterval(()=>this.runVolumeJob(15, this.volume15m),15*60*1000);

        // //setInterval(()=>this.runLookBackJob(15, this.volume15m),15*60*1000);

        // //setInterval(()=>this.runVolumeJob(60, this.volume60m),60*60*1000);

        
        // setInterval(()=>this.runVolumeJob(60, this.volume60m),60*60*1000);

        // setInterval(()=>this.runVolumeJob(240, this.volume240m),240*60*1000);


        //to start, 5m will be only if there are a huge amount of buys, 5m only if less than hour old, 1m only for totalbuys and less than hour old

        //15m will be checking from the last 15m
        
        //60m

        //5m alert only if what??

        //5m volume alert will fire too much.
    }

    async getAlert(blocks, volume) {
        try {
            const response = await api.get(`/api/alerts?volume=${volume}&blocks=${blocks}`);
            return response.data.data;
        } catch(e) {
            console.log(e.response.data, 'error')
        }
    }

    async getLookBackAlert(blocks, table) {
        try {
            const response = await api.get(`/api/contracts?table=${table}&blocks=${blocks}`)
            return response.data.data;
        } catch(e) {
            console.log(e.response.data, 'error')
        }
    }

    async runVolumeJob(time, volume) {
        try { 
            const blocks = time*5;
            const alerts = await this.getAlert(blocks, volume);
            console.log(time, volume, alerts.length)
            if (alerts.length) {
                let marketCaps = [{mc: 100000, topicId: this.to100k, volumeMin: 0 },{mc: 1000000, topicId: this.to1m, volumeMin: 0 },{mc: 10000000, topicId: this.to10m, volumeMin: this.volume10MMinThreshold },{mc: 1000000000, topicId: this.to1b, volumeMin: this.volume1BMinThreshold }];
                for (let i in marketCaps) {
                    const marketCapAlerts = alerts.filter(a=> {
                        if (i > 0) {
                            return a.mc > marketCaps[i-1].mc && a.mc < marketCaps[i].mc
                        } else return a.mc < marketCaps[i].mc;
                    })
                    for (let coin of marketCapAlerts) {
                        let { sm, mc, totalBuys, priceRatio, ageInMinutes: age, buyRatio, contract, symbol, pairAddress } = coin;
                        if (sm < marketCaps[i].volumeMin || this.contractsToIgnore.includes(contract.toLowerCase()) || this.contractsToIgnore.includes(contract)) continue;
                        else {
                            let messageText = `$${symbol}: ${time}m: $${sm}. MC:${mc}
                            Total buys: ${totalBuys}
                            Buy/sell ratio: ${buyRatio} ( 0 = all sells, 1 = all buys)
                            Contract age in minutes: ${age} (${age/1440} days)
                            Contract: \`\`\`${contract}\`\`\`
                            Chart: https://dextools.io/app/ether/pair-explorer/${pairAddress}
                            `
                            messageText = this.fixText(messageText)
                            this.volumeBot.telegram.sendMessage(this.chatId, messageText, {parse_mode: 'MarkdownV2', reply_to_message_id: marketCaps[i].topicId});
                        }
                    }
                    for (let coin of marketCapAlerts) {
                        let { sm, mc, totalBuys, priceRatio, ageInMinutes: age, buyRatio, contract, symbol, pairAddress } = coin;
                        if (this.contractsToIgnore.includes(contract.toLowerCase()) || this.contractsToIgnore.includes(contract)) continue;
                        else {
                            if (age <= this.ageThreshold && totalBuys >= 100) {
                                let messageText = `$${symbol}: Over 100 buys spotted on new coin!
                                MC: ${mc}
                            Total buys: ${totalBuys}
                            Buy/sell ratio: ${buyRatio} ( 0 = all sells, 1 = all buys)
                            Contract age in minutes: ${age} 
                            Contract: \`\`\`${contract}\`\`\`
                            Chart: https://dextools.io/app/ether/pair-explorer/${pairAddress}
                            `
                            messageText = this.fixText(messageText)
                            this.volumeBot.telegram.sendMessage(this.chatId, messageText, {parse_mode: 'MarkdownV2', reply_to_message_id: marketCaps[i].topicId});
                            }
                        }
                    }
                    
                }
            }
        } catch(e) {
            console.log(e);
        }

    }


    async runVolumeChangeJobHandler() {
        //ideas: 5 minutes vs last 60 minutes. 15 minutes vs last 60 minutes. 15 minutes vs last 4 hours. 5 minutes vs last 4 hours.
        //15 minutes vs previous 15 minutes.

        //what do you do if it's brand new?

        //5 minutes vs previous 5 minutes.


        const lastFiveMinutesCompareHour = await this.runCompareTimeFrameVolumeJob(5,60, 0);

    }

    async runCompareTimeFrameVolumeJob (time1, time2, startBlocks=0) {
       
        try {
            /*parameters for query: 
                startBlocks: shifts the end block by X blocks (shifts the end of the block range, for backtesting.) 
                lookBackBlocks: shifts the window by X blocks (say we want to get the last 60 minutes before the last 5 minutes)
                blocks: distance of time we want to query over ( say 25 blocks = 5 minutes)
            */
           




            const blocks1 = time1*5;
            const lookBackBlocks1 = 0;
            
            const { data: { data : time1Data }} = await api.get(`/api/alerts/percent/any?startBlocks=${startBlocks}&lookBackBlocks=${lookBackBlocks1}&blocks=${blocks1}`);


            const blocks2 = time2*5;
            const lookBackBlocks2 = blocks1;
            const { data: { data : time2Data }} = await api.get(`/api/alerts/percent/any?startBlocks=${startBlocks}&lookBackBlocks=${lookBackBlocks2}&blocks=${blocks2}`);

            for (let data of time1Data) {
                const correspondingTime2Data = time2Data.filter(d=>data.contract == d.contract)[0];
                if (correspondingTime2Data) {
                    if (parseInt(data.totalBuys) > parseInt(correspondingTime2Data.totalBuys)) {
                        console.log(`totalBuys greater! data_blockRange=${data.minBlock},${data.maxBlock}; time2Data_blockRange=${correspondingTime2Data.minBlock},${correspondingTime2Data.maxBlock}
                        data_totalBuys = ${data.totalBuys}
                        time2Data_totalBuys = ${correspondingTime2Data.totalBuys}`)
                    }
                    if (parseInt(data.sm) > parseInt(correspondingTime2Data.sm)) {
                        console.log(`volume greater! data_blockRange=${data.minBlock},${data.maxBlock}; time2Data_blockRange=${correspondingTime2Data.minBlock},${correspondingTime2Data.maxBlock}
                        data_volume = ${data.sm}
                        time2Data_volume = ${correspondingTime2Data.sm}`)
                    }
                    
                    

                }
            }
            
        } catch(e) {
            console.log(e)
        }
    }







    async runVolumeChangeJob_ContractsTable(time1, time2) {

        //get first set of minutes
        try { 
            //dataset 1: e.g. 5min
            const blocks1 = time1*5;
            const { table: table1 } = this.getTable(time1);
            const { data: { data : time1Data }} = await api.get(`/api/contracts?table=${table1}&blocks=${blocks1}`);

            //dataset 2 e.g. 60min
            const blocks2 = time2*5;
            const { table: table2 } = this.getTable(time2);

            const { data: { data : time2Data }} = await api.get(`/api/contracts?table${table2}&blocks=${blocks2}`)

            


        } catch(e) {
            console.log(e)
        }

        
        //for every contract in the first response, find the contract in the second response and compare the desired metric. 
        



        
    }


    async runLookbackJob_old(time) {
        //change topic=241
        const blocks = time*5;
        const { table, volume } = this.getTable(blocks);
        console.log(blocks,table)
        let items = await this.getLookBackAlert(blocks, table);
        //console.log(items)
        items = items.filter(i=>i[volume] > 500);

        //get all contracts so we can compare each individually
        let contracts = [...new Set(items.map(i=>i.contract))];
        //console.log(contracts)
        for (let i in contracts) {
            let contractItems = items.filter(item=>item.contract==contracts[i]);
            //console.log(contractItems);
            if (contractItems.length != 2) continue;
            else {
                let sorted = contractItems.sort((a,b)=>a.blockNumber-b.blockNumber);
                console.log(sorted)
                if (sorted[0][volume]/sorted[1][volume] > 2.0) {
                    const messageText = `volume % increase on ${sorted[0].symbol}`;
                    const textToSend = this.fixText(messageText);
                    //this.volumeBot.telegram.sendMessage(this.chatId, textToSend, {parse_mode: 'MarkdownV2', reply_to_message_id: 241})
                }
            }
        }

       //
        
    }



    async runEpiJob() {
        //run 1m but then check to see if in...

        
    }

    getTable(blocks){
        switch(blocks) {
            case 5: 
                return {table: 'Contracts1m', volume: 'volume1m'};
            case 25:
                return {table: 'Contracts5m', volume: 'volume5m'};
            case 75:
                return {table: 'Contracts15m', volume: 'volume15m'};        
            case 60:
                return {table: 'Contracts1h', volume: 'volume1h'};
            case 1440:
                return {table: 'Contracts1d', volume: 'volume1d'};
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
        return text.replace(/\s{3,}([A-Z])/gm, '\n$1').replace(/\./g, "\\.").replace(/\!/g,"\\!").replace(/-/g, "\\-").replace(/(\(|\))/g,"\\$1").replace(/=/g, "\\=");
    }



    // async run5mJob() {
    //     await this.getAlert(10000,25);
    // }

    // async run15mJob() {
    //     await this.getAlert(10000,25);
    // }



  async setUpCommands() {
    const commands = [ 'volume1m', 'volume5m', 'volume15m', 'volume60m', 'volume10MMinThreshold', 'volume1BMinThreshold', 'ageThreshold']
    this.volumeBot.command('help', (ctx)=>{
        try {
            this.volumeBot.telegram.sendMessage(ctx.chat.id, `
            LIST OF COMMANDS: 
            /volume1m {number} (current=${this.volume1m})
            /volume5m {number}  (current=${this.volume5m})
            /volume15m {number} (current=${this.volume15m})
            /volume60m {number} (current=${this.volume60m})
            /volume10MMinThreshold {number}  (current=${this.volume10MMinThreshold})
            /volume1BMinThreshold {number} (current=${this.volume1BMinThreshold})
            set threshold for volume alerts.
            /turnoff {contract}: ignore contract. current turned off: ${this.contractsToIgnore.length ? this.contractsToIgnore.length : `0`}
            /ageThreshold {number}: threshold for spotting buys at start (current=${this.ageThreshold})
            `)
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
            this.volumeBot.telegram.sendMessage(ctx.chat.id, `${ctx.update.message.reply_to_message.message_thread_id}`, {reply_to_message_id: ctx.update.message.reply_to_message.message_thread_id})
        } catch(e) {
            console.log(e);
            this.volumeBot.telegram.sendMessage(ctx.chat.id, `${e}`)
        }
    })

    this.volumeBot.command('testbreak', ()=>{
        // for (let i = 0; i<500; i++) {
        //     this.volumeBot.telegram.sendMessage("-706531507",'test')
        // }
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

    this.volumeBot.catch((err, ctx) => {
        if (err.code === 429) {
          console.log('Too Many Requests error');
          // handle the error here, e.g. wait for a certain amount of time before making the next request
        } else {
          console.log('Error occurred:', err);
        }
      });
}







}
