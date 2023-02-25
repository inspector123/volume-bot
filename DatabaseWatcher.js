
import api from "./api/utils/axios.js"
import {Telegraf} from "telegraf"
import wtf8 from 'wtf-8';

export class DatabaseWatcher {

    volumeBot;
    to100k = 2;
    to1m = 4;
    to10m = 6;
    to1b  = 8;
    volume1m = 5000;
    volume5m = 5000;
    volume15m = 7000;
    volume30m = 25000;
    volume60m = 100000;
    volume10MMinThreshold = 50000;
    volume1BMinThreshold = 100000;
    contractsToIgnore = [];

    constructor(volumeBotKey, chatId) {
        this.volumeBot = new Telegraf(volumeBotKey);
        this.chatId = chatId;
        this.volumeBot.catch(e=>console.log(e))
        
    }
    async start() {
        //setInterval(()=>run1mJob(),600000);
        this.setUpCommands();
        this.runJob(1,10000);
        setInterval(()=>this.runJob(1, this.volume1m),1*60*1000);
        setInterval(()=>this.runJob(5, this.volume5m),5*60*1000);
        setInterval(()=>this.runJob(15, this.volume15m),15*60*1000);
        setInterval(()=>this.runJob(60, this.volume60m),60*60*1000);
        
    }

    async getAlert(blocks, volume) {
        try {
            const response = await api.get(`/api/alerts?volume=${volume}&blocks=${blocks}`);
            return response.data.data;
        } catch(e) {
            console.log(e.response.data, 'error')
        }
    }

    async runJob(time, volume) {
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
                        const { sm, mc, totalBuys, priceRatio, ageInMinutes: age, buyRatio, contract, symbol, pairAddress } = coin;
                        if (sm < marketCaps[i].volumeMin || this.contractsToIgnore.includes(contract.toLowerCase())) return;
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
                    
                }
            }
        } catch(e) {
            console.log(e);
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
    const commands = [ 'volume1m', 'volume5m', 'volume15m', 'volume60m', 'volume10MMinThreshold', 'volume1BMinThreshold']
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
            /turnoff {contract}: ignore contract. current turned off: ${this.contractsToIgnore.length ? this.contractsToIgnore.reduce((i,j)=>`${i}, ${j}`) : "[ ]"}
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
                this.volumeBot.telegram.sendMessage(ctx.chat.id, `turned off alerts for ${contract}`)
            }
        } catch(e) {
            console.log(e);
        }
    })

    this.volumeBot.command('test', (ctx)=>{
        try {
            this.volumeBot.telegram.sendMessage(ctx.chat.id, `${ctx.update.message.reply_to_message.message_thread_id}`, {reply_to_message_id: ctx.update.message.reply_to_message.message_thread_id})
        } catch(e) {
            console.log(e);
            this.volumeBot.telegram.sendMessage(ctx.chat.id, `${e}`)
        }
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






    async run1mJob_old() {
        //1. get last minute

        //1m alerts
        try {
            const response = await api.get(`/api/contracts?minutes=1&marketCap=100000`);
            console.log(response.data.data)
        } catch(e) {
            console.log(e.response.data, 'error')
        }

        //if it's less than 15 minutes old and < 100k marketcap and 1mvolume>5000

        //oBTC based alert -- if 5m volume > 8000 and marketCap < 1000000
        //if 15m volume > 25000 and marketCap < 1000000


        //if less than 100000 marketcap and >10000 volume in 15 minutes

        //if less than 1000000 marketcap and 100000 volume

        //2. get last 5 minutes


        //5m alerts


        //3. get last 15 minutes
        //15m alerts


        //4. get last 1 hour 
        //1 hour alerts
    }

    
    // async parseTelegramJson(ctx,json) {
    //     let str = "``` \n";
    //     let strlen = 0;
    //     for (let i in json) {
    //         for (let [k,v] of Object.entries(json[i])) {
    //             if (i==0) {
    //                 if (k!='contract') {
    //                     str += `${k}---|`
    //                 } else {
    //                     str += `${k}${`-`.repeat(38)}|`
    //                 }
    //             }
    //             //str += `${k}: ${v} \n`
    //         }
    //         str += `\n`
    //         for (let [k,v] of Object.entries(json[i])) {
    //             let item = v;
    //             let isItemNumber = !isNaN(parseInt(v));
    //             if (isItemNumber) {
    //                 v = `${v}`.replace(/([0-9])\.([0-9]+)/,"$1")
    //             } else {
    //                 v = wtf8.encode(v);
    //                 v = `${v}`.slice(1,k.length+3)
    //             }

    //             v.length < k.length + 3 ? v = `${v}${` `.repeat(k.length+3-v.length)}|` : null
    //             str += v
    //         }
    //         str += `\n`

    //         //str += `----------------------- \n`
    //     }
    //     str += "```"
    //     //str = utf8.encode(str);
    //     for (let i = 0; i<str.length; i = i+2000) {
    //         const end = i+2000 < str.length ? i+2000 : str.length;
    //         // this.volumeBot.telegram.sendMessage(ctx.chat.id,str.slice(i,end))
    //         ctx.replyWithMarkdownV2(str.slice(i,end));
    //     }
 
    // }



    // async parseTelegramJson(ctx,json) {
    //     let str = "";
    //     let strlen = 0;
    //     for (let i in json) {
    //         str += `${parseInt(i)+1}.`
    //         for (let [k,v] of Object.entries(json[i])) {
    //             str += `${k}: ${v},`
    //         }
    //         str += `----------------------- \n`
    //     }
    //     //str = wtf8.encode(str);
    //     for (let i = 0; i<str.length; i = i+2000) {
    //         const end = i+2000 < str.length ? i+2000 : str.length;
    //         this.volumeBot.telegram.sendMessage(ctx.chat.id,str.slice(i,end))
    //     }
 
    //     return str

    // }


}
