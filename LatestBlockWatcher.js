import { BlockFiller } from "./api/utils/blockFiller.js";
import { Telegraf } from 'telegraf';
import { ethers } from 'ethers';
import SwapParser from "./api/utils/swapParser.js";
import Constants from "./api/utils/constants.js";
import api from './api/utils/axios.js'

const { v3topic, v2topic } = Constants;

export class LatestBlockWatcher {
    
    blockFiller;
    chatId;
    alertBot;
    blocks = 0;
    httpProvider;
    archiveProvider;
    swapParser;
    currentBlockSwaps = []

    constructor(chatId, archiveUrl) {
        this.chatId = chatId;
        this.blocks = 0;
        this.archiveProvider = new ethers.providers.JsonRpcProvider(archiveUrl);
        this.swapParser = new SwapParser(archiveUrl);
        this.blockFiller = new BlockFiller(chatId, archiveUrl);


        
    }
    async start() {
        //this.startBots();
        this.runEthersBlockCheck();
    }


    async runEthersBlockCheck(blocks) {
        if (blocks) this.blocks = blocks;
        this.archiveProvider.on('block', async (block)=>{
            console.log('latest block: ', block)

            // if (this.currentBlockSwaps.length) {
            //     this.previousBlockSwaps = this.currentBlockSwaps;
            //     this.currentBlockSwaps = [];
            //     //console.log(this.previousBlockSwaps)

            //     await this.send();

                

            // }

            this.blockFiller.runSwapParseSqlRoutine(block,block);


        })

        // this.archiveProvider.on({topics: [[v3topic, v2topic]]}, async (log)=> {
        //     const response = await this.swapParser.grabSwap(log);
        //     this.currentBlockSwaps = [...this.currentBlockSwaps, response]
        // })

    }
    // async send() {
    //     let time1 = Date.now();
    //     try {
    //         await api.post('/api/pairs', this.swapParser.newPairsData)
    //     } catch(e) {
    //         console.log(e)
    //     }
    //     let totalTime = Date.now()-time1;
    //     console.log('time to post all pairs: ', totalTime/1000)
    //     console.log('sending blocks to api. ')
    //     time1 = Date.now();
    //     try {
    //         await api.post('/api/blocks', this.swapParser.allSwapsData)
    //     } catch(e) {
    //         console.log(e)
    //     }
    //     totalTime = (Date.now()-time1)/1000;
    //     console.log('time to post all blocks: ', totalTime)
    //     console.log('DONE.');
    //     this.swapParser.reset();
    //     return;
    // }
}