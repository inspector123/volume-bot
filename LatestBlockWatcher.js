import { BlockFiller } from "./api/utils/blockFiller.js";
import { Telegraf } from 'telegraf';
import { ethers } from 'ethers';
import SwapParser from "./api/utils/swapParser.js";
import Constants from "./api/utils/constants.js";
import api from './api/utils/axios.js'
import wallets from './epi_wallets/wallets_orderbydesc_4.json' assert { type: "json" };
import walletsUnfiltered from './epi_wallets/wallets_orderbydesc_object_2.json' assert { type: "json" };

const { v3topic, v2topic } = Constants;

export class LatestBlockWatcher {
    
    blockFiller;
    chatId;
    alertBot;
    blocks = 0;
    httpProvider;
    archiveProvider;
    swapParser;
    chatIdUnfiltered;
    currentBlockSwaps = []

    constructor(chatId, chatIdUnfiltered, AlertBotKey, VolumeBotKey, archiveUrl) {
        this.chatIdUnfiltered = chatIdUnfiltered;
        this.chatId = chatId;
        this.blocks = 0;
        this.archiveProvider = new ethers.providers.JsonRpcProvider(archiveUrl);
        this.swapParser = new SwapParser(archiveUrl);
        this.blockFiller = new BlockFiller(chatId, archiveUrl);
        this.startBots(AlertBotKey);
        this.swapParser.getAllPairs();


        
    }
    startBots(AlertBotKey) {
        this.alertBot = new Telegraf(AlertBotKey);
        this.alertBot.catch(e=>console.log(e))

        
    }
    async start() {
        //this.startBots();
        this.runEthersBlockCheck();
    }


    async runEthersBlockCheck(blocks) {
        if (blocks) this.blocks = blocks;
        this.archiveProvider.on('block', async (block)=>{
            console.log('latest block: ', block)
            if (this.swapParser.newPairsData.length) {
                console.log('pairs', this.swapParser.newPairsData.length)
                try {
                    await api.post('/api/pairs', this.swapParser.newPairsData)
                }catch(e) {
                    console.log(e.response.data, 'pairs blah')
                }
            }
            this.swapParser.reset();


        })
        this.archiveProvider.on({topics: [[v2topic,v3topic]]}, async (log)=>{
            let swap = await this.swapParser.grabSwap(log);
            if (swap != {} && swap != undefined) {
                try {
                    const response = await api.post(`/api/swaps?table=MainSwaps`, [swap])
                }catch(e) {
                    console.log(e.response, 'error', swap)
                }
            }
        })

    }
}