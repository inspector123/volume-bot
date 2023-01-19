
import * as dotenv from 'dotenv'
import ContractWatcher from './ContractWatcher.js'
import express from "express"
import cors from "cors"
import router from './api/routes/index.js'
import AppError from "./api/utils/AppError.js";
import errorHandler from "./api/utils/errorHandler.js";
import bodyParser from 'body-parser'
import { BlockFiller } from './api/utils/blockFiller.js'

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

app.use(bodyParser.json())
app.use(router);

app.use(cors());

app.all("*", (req, res, next) => {
 next(new AppError(`The URL ${req.originalUrl} does not exist`, 404));
});
app.use(errorHandler);
app.listen(PORT, () => {
 console.log(`server running on port ${PORT}`);
});

const fullNodeIp = "192.168.0.228"
const archiveNodeIp = "192.168.0.155"
const httpPort = "9535"
const wssPort = "9536"

const fullNodeUrl = `http://${fullNodeIp}:${httpPort}`
const archiveNodeUrl = `http://${archiveNodeIp}:${httpPort}`

// const watcher = new ContractWatcher(CHAT_ID_BETA_TEST, VOLUME_BOT_KEY, fullNodeUrl, archiveNodeUrl);

const blockFiller = new BlockFiller(CHAT_ID_BETA_TEST, archiveNodeUrl);
await blockFiller.fillBlocksFromBehind(1000);

await blockFiller.fillBlocksFromBehind(1000);


await blockFiller.fillBlocksFromBehind(1000);

await blockFiller.fillBlocksFromBehind(1000);
await blockFiller.fillBlocksFromBehind(1000);
await blockFiller.fillBlocksFromBehind(1000);
await blockFiller.fillBlocksFromBehind(1000);
await blockFiller.fillBlocksFromBehind(1000);
await blockFiller.fillBlocksFromBehind(1000);
