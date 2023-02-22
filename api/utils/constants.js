import { ethers } from 'ethers';
import { toKeccak } from './functions.js';
const apiKey = `3UNWDPMM65ARUPABPKM9MQXEAM3MYAATN6`;
//additional stables
//contracts for log.address filters
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const BUSD = "0x4Fabb145d64652a948d72533023f6E7A623C7C53";
const FRAX = "0x853d955aCEf822Db058eb8505911ED77F175b99e"
const WBTC = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"
const agEUR = "0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8";

const USDCContractDetails = {
    totalSupply: "40141184377829550",
    decimals: 6,
    symbol: 'USDC',
}
const USDTContractDetails = {
    totalSupply: "40141184377829550",
    decimals: 6,
    symbol: 'USDT'
}
const DAIContractDetails = {
    totalSupply: "5113517488541729170531289814",
    decimals: 18,
    symbol: 'DAI'
}
const WETHContractDetails = {
    totalSupply: "3807574587060924114280837",
    decimals: 18,
    symbol: 'WETH'
}

//routers
const UniswapUniversalRouter = "0xEf1c6E67703c7BD7107eed8303Fbe6EC2554BF6B"
const UniswapV3Router2 = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
const OneInchv5Router = '0x1111111254EEB25477B68fb85Ed929f73A960582'
const KyberSwap = '0x617Dee16B86534a5d792A4d7A62FB491B544111E'
const UniswapV2 = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
const SushiSwapRouter = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"
const KyberSwapInBetweenContract = "0x4Fe5b965E3BD76eFf36280471030ef9b0E6e2C1D"
const RainbowRouter = "0x00000000009726632680FB29d3F7A9734E3010E2"
//check for sushiswap / rainbow swap functions
const OneInchV4Router = "0x1111111254fb6c44bAC0beD2854e76F90643097d"
const ShibaSwap = "0x03f7724180AA6b939894B5Ca4314783B0b36b329"
const coinbasewalletProxy0x = "0xe66B31678d6C16E9ebf358268a790B763C133750"
const _0xExchangeProxy = "0xDef1C0ded9bec7F1a1670819833240f027b25EfF"
const paraswapAugustus = "0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57"
const UniswapV3 = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
const MetamaskSwap = "0x881D40237659C251811CEC9c364ef91dC08D300C"
const acceptedRouters = [MetamaskSwap,UniswapV3, UniswapV2, UniswapV3Router2,OneInchV4Router,OneInchv5Router,KyberSwap, SushiSwapRouter,RainbowRouter, coinbasewalletProxy0x, _0xExchangeProxy, paraswapAugustus, UniswapUniversalRouter, ShibaSwap]

const bigcapbot1="0xb7fd3575c614d8f2ffd50ce48c199b0aafa2c0bc"
const bigcapbot2="0x63af5004090c15a2df73e9b2a4064801ce70da30"
const botContracts= ["0xa612d7680a249581beDEE885ddCed743E8BCaa9e", "0x27dE7D1dEbaBBE7f63383F9A81793b3f19438321",bigcapbot1, bigcapbot2]

const veryBankingContract = "0xCFe4EB08e33272d98cb31e37A7BE78d5C1b740c1"
const dForceContract = "0x431ad2ff6a9C365805eBaD47Ee021148d6f7DBe0";

const bytes32Contracts = [veryBankingContract, dForceContract, "0x9469D013805bFfB7D3DEBe5E7839237e535ec483", "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2"]

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

const univ3Factory = "0x1F98431c8aD98523631AE4a59f267346ea31F984"


//TOPICS

const UniV3PoolCreatedTopic = toKeccak("PoolCreated(address,address,uint24,int24,address)")
const UniV2PairCreatedTopic = toKeccak("PairCreated(address,address,address,uint256)")
const univ2Factory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"

const topics = [UniV3PoolCreatedTopic, UniV2PairCreatedTopic, v3topic, v2topic ]


const addZeros = "0x000000000000000000000000"

