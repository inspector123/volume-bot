
import * as dotenv from 'dotenv'
dotenv.config();
import { Watcher } from './bots/watcher_ethers.js'
import wallets from "./bots/wallets.js"
import express from "express"
import cors from "cors"
import router from './routes/index.js'
import AppError from "./utils/AppError.js";
import errorHandler from "./utils/errorHandler.js";
import bodyParser from 'body-parser'
const { ALERT_BOT_KEY, 
    CHAT_ID_CHANNEL,
    CHAT_ID_CHANNEL_BETA, 
    CHAT_ID_DISCUSSION, 
    VOLUME_BOT_KEY
 } = process.env;
const app = express();

app.use(bodyParser.json())
app.use(router);

app.use(cors());

app.all("*", (req, res, next) => {
 next(new AppError(`The URL ${req.originalUrl} does not exists`, 404));
});
app.use(errorHandler);
const PORT = 3000;
app.listen(PORT, () => {
 console.log(`server running on port ${PORT}`);
});


const testnetStatus = false
const localNodeIp = "192.168.0.228"
const httpPort = "9535"
const wssPort = "9536"

const httpUrl = `http://${localNodeIp}:${httpPort}`
const wsUrl = `ws://${localNodeIp}:${wssPort}`

const watcher = new Watcher(CHAT_ID_CHANNEL, wallets, ALERT_BOT_KEY, VOLUME_BOT_KEY, testnetStatus, httpUrl, wsUrl);
//watcher.runVolumeCheck(1)