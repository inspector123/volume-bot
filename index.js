
import * as dotenv from 'dotenv'
import ContractWatcher from './ContractWatcher.js'
import express from "express"
import cors from "cors"
import router from './api/routes/index.js'
import AppError from "./api/utils/AppError.js";
import errorHandler from "./api/utils/errorHandler.js";
import bodyParser from 'body-parser'

dotenv.config();
const {
    CHAT_ID_CHANNEL,
    CHAT_ID_CHANNEL_BETA, 
    CHAT_ID_DISCUSSION, 
    VOLUME_BOT_KEY,
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

const localNodeIp = "192.168.0.228"
const httpPort = "9535"
const wssPort = "9536"

const httpUrl = `http://${localNodeIp}:${httpPort}`
const wsUrl = `ws://${localNodeIp}:${wssPort}`

const watcher = new ContractWatcher(CHAT_ID_CHANNEL_BETA, VOLUME_BOT_KEY, httpUrl, wsUrl);
