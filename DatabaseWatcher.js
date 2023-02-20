
import api from "./api/utils/axios.js"
import {Telegraf} from "telegraf"

export class DatabaseWatcher {

    volumeBot;

    constructor(volumeBotKey, archiveNodeUrl) {
        this.volumeBot = new Telegraf(volumeBotKey);
        this.volumeBot.catch(e=>console.log(e))
        
    }
    async start() {
        //setInterval(()=>run1mJob(),600000);
        this.setUpCommands();
    }
    async run1mJob() {
        //1. get last minute

        //1m alerts
        try {
            const response = await api.get(`/api/contractVolume?minutes=1&marketCap=100000`);
            console.log(response.data.data)
        } catch(e) {
            console.log(e.response.data, 'error')
        }

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
            /volume minutesInterval={minutes} marketCap={marketCap}
            must be exactly like that
            `)
        })
        this.volumeBot.command('volume', async (ctx)=> {
            const command = 'volume';
            try {
                const text = ctx.message.text;
                const marketCap = text.match(/(?:marketCap=)([0-9]+)/)[1];
                const minutes = text.match(/(?:minutesInterval=)([0-9]+)/)[1];
                this.volumeBot.telegram.sendMessage(ctx.chat.id, `processing volume search for marketCap=${marketCap} and minutesInterval=${minutes}`)
                const response = await api.get(`/api/contracts?minutes=${minutes}&marketCap=${marketCap}`);
                console.log(response.data.data.length)
                //this.volumeBot.telegram.sendMessage(ctx.chat.id, `done`)
                //const messageString = this.parseTelegramJson(response.data.data)
                this.parseTelegramJson(ctx, response.data.data)

                //this.volumeBot.telegram.sendMessage(ctx.chat.id, messageString)
            } catch(e) {
                console.log(e)
                this.volumeBot.telegram.sendMessage(ctx.chat.id, `error processing ${command} command, ${e}`)
            }
        })
        this.volumeBot.launch();
    }

    async parseTelegramJson(ctx,json) {
        let str = "";
        let strlen = 0;
        for (let i in json) {
            str += `${parseInt(i)+1} of ${json.length} \n`
            for (let [k,v] of Object.entries(json[i])) {
                str += `${k}: ${v} \n`
            }
            str += `----------------------- \n`
        }
        str = decodeURIComponent(str);
        for (let i = 0; i<str.length; i = i+2000) {
            const end = i+2000 < str.length ? i+2000 : str.length;
            await this.volumeBot.telegram.sendMessage(ctx.chat.id,str.slice(i,end))
        }
 
        return str

    }


}
