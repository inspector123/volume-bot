import { ethers } from 'ethers'

export const toKeccak = (functionString) => {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(functionString));
}