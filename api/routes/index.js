import express from 'express'
import { getAllSwaps, getBlock,createContractOrGetMatchingContracts, createSwap,deleteContract, createPair, getPairByPairAddress, getAllPairs, getAllContracts, createContracts , getAlertsQuery, customSql, getLookBackQuery_AnyTimeFrame, Web_MainSwapsGroupQuery, getLookBackQuery, getWalletBuys} from '../controllers/queries.js';
const router = express.Router();
//


//swaps table
router.route("/api/swaps").get(getAllSwaps)
    .post(createSwap);
router.route("/api/swaps/:blockNumber")
    .get(getBlock)

router.route("/api/wallets/:contract")
    .post(getWalletBuys)

router.route("/api/swaps")
// //contracts table
// router.route("/api/contracts")
//     .put(updateContract)

//contractDetails table
router.route("/api/contractDetails")
.get(getAllContracts)
.post(createContractOrGetMatchingContracts); //have ?matching to figure out if it's gonna be the one post or the other

// router.route("/api/contractDetails") //?volume5m=...
//     .put(updateContract)

//contracts table

router.route("/api/contracts").post(createContracts);

router.route("/api/contracts").get(getLookBackQuery);

router.route("/api/sql").get(customSql);


//PAIRS

router.route("/api/pairs")
    .get(getAllPairs)
    .post(createPair);

router.route("/api/pairs/:pairAddress")
    .get(getPairByPairAddress)

//Alerts / other (web, etc.)

router.route("/api/alerts").get(getAlertsQuery);
router.route("/api/alerts/percent/any").get(getLookBackQuery_AnyTimeFrame);

router.route("/api/swaps/grouped").get(Web_MainSwapsGroupQuery);


export default router;