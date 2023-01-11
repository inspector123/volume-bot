import express from 'express'
import { getAllBlocks, getBlock, getAllContracts, createContract, deleteContract, updateContract, getMatchingContracts } from '../controllers/contract.js';
const router = express.Router();
//


//blocks table
router.route("/api/blocks").get(getAllBlocks)

router.route("/api/blocks/from/:blockNumber")
    .get(getBlock)

//contracts table
router.route("/api/contracts")
    .get(getAllContracts)
    .post(createContract);
router.route("/api/contracts/matching").post(getMatchingContracts);

router.route("/api/contracts/:id")
    .put(updateContract)
    .delete(deleteContract);
export default router;