const stablesOrEthAdditional = 
["0xBC6DA0FE9aD5f3b0d58160288917AA56653660E9",
"0xD01ef7C0A5d8c432fc2d1a85c66cF2327362E5C6",
"0xE95A203B1a91a908F9B9CE46459d101078c2c3cb",
"0xb7135877cd5D40AA3b086ac6f21c51bbAfbBB41F",
"0xB9D7DdDca9a4AC480991865EfEf82E01273F79C3",
"0xe32a2149d771B2a2E94944D115d299001b90DBde",
"0xBe9895146f7AF43049ca1c1AE358B0541Ea49704",
"0xfd3c65028978693fC3f70628DF2753b7F9b278c8",
"0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5",
"0x49D72e3973900A195A155a46441F0C08179FdB64",
"0x39AA39c021dfbaE8faC545936693aC917d5E7563",
"0x5BC25f649fc4e26069dDF4cF4010F9f706c23831",
"0xAa6E8127831c9DE45ae56bB1b0d4D4Da6e5665BD",
"0xB023dc813B3c081A8a7C522dC3Ef824D507de30C",
"0xFd09911130e6930Bf87F2B0554c44F400bD80D3e",
"0xFD957F21bd95E723645C07C48a2d8ACB8Ffb3794",
"0x8dB1D28Ee0d822367aF8d220C0dc7cB6fe9DC442",
"0x0d31DF7dedd78649A14aAe62D99CcB23aBCC3A5A",
"0xEeEeeeeEe2aF8D0e1940679860398308e0eF24d6",
"0x5E8422345238F34275888049021821E8E08CAa1f",
"0x9d1089802eE608BA84C5c98211afE5f37F96B36C",
"0xADc234a4e90E2045f353F5d4fCdE66144d23b458",
"0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd",
"0xdF574c24545E5FfEcb9a659c229253D4111d87e1",
"0x7C07F7aBe10CE8e33DC6C5aD68FE033085256A84",
"0xa1e72267084192Db7387c8CC1328fadE470e4149",
"0x5f98805A4E8be255a32880FDeC7F6728C6568bA0",
"0xab5eB14c09D416F0aC63661E57EDB7AEcDb9BEfA",
"0xe2f2a5C287993345a840Db3B0845fbC70f5935a5",
"0x3564ad35b9E95340E5Ace2D6251dbfC76098669B",
"0xd060e5Ff03449CB4d3504C539412d9fe5395a78C",
"0x2A8e1E676Ec238d8A992307B495b45B3fEAa5e86",
"0x29Bad0a48122e2f8989fe4B20e215FE7F4Dc45bb",
"0x93d3296cac208422BF587c3597D116e809870f2b",
"0xae78736Cd615f374D3085123A210448E74Fc6393",
"0xF9A2D7E60a3297E513317AD1d7Ce101CC4C6C8F6",
"0x5e74C9036fb86BD7eCdcb084a0673EFc32eA31cb",
"0xFe2e637202056d30016725477c5da089Ab0A043A",
"0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
"0x57Ab1ec28D129707052df4dF418D58a2D46d5f51",
"0xA991356d261fbaF194463aF6DF8f0464F8f1c742",
"0x0000000000085d4780B73119b644AE5ecd22b376",
"0x4fB2932F1a9dE0Ae753a9279703697Bc18f4E0c2",
"0x9a1997C130f4b2997166975D9AFf92797d5134c2",
"0x5dD9c8b1037DEEe7f3D13d5e561Ea334D4eF12b8",
"0x7E936A7db0EcBB58630a1815e1c329D0E223EA57",
"0x0C10bF8FcB7Bf5412187A595ab97a3609160b5c6",
"0xbbAec992fc2d637151dAF40451f160bF85f3C8C1",
"0x674C6Ad92Fd080e4004b2312b45f796a192D27a0",
"0x8E870D67F660D95d5be530380D0eC0bd388289E1",
"0xA4Bdb11dc0a2bEC88d24A3aa1E6Bb17201112eBe",
"0x632F2894CB421d0B09a9aE361A5dB3f0163FCE2D",
"0x4577940b7CB25D26a9D978D5CD7CeA67e1A7C25A",
"0x2F6081E3552b1c86cE4479B80062A1ddA8EF23E3",
"0xc62C17C942e7AF214c6c39993fC0612E0fe8D0CA",
"0x0fc6C0465C9739d4a42dAca22eB3b2CB0Eb9937A",
"0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
"0xc7D9c108D4E1dD1484D3e2568d7f74bfD763d356",
"0x1c9BA9144505aaBa12f4b126Fda9807150b88f80",
"0xA1F7C9c6d19e2D0BF20729CB0BF03338A90bEd9b",
"0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8",
"0x5dbcF33D8c2E976c6b560249878e6F1491Bca25c"]




const StablesOrEth = [USDC,USDT,DAI,WETH,BUSD, FRAX, WBTC, agEUR, ...stablesOrEthAdditional]
const Constants = { addZeros, univ3Factory, univ2Factory, topics, daiContract, disallowedPools, disallowedSymbols, disallowedTo, 
    mevBot1, mevBot2, busdETH, USDCUSDT, v2USDTDAI, sushiswapUSDTv2, v3DAI_2, v2USDC, 
    pancakeUSDC, pancakeUSDT, v2USDT, v3_DaiUSDCv4, v3USDC, v3Usdt, v3DaiUsdt,
    KyberSwap, KyberSwapInBetweenContract, USDC, WETH, WBTC, FRAX, BUSD, DAI, USDT, agEUR,
    acceptedRouters, botContracts, UniswapV3Router2, OneInchV4Router,OneInchv5Router,SushiSwapRouter, UniswapV2, StablesOrEth, apiKey,
    v3topic, v2topic, wstETH, WETHContractDetails, USDTContractDetails, USDCContractDetails, DAIContractDetails, veryBankingContract, bytes32Contracts
}

export default Constants