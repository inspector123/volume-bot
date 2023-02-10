
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
    CHAT_ID_VOLUME_ALERTS,
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
        const contractWatcher = new ContractWatcher(CHAT_ID_VOLUME_ALERTS,VOLUME_BOT_KEY,archiveNodeUrl);
        console.log('running contracts bot')
        contractWatcher.start();
        break;
    case "LATEST":
        const latestWatcher = new LatestBlockWatcher(CHAT_ID_BETA_TEST,CHAT_ID_UNFILTERED, ALERT_BOT_KEY, VOLUME_BOT_KEY, archiveNodeUrl)
        latestWatcher.start();
        break;
    case "TEST":
        //await LatestBlockWatcher.processWallets();

    default: 
        throw new Error(`did not include program="FILLIN", program="CONTRACTS" or program="LATEST". \n must run like this: PROGRAM="LATEST" npm run start`)
}
