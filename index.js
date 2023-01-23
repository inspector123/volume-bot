
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
    CHAT_ID_BETA_TEST,
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
app.listen(PORT, () => {
 console.log(`server running on port ${PORT}`);
});

//const fullNodeIp = "192.168.0.228"
const archiveNodeIp = "127.0.0.1"
const httpPort = "8545"
const wssPort = "9536"

//const fullNodeUrl = `http://${fullNodeIp}:${httpPort}`
const archiveNodeUrl = `http://${archiveNodeIp}:${httpPort}`


switch(process.env.program) {
    case "GETOLDBLOCKS":
        const blockFiller = new BlockFiller(CHAT_ID_BETA_TEST, archiveNodeUrl);
        const totalFills = 100;
        for (let i = 0; i<totalFills; i++) {
            console.log(`
        --------------------------------------------------------------------------
        STARTING BLOCK FILL ${i+1} OF ${totalFills}
            
        --------------------------------------------------------------------------
        
            `);
            await blockFiller.fillBlocksFromBehind(1000);
        }
        break;
    case "FILLIN": 
        if (!process.env.FROMBLOCK || !process.env.TOBLOCK) throw new Error('fromblock or toblock not specified')
        const _blockFiller = new BlockFiller(CHAT_ID_BETA_TEST, archiveNodeUrl);
        await _blockFiller.fillBetween(process.env.FROMBLOCK, process.env.TOBLOCK);
        break;
    case "CONTRACTS": 
        const watcher = new ContractWatcher(CHAT_ID_BETA_TEST, VOLUME_BOT_KEY,archiveNodeUrl);
        watcher.start();
        break;
    case "LATEST":
        console.log('getting latest')
        const latestWatcher = new LatestBlockWatcher(CHAT_ID_BETA_TEST, archiveNodeUrl)
        latestWatcher.start();
        break;
    default: 
        throw new Error(`did not include program="FILLBLOCKS", program="CONTRACTS" or program="LATEST". \n must run like this: program="LATEST" npm run start`)
}
