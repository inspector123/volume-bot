import { BlockFiller } from "./api/utils/blockFiller.js";
import { Telegraf } from 'telegraf';
import { ethers } from 'ethers';
import SwapParser from "./api/utils/swapParser.js";
import Constants from "./api/utils/constants.js";
import api from './api/utils/axios.js'
import wallets from './epi_wallets/wallets_orderbydesc_object_2.json' assert { type: "json" };

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

    constructor(chatId, AlertBotKey, VolumeBotKey, archiveUrl) {
        this.chatId = chatId;
        this.blocks = 0;
        this.archiveProvider = new ethers.providers.JsonRpcProvider(archiveUrl);
        this.swapParser = new SwapParser(archiveUrl);
        this.blockFiller = new BlockFiller(chatId, archiveUrl);
        this.startBots(AlertBotKey);


        
    }
    startBots(AlertBotKey) {
        this.alertBot = new Telegraf(AlertBotKey);

        
    }
    async start() {
        //this.startBots();
        this.runEthersBlockCheck();
    }


    async runEthersBlockCheck(blocks) {
        if (blocks) this.blocks = blocks;
        this.archiveProvider.on('block', async (block)=>{
            console.log('latest block: ', block)

            await this.latestBlockWallets(block);


        })

    }

    async latestBlockWallets(block) {
        let swaps = await this.archiveProvider.getLogs({topics:[[v2topic,v3topic]], fromBlock: block});
        this.swapParser.reset();
        this.swapParser.getAllPairs();
        for (let i in swaps) {
            await this.swapParser.grabSwap(swaps[i]);
        }
        if (this.swapParser.newPairsData.length) {
            try {
                await api.post('/api/pairs', this.swapParser.newPairsData)
            }catch(e) {
                console.log(e.response.data)
            }
        }
        if (this.swapParser.allSwapsData.length) {
            try {
                await api.post(`/api/swaps?table=MainSwaps`, this.swapParser.allSwapsData)
            }catch(e) {
                console.log(e.response.data)
            }
        }
        let { allSwapsData: _swaps } = this.swapParser;
        for (let i in _swaps) {
            const checkForWallet = wallets.filter(w=>w.wallet==_swaps[i].wallet);
            if (checkForWallet.length) {
                console.log(checkForWallet[0])
                this.alertBot.telegram.sendMessage(this.chatId, 
`New transaction from ${_swaps[i].wallet} on ${_swaps[i].router}

${_swaps[i].isBuy ? `Bought ` : `Sold`} $${_swaps[i].usdVolume} worth of ${_swaps[i].symbol}

MARKETCAP: $${_swaps[i].marketCap}

CHART: https://dextools.io/ether/pair-explorer/${_swaps[i].pairAddress}
This wallet interacted ${checkForWallet[0].interactions} of the last 6 times the bot was active.
                `)
            }
        }

        this.swapParser.reset();


    }
}