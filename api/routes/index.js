import express from 'express'
import { getAllBlocks, getBlock, getAllContracts, createContract, createBlock, getMinBlockNumber, deleteBlock,deleteContract, updateContract, getMatchingContracts } from '../controllers/contract.js';
const router = express.Router();
//


//blocks table
router.route("/api/blocks").get(getAllBlocks)
    .post(createBlock);

router.route("/api/blocks/:blockNumber")
    .get(getBlock)
    .get(getMinBlockNumber)
    .delete(deleteBlock)

//contracts table
router.route("/api/contracts")
    .get(getAllContracts)
    .post(createContract);
router.route("/api/contracts/matching").post(getMatchingContracts);

router.route("/api/contracts/:id")
    .put(updateContract)
    .delete(deleteContract);
export default router;