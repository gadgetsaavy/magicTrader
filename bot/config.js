require("dotenv").config();

module.exports = {
    RPC_URL: process.env.RPC_URL || "https://mainnet.infura.io/v3/YOUR_INFURA_API_KEY",
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    FLASHBOTS_ENDPOINT: "https://relay.flashbots.net",
    
    CONTRACT_ADDRESS: "0xYourDeployedFlashLoanArbitrageContract",
    DEX_ADDRESS: "0xUniswapOrSushiswapAddress",

    TOKEN_A: "0xTokenA",
    TOKEN_B: "0xTokenB",
    TOKEN_C: "0xTokenC",
    
    TRADE_AMOUNT: ethers.utils.parseUnits("1.0", 18), // Example: 1 ETH
    SLIPPAGE_TOLERANCE: 100, // 1% in basis points
    MAX_SLIPPAGE: ethers.utils.parseUnits("0.005", 18), // 0.5% max slippage
    MIN_PROFIT_THRESHOLD: ethers.utils.parseUnits("0.01", 18) // 0.01 ETH min profit
};