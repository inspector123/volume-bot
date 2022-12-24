import express from 'express'
import { getAllBlocks, getBlock, getAllContracts, createContracts, deleteContract, updateContract } from '../controllers/contract.js';
const router = express.Router();
//


//blocks table
router.route("/api/blocks").get(getAllBlocks)

router.route("/api/blocks/:blockNumber")
    .get(getBlock)

//contracts table
router.route("/api/contracts")
    .get(getAllContracts)
    .post(createContracts);

router.route("/api/contracts/:id")
    .put(updateContract)
    .delete(deleteContract);
export default router;