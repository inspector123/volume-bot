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

            await this.latestBlockWallets(block);


        })

    }

    async latestBlockWallets(block) {
        try {
            const response = await api.get('/api/swaps/1?max=true')
            const max = response.data.data[0].maxBlockNumber;
            console.log(max)
            if (max == block) return;

            //Get swaps for current block
            let swaps = await this.archiveProvider.getLogs({topics:[[v2topic,v3topic]], fromBlock: block});
            this.swapParser.reset();
            this.swapParser.getAllPairs();
            for (let i in swaps) {
                await this.swapParser.grabSwap(swaps[i]);
            }

            //Post to pairs db
            if (this.swapParser.newPairsData.length) {
                try {
                    await api.post('/api/pairs', this.swapParser.newPairsData)
                }catch(e) {
                    console.log(e.response.data)
                }
            }

            //Post to MainSwaps db
            if (this.swapParser.allSwapsData.length) {
                try {
                    await api.post(`/api/swaps?table=MainSwaps`, this.swapParser.allSwapsData)
                }catch(e) {
                    console.log(e.response.data)
                }
            }

            //Run EpiWallet Routine
            let { allSwapsData: _swaps } = this.swapParser;
            for (let i in _swaps) {
                const checkForWallet = wallets.filter(w=>w.wallet==_swaps[i].wallet);
                if (checkForWallet.length) {
                    console.log(checkForWallet, _swaps[i].wallet)
                    
                    try {
                        this.alertBot.telegram.sendMessage(this.chatId, 
                            `${_swaps[i].isBuy ? `Bought ` : `Sold`} $${`${_swaps[i].usdVolume}`.replace(/\.[0-9]*/, "")} ${_swaps[i].symbol}
        New transaction from ${_swaps[i].wallet} on ${_swaps[i].router}

        contract address: https://etherscan.io/token/${_swaps[i].contract}

        wallet: https://etherscan.io/address/${_swaps[i].wallet}

        MARKETCAP: $${`${_swaps[i].marketCap}`.replace(/\.[0-9]*/, "")}

        CHART: https://dextools.io/app/ether/pair-explorer/${_swaps[i].pairAddress}
        This wallet interacted ${checkForWallet[0].interactions} of the last 6 times the bot was active.
                        `).catch(e=>console.log(e))
                    }
                    catch(e) {
                        console.log(e, 'dfkjladfkjlfds')
                    }
                }
                if (this.swapParser.allSwapsData.length) {
                    try {
                        await api.post(`/api/swaps?table=EpiWalletSwaps`, this.swapParser.allSwapsData)
                    }catch(e) {
                        console.log(e.response.data)
                    }
                }
            }
            for (let i in _swaps) {
                const checkForWallet = walletsUnfiltered.filter(w=>w.wallet==_swaps[i].wallet);
                if (checkForWallet.length) {
                    console.log(checkForWallet[0], _swaps[i].wallet)
                    const count = await api.get(`/api/swaps?table=EpiWalletSwapsUnfiltered&wallet="${checkForWallet[0].wallet}"&contract="${_swaps[i].contract}"`)
                    const countWallet = await api.get(`/api/swaps?table=EpiWalletSwapsUnfiltered&wallet="${checkForWallet[0].wallet}"`)
                    const countContract =  await api.get(`/api/swaps?table=EpiWalletSwapsUnfiltered&contract="${_swaps[i].contract}"`)
                    //console.log(count.data.data[0], countWallet.data, countContract.data.data[0])
                    console.log(count.data)
                    
                    
                    this.alertBot.telegram.sendMessage(this.chatIdUnfiltered, 
                        `${_swaps[i].isBuy ? `Bought ` : `Sold`} $${`${_swaps[i].usdVolume}`.replace(/\.[0-9]*/, "")}  ${_swaps[i].symbol}
    New transaction from ${_swaps[i].wallet} on ${_swaps[i].router}

    contract address: https://etherscan.io/token/${_swaps[i].contract}

    MARKETCAP: $${`${_swaps[i].marketCap}`.replace(/\.[0-9]*/, "")}

    CHART: https://dextools.io/app/ether/pair-explorer/${_swaps[i].pairAddress}
    This wallet interacted ${checkForWallet[0].interactions} of the last 6 times the bot was active.
    Count on this wallet: ${count ? count.data.data[0] : 0}
    
    Count on this contract:${countContract.data ? countContract.data.data[0].count : 0}
                    `).catch(e=>console.log(e, 'fdaskjlfdaskj'))
                   // send to EpiWalletsUnfiltered dtabase
                    if (this.swapParser.allSwapsData.length) {
                        try {
                            await api.post(`/api/swaps?table=EpiWalletSwapsUnfiltered`, this.swapParser.allSwapsData)
                        }catch(e) {
                            console.log(e.response.data)
                        }
                    }
                }
            }



            //Run FreshWallet Routine




            this.swapParser.reset();
        }catch(e) {
            console.log(e)
        }


    }
}