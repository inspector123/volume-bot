
import api from "./api/utils/axios.js"
import {Telegraf} from "telegraf"
import wtf8 from 'wtf-8';

export class DatabaseWatcher {

    volumeBot;
    to100k;
    to1m;
    to10m;
    to1b;

    constructor(volumeBotKey, to100k, to1m, to10m, to1b) {
        this.volumeBot = new Telegraf(volumeBotKey);
        this.to100k = to100k;
        this.to1m = to1m;
        this.to10m = to10m;
        this.to1b = to1b;
        this.volumeBot.catch(e=>console.log(e))
        
    }
    async start() {
        //setInterval(()=>run1mJob(),600000);
        this.setUpCommands();
        this.runJob(1,10000);
        setInterval(()=>this.runJob(1, 10000),1*60*1000);
        setInterval(()=>this.runJob(5, 30000),5*60*1000);
        setInterval(()=>this.runJob(15, 50000),15*60*1000);
        setInterval(()=>this.runJob(60, 100000),60*60*1000);
        
    }

    async getAlert(blocks, volume) {
        try {
            const response = await api.get(`/api/alerts?volume=${volume}&blocks=${blocks}`);
            console.log(response.data.data)
            return response.data.data;
        } catch(e) {
            console.log(e.response.data, 'error')
        }
    }

    /*
{
    symbol: 'agEUR',
    contract: '0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8',
    sm: 106318.719184,
    mc: 30200736.88321536,
    totalBuys: 1,
    buyratio: 0,
    priceRatio: 1,
    ageInMinutes: 624093,
    pairAddress: 0x12312312213213213
  }

    */

    async runJob(time, volume) {
        const blocks = time*5;
        const alerts = await this.getAlert(blocks, volume);
        console.log(time, volume, alerts.length)
        if (alerts.length) {
            const marketCaps = [{mc: 100000, chatId: this.to100k },{mc: 1000000, chatId: this.to1m },{mc: 10000000, chatId: this.to10m },{mc: 1000000000, chatId: this.to1b }];
            //don't want 1m alerts above 1M mc
            //time == 1 ? marketCaps = marketCaps.slice(0,1) : null;
            for (let i in marketCaps) {
                const marketCapAlerts = alerts.filter(a=> {
                    if (i > 0) {
                        return a.mc > marketCaps[i-1].mc && a.mc < marketCaps[i].mc
                    } else return a.mc < marketCaps[i].mc;
                })
                for (let coin of marketCapAlerts) {
                    const { sm, mc, totalBuys, priceRatio, ageInMinutes: age, buyRatio, contract, symbol, pairAddress } = coin;
                    let messageText = `ALERT:
                    Volume on $${symbol} reached ${sm} over the last ${time} minutes!
                    Marketcap: ${mc}
                    Total buys: ${totalBuys}
                    Buy/sell ratio: ${parseInt(buyRatio) > 0 ? 1/parseInt(buyRatio) : buyRatio} ${buyRatio}
                    Contract age in minutes: ${age}
                    Contract: \`\`\`${contract}\`\`\`
                    Chart: https://dextools.io/app/ether/pair-explorer/${pairAddress}
                    `
                    messageText = messageText.replace(/\s{3,}([A-Z])/gm, '\n$1').replace(/\./g, "\\.").replace(/\!/g,"\\!").replace(/-/g, "\\-");
                    this.volumeBot.telegram.sendMessage(marketCaps[i].chatId, messageText, {parse_mode: 'MarkdownV2'});
                }
                
            }
        }

    }

    async runChangeInVolumeJob() {
        return;
    }

    // async run5mJob() {
    //     await this.getAlert(10000,25);
    // }

    // async run15mJob() {
    //     await this.getAlert(10000,25);
    // }











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

    async setUpCommands() {
        this.volumeBot.command('help', (ctx)=>{
            this.volumeBot.telegram.sendMessage(ctx.chat.id, `
            LIST OF COMMANDS: 
            
            `)
        })







        // this.volumeBot.command('volume', async (ctx)=> {
        //     const command = 'volume';
        //     try {
        //         const text = ctx.message.text;
        //         const marketCap = text.match(/(?:marketCap=)([0-9]+)/)[1];
        //         const minutes = text.match(/(?:minutesInterval=)([0-9]+)/)[1];
        //         this.volumeBot.telegram.sendMessage(ctx.chat.id, `processing volume search for marketCap=${marketCap} and minutesInterval=${minutes}`)
        //         const response = await api.get(`/api/contracts?minutes=${1}&marketCap=${marketCap}`);
        //         console.log(response.data.data.length)
        //         //this.volumeBot.telegram.sendMessage(ctx.chat.id, `done`)
        //         //const messageString = this.parseTelegramJson(response.data.data)
        //         this.parseTelegramJson(ctx, response.data.data)

        //         //this.volumeBot.telegram.sendMessage(ctx.chat.id, messageString)
        //     } catch(e) {
        //         console.log(e)
        //         this.volumeBot.telegram.sendMessage(ctx.chat.id, `error processing ${command} command, ${e}`)
        //     }
        // })
        // this.volumeBot.command('volume', async (ctx)=> {
        //     const command = 'volume';
        //     try {
        //         const text = ctx.message.text;
        //         const marketCap = text.match(/(?:marketCap=)([0-9]+)/)[1];
        //         const minutes = text.match(/(?:minutesInterval=)([0-9]+)/)[1];
        //         this.volumeBot.telegram.sendMessage(ctx.chat.id, `processing volume search for marketCap=${marketCap} and minutesInterval=${minutes}`)
        //         const response = await api.get(`/api/contracts?minutes=${minutes}&marketCap=${marketCap}`);
        //         console.log(response.data.data.length)
        //         //this.volumeBot.telegram.sendMessage(ctx.chat.id, `done`)
        //         //const messageString = this.parseTelegramJson(response.data.data)
        //         this.parseTelegramJson(ctx, response.data.data)

        //         //this.volumeBot.telegram.sendMessage(ctx.chat.id, messageString)
        //     } catch(e) {
        //         console.log(e)
        //         this.volumeBot.telegram.sendMessage(ctx.chat.id, `error processing ${command} command, ${e}`)
        //     }
        // })
        this.volumeBot.launch();
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
