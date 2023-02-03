
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
const latestWatcher = new LatestBlockWatcher(CHAT_ID_BETA_TEST, ALERT_BOT_KEY, VOLUME_BOT_KEY, archiveNodeUrl)



switch(process.env.PROGRAM) {
    //"0x2d886570A0dA04885bfD6eb48eD8b8ff01A0eb7e" == BCB
    // 0xa71d0588EAf47f12B13cF8eC750430d21DF04974 = QOM
    // case "GETOLDBLOCKS":
    //     const totalFills = process.env.TOTALFILLS || 1000;
    //     const blockFiller = new BlockFiller(CHAT_ID_BETA_TEST, archiveNodeUrl);
    //     for (let i = 0; i<totalFills; i++) {
    //         console.log(`
    //     --------------------------------------------------------------------------
    //     STARTING BLOCK FILL ${i+1} OF ${totalFills}
            
    //     --------------------------------------------------------------------------
        
    //         `);
    //         await blockFiller.fillBlocksFromBehind(1000);
    //     }
    //     console.log('COMPLETED.')
    //     process.exit();
    // case "FILLIN": 
    //     if (!process.env.FROMBLOCK || !process.env.TOBLOCK) throw new Error('fromblock or toblock not specified')
    //     const _blockFiller = new BlockFiller(CHAT_ID_BETA_TEST, archiveNodeUrl);
    //     console.log(process.env.FROMBLOCK, process.env.TOBLOCK)
    //     await _blockFiller.fillBetween(parseInt(process.env.FROMBLOCK), parseInt(process.env.TOBLOCK));
    //     console.log('Completed.')
    //     process.exit();
    // case "CONTRACTS": 
    //     console.log('running contracts bot')
    //     const watcher = new ContractWatcher(CHAT_ID_BETA_TEST, VOLUME_BOT_KEY,archiveNodeUrl);
    //     watcher.start();
    //     break;
    // case "LATEST":
    //     console.log('getting latest')
    //     const latestWatcher = new LatestBlockWatcher(CHAT_ID_BETA_TEST, archiveNodeUrl)
    //     latestWatcher.start();
    //     break;
    
    // case "TEST":
    //     await blockFiller.getAllSwapsFromContract("0xa71d0588EAf47f12B13cF8eC750430d21DF04974", 6000);
    //     console.log('Completed.')
    //     process.exit();
    //     break;

    case "LATEST":
        latestWatcher.start();
        break;

    case "EPI":
        // const epiWallets = ["0xeb813cccb65c338f6535d99146f280450e2a4d03","0xf9bbd9b68538274a7b2c9170c7a465346ecf1fa1",
        // "0x2dc1f8a31080d0d7d03c2c719a02955a3548e478",
        // "0x0a7fe158fcbddd5e665e276aaf40f804261c653d",
        // "0x6f3277ad0782a7da3eb676b85a8346a100bf9c1c",
        // "0x49642110B712C1FD7261Bc074105E9E44676c68F"]
        // for (let i in epiWallets) {
        //     await blockFiller.getAllSwapsFromContract(epiWallets[i]);
        //     console.log(`Completed ${epiWallets[i]}, ${i+1} of ${epiWallets.length}`);
        // }
        console.log('Completed.')
        process.exit();
        break;

    // case "FINDBLOCKBYDATE":
    case "TEST":
        //await LatestBlockWatcher.processWallets();

    default: 
        throw new Error(`did not include program="GETOLDBLOCKS", program="FILLIN", program="CONTRACTS" or program="LATEST". \n must run like this: program="LATEST" npm run start`)
}
