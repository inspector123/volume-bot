import express from 'express'
import { getAllSwaps, getBlock,createContractOrGetMatchingContracts, createSwap,deleteContract, createPair, getPairByPairAddress, getAllPairs } from '../controllers/queries.js';
const router = express.Router();
//


//swaps table
router.route("/api/swaps").get(getAllSwaps)
    .post(createSwap);
router.route("/api/swaps/:blockNumber")
    .get(getBlock)
// //contracts table
// router.route("/api/contracts")
//     .put(updateContract)

//contracts table
router.route("/api/contractDetails").post(createContractOrGetMatchingContracts); //have ?matching to figure out if it's gonna be the one post or the other

// router.route("/api/contractDetails") //?volume5m=...
//     .put(updateContract)


//PAIRS

router.route("/api/pairs")
    .get(getAllPairs)
    .post(createPair);

router.route("/api/pairs/:pairAddress")
    .get(getPairByPairAddress)
export default router;