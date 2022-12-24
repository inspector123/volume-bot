
import api from "./api/utils/axios.js"
import { Telegraf } from 'telegraf';
import { ethers, utils } from "ethers"
class ContractWatcher {

    currentBlock;
    volumeBotKey;
    chatId;
    httpProvider;
    gettingPrintout = true;
    blocksPerMin = 5;
    busy;

    constructor(chatId, volumeBotKey, httpUrl) {

        this.chatId = chatId;
        this.volumeBot = new Telegraf(volumeBotKey);
        this.httpProvider = new ethers.providers.JsonRpcProvider(httpUrl);
        this.setUpVolumeBot();
        this.node();
    }

    node() {
        this.httpProvider.on('block', (block)=>{
            this.currentBlock = block;
            //this.getLastBlock(block-2);
            //getWallet();

        })
    }


    setUpVolumeBot() {
        this.volumeBot.command('printout', (ctx)=> {
            if (this.gettingPrintout)
            { 
                this.volumeBot.telegram.sendMessage(this.chatId, 'feck off mate'); 
                return;
            } 
            else {
                this.gettingPrintout = true;
                const messageText = '/printout ';
                this.volumeBot.telegram.sendMessage(this.chatId, 'test');
                
                const replacedText = ctx.message.text.replace(messageText, '')
                console.log(replacedText)

                //const response = getBasicPrintout()
                this.gettingPrintout = false;
            }
            
        })
        this.volumeBot.command('sorted', async (ctx)=> {
            if (this.busy) this.volumeBot.telegram.sendMessage(this.chatId, 'busy');
            else {
                this.busy = true;
                const messageText = '/sorted ';
                this.volumeBot.telegram.sendMessage(this.chatId, 'processing');

                const replacedText = ctx.message.text.replace(messageText, '')

                const response = await this.getBasicSortedVolumePrintout(replacedText);
                if (response == 'error') this.volumeBot.telegram.sendMessage(this.chatId, 'bad input, try again.');
                console.log(response.data.slice(0,100));
                this.busy = false;
                
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
        return response.data;
    }

    async createContracts() {
        return;
    }

    async getFromBlock(block){
        const response = await api.get(`/api/blocks/from/${block}`);
        console.log(response.data.data)
        return response.data.data;
    }


    getBlocksfromTime(time){
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
            default: 
                blocks = 0
                break;
        }
        return blocks;
    }
}


export default ContractWatcher;