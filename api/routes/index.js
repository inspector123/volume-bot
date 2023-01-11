import express from 'express'
import { getAllBlocks, getBlock,createContractOrGetMatchingContracts, createBlock,deleteContract, updateContract, getMatchingContracts } from '../controllers/contract.js';
const router = express.Router();
//


//blocks table
router.route("/api/blocks").get(getAllBlocks)
    .post(createBlock);

router.route("/api/blocks/from/:blockNumber")
    .get(getBlock)

// //contracts table
// router.route("/api/contracts")
//     .put(updateContract)

//contracts table
router.route("/api/contracts").post(createContractOrGetMatchingContracts); //have ?matching to figure out if it's gonna be the one post or the other

router.route("/api/contracts/:contract") //?volume5m=...
    .put(updateContract)
    .delete(deleteContract);
export default router;