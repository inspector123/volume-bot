
import api from "./api/utils/axios.js"
import { Telegraf } from 'telegraf';
import { ethers, utils } from "ethers"
class ContractWatcher {

    volumeBotKey;
    chatId;
    httpProvider;
    gettingPrintout;
    blocksPerMin = 5;

    constructor(chatId, volumeBotKey, httpUrl) {

        this.chatId = chatId;
        this.volumeBot = new Telegraf(volumeBotKey);
        this.httpProvider = new ethers.providers.JsonRpcProvider(httpUrl);
        this.setUpVolumeBot();
        this.node();
    }

    node() {

    }


    setUpVolumeBot() {
        this.volumeBot.command('printout', (ctx)=> {
            if (gettingPrintout)
            { 
                this.volumeBot.telegram.sendMessage(this.chatId, 'busy'); return;} 
            else {
                const messageText = '/printout ';
                this.volumeBot.telegram.sendMessage(this.chatId, 'test');
                
                const replacedText = ctx.message.text.replace(messageText, '')
                console.log(replacedText)

                const response = getBasicPrintout()
            
            }
            
        })
        this.volumeBot.launch();
    }

    async getBasicPrintout(time) {
        api.get('/api/blocks?')
    }

    async getBasicSortedVolumePrintout(time) {
        let blocks = this.getBlocksfromTime(time);

        api.get('api/blocks?sortSymbol=true&blocks=blocks')
    }

    async createContracts() {
        return;
    }

    async getBlocksfromTime(time){
        let blocks;
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
        }
        return blocks;
    }
}


export default ContractWatcher;