
import * as dotenv from 'dotenv'
import ContractWatcher from './ContractWatcher.js'
import express from "express"
import cors from "cors"
import router from './api/routes/index.js'
import AppError from "./api/utils/AppError.js";
import errorHandler from "./api/utils/errorHandler.js";
import bodyParser from 'body-parser'
import { BlockFiller } from './api/utils/blockFiller.js'
import { LatestBlockWatcher } from './LatestBlockWatcher.js'

dotenv.config();
const {
    CHAT_ID_CHANNEL,
    CHAT_ID_CHANNEL_BETA, 
    CHAT_ID_DISCUSSION, 
    VOLUME_BOT_KEY,
    ALERT_BOT_KEY,
    CHAT_ID_BETA_TEST,
    CHAT_ID_UNFILTERED,
    PORT
 } = process.env;
const app = express();
app.use(bodyParser.json({limit:'500mb'}))
app.use(router);

app.use(cors());

app.all("*", (req, res, next) => {
 next(new AppError(`The URL ${req.originalUrl} does not exist`, 404));
});
app.use(errorHandler);
app.listen(process.env.PORT, () => {
 console.log(`server running on port ${PORT}`);
});

//const fullNodeIp = "192.168.0.228"
const archiveNodeIp = "127.0.0.1"
const httpPort = "8545"
const wssPort = "9536"

//const fullNodeUrl = `http://${fullNodeIp}:${httpPort}`
const archiveNodeUrl = `http://${archiveNodeIp}:${httpPort}`
const latestWatcher = new LatestBlockWatcher(CHAT_ID_BETA_TEST,CHAT_ID_UNFILTERED, ALERT_BOT_KEY, VOLUME_BOT_KEY, archiveNodeUrl)
const blockFiller = new BlockFiller(CHAT_ID_BETA_TEST, archiveNodeUrl);



switch(process.env.PROGRAM) {
    //"0x2d886570A0dA04885bfD6eb48eD8b8ff01A0eb7e" == BCB
    // 0xa71d0588EAf47f12B13cF8eC750430d21DF04974 = QOM
    case "FILLIN": 
        if (!process.env.FROMBLOCK || !process.env.TOBLOCK) throw new Error('fromblock or toblock not specified')
        console.log(process.env.FROMBLOCK, process.env.TOBLOCK)
        await blockFiller.fillBetween(parseInt(process.env.FROMBLOCK), parseInt(process.env.TOBLOCK));
        console.log('Completed.')
        process.exit();
    case "CONTRACTS": 
        console.log('running contracts bot')
        const watcher = new ContractWatcher(CHAT_ID_BETA_TEST, VOLUME_BOT_KEY,archiveNodeUrl);
        watcher.start();
        break;
    case "LATEST":
        latestWatcher.start();
        break;

    case "SYNC":
        const epiWallets = ["0x8eEcaad83a1Ea77bD88A818d4628fAfc4CaD7969",
        // "0x2dc1f8a31080d0d7d03c2c719a02955a3548e478",
        // "0x0a7fe158fcbddd5e665e276aaf40f804261c653d",
        // "0x6f3277ad0782a7da3eb676b85a8346a100bf9c1c",
        // "0x49642110B712C1FD7261Bc074105E9E44676c68F"
    ]
        for (let i in epiWallets) {
            await blockFiller.getAllSwapsFromContract(epiWallets[i], "AllPumpSwaps");
            console.log(`Completed ${epiWallets[i]}, ${i+1} of ${epiWallets.length}`);
        }
        console.log('Completed.')
        process.exit();
        break;

    // case "FINDBLOCKBYDATE":
    case "TEST":
        //await LatestBlockWatcher.processWallets();

    default: 
        throw new Error(`did not include program="FILLIN", program="CONTRACTS" or program="LATEST". \n must run like this: PROGRAM="LATEST" npm run start`)
}
