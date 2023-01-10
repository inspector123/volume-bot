import { ethers } from 'ethers';
const apiKey = `3UNWDPMM65ARUPABPKM9MQXEAM3MYAATN6`;

//contracts for log.address filters
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const BUSD = "0x4Fabb145d64652a948d72533023f6E7A623C7C53";
const FRAX = "0x853d955aCEf822Db058eb8505911ED77F175b99e"
const WBTC = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"
const StablesOrEth = [USDC,USDT,DAI,WETH,BUSD, FRAX, WBTC]

//routers
const UniswapV3Router2 = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
const OneInchv5Router = '0x1111111254EEB25477B68fb85Ed929f73A960582'
const KyberSwap = '0x617Dee16B86534a5d792A4d7A62FB491B544111E'
const UniswapV2 = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
const SushiSwapRouter = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"
const KyberSwapInBetweenContract = "0x4Fe5b965E3BD76eFf36280471030ef9b0E6e2C1D"
const RainbowRouter = "0x00000000009726632680FB29d3F7A9734E3010E2"
//check for sushiswap / rainbow swap functions
const OneInchV4Router = "0x1111111254fb6c44bAC0beD2854e76F90643097d"
const ShibaSwap = "0x03f7724180aa6b939894b5ca4314783b0b36b329"
const coinbasewalletProxy0x = "0xe66b31678d6c16e9ebf358268a790b763c133750"
const _0xExchangeProxy = "0xdef1c0ded9bec7f1a1670819833240f027b25eff"
const paraswapAugustus = "0xdef171fe48cf0115b1d80b88dc8eab59176fee57"
const acceptedRouters = [UniswapV2, UniswapV3Router2,OneInchV4Router,OneInchv5Router,KyberSwap, SushiSwapRouter,RainbowRouter, coinbasewalletProxy0x, _0xExchangeProxy, paraswapAugustus]

const bigcapbot1="0xb7fd3575c614d8f2ffd50ce48c199b0aafa2c0bc"
const bigcapbot2="0x63af5004090c15a2df73e9b2a4064801ce70da30"
const botContracts= ["0xa612d7680a249581beDEE885ddCed743E8BCaa9e", "0x27dE7D1dEbaBBE7f63383F9A81793b3f19438321",bigcapbot1, bigcapbot2]

//Pools

const v3DaiUsdt = "0x6f48ECa74B38d2936B02ab603FF4e36A6C0E3A77"
const v3Usdt = "0x11b815efB8f581194ae79006d24E0d814B7697F6"
const v3USDC = "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640"
const v3_DaiUSDCv4 = "0x5777d92f208679DB4b9778590Fa3CAB3aC9e2168"
const v2USDT = "0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852"
const pancakeUSDT = "0x17C1Ae82D99379240059940093762c5e4539aba5"
const pancakeUSDC = "0x2E8135bE71230c6B1B4045696d41C09Db0414226"
const v2USDC = "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc"
const v3DAI_2 = "0x60594a405d53811d3BC4766596EFD80fd545A270"
const sushiswapUSDTv2 = "0x06da0fd433C1A5d7a4faa01111c044910A184553"
const v2USDTDAI = "0xB20bd5D04BE54f870D5C0d3cA85d82b34B836405"
const USDCUSDT = "0x3416cF6C708Da44DB2624D63ea0AAef7113527C6"
const busdETH = "0xC2923b8a9683556A3640ccc2961B2F52B5C4459A"
const disallowedPools = [v3DaiUsdt,v3Usdt,v3USDC, v3_DaiUSDCv4, v2USDT, pancakeUSDT, pancakeUSDC, v2USDC, v3DAI_2, sushiswapUSDTv2, v2USDTDAI, USDCUSDT, busdETH]

const disallowedSymbols = ["BUSD", "USDT", "USDC", "DAI", "WETH"]


//Contracts
const mevBot1 = "0x000000000035b5e5ad9019092c665357240f594e"
const mevBot2 = "0xe8c060f8052e07423f71d445277c61ac5138a2e5"


const disallowedTo = [mevBot1, mevBot2, "0x00000000008c4fb1c916e0c88fd4cc402d935e7d"]

const daiContract = "0x6B175474E89094C44Da98b954EedeAC495271d0F"

const v3topic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Swap(address,address,int256,int256,uint160,uint128,int24)"))
const v2topic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Swap(address,uint256,uint256,uint256,uint256,address)"))
const wstETH = "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0"

const Constants = { daiContract, disallowedPools, disallowedSymbols, disallowedTo, 
    mevBot1, mevBot2, busdETH, USDCUSDT, v2USDTDAI, sushiswapUSDTv2, v3DAI_2, v2USDC, 
    pancakeUSDC, pancakeUSDT, v2USDT, v3_DaiUSDCv4, v3USDC, v3Usdt, v3DaiUsdt,
    KyberSwap, KyberSwapInBetweenContract, USDC, WETH, WBTC, FRAX, BUSD, DAI, USDT,
    acceptedRouters, botContracts, UniswapV3Router2, OneInchV4Router,OneInchv5Router,SushiSwapRouter, UniswapV2, StablesOrEth, apiKey,
    v3topic, v2topic, wstETH
}

export default Constants