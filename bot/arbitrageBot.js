const { ethers } = require("ethers");
const { FlashbotsBundleProvider } = require("@flashbots/ethers-provider-bundle");
const LiquidityChecker = require("../utils/LiquidityChecker");
const SlippageCalculator = require("../utils/SlippageCalculator");
const GasEstimator = require("../utils/gasEstimator");
const config = require("./config");

class ArbitrageBot {
    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider(config.RPC_URL);
        this.wallet = new ethers.Wallet(config.PRIVATE_KEY, this.provider);
        this.flashbotsProvider = new FlashbotsBundleProvider(
            this.provider,
            this.wallet,
            config.FLASHBOTS_ENDPOINT
        );
        this.contract = new ethers.Contract(
            config.CONTRACT_ADDRESS,
            require("../abi/FlashLoanArbitrage.json"),
            this.wallet
        );
    }

    /**
     * @notice Continuously scans for arbitrage opportunities and executes trades when profitable.
     */
    async scanForOpportunities() {
        console.log("Starting arbitrage scanner...");
        while (true) {
            try {
                const opportunities = await this.findArbitrageOpportunities();
                
                for (const op of opportunities) {
                    if (op.profit.gte(op.minProfit)) {
                        console.log(`Profitable opportunity found: ${ethers.utils.formatEther(op.profit)} ETH`);
                        await this.executeArbitrage(op);
                    }
                }
            } catch (error) {
                console.error("Error scanning for opportunities:", error);
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // Scan every second
        }
    }

    /**
     * @notice Finds arbitrage opportunities across multiple DEXs.
     * @returns {Promise<Array>} - Returns an array of arbitrage opportunities.
     */
    async findArbitrageOpportunities() {
        // Placeholder: Replace this with logic that checks price differences across DEXs
        return [];
    }

    /**
     * @notice Executes arbitrage using Flashbots to prevent MEV front-running.
     * @param {Object} opportunity - The arbitrage opportunity details.
     */
    async executeArbitrage(opportunity) {
        console.log("Verifying trade conditions...");

        const dex = new ethers.Contract(config.DEX_ADDRESS, require("../abi/IDex.json"), this.wallet);
        
        // Ensure sufficient liquidity
        const sufficientLiquidity = await LiquidityChecker.hasSufficientLiquidity(dex, opportunity.tokenIn, opportunity.tokenOut, opportunity.amountIn);
        if (!sufficientLiquidity) {
            console.log("Trade rejected: Insufficient liquidity.");
            return;
        }

        // Calculate slippage impact
        const [reserveA, reserveB] = await dex.getReserves(opportunity.tokenIn, opportunity.tokenOut);
        const slippageImpact = SlippageCalculator.calculateSlippage(reserveA, reserveB, opportunity.amountIn, config.SLIPPAGE_TOLERANCE);
        if (slippageImpact.gt(config.MAX_SLIPPAGE)) {
            console.log("Trade rejected: Slippage too high.");
            return;
        }

        // Estimate gas cost
        const estimatedGasCost = await GasEstimator.estimateGas(
            this.contract.populateTransaction.executeArbitrage(
                opportunity.dexes,
                opportunity.paths,
                opportunity.amountIn,
                opportunity.minProfit
            ),
            this.provider
        );

        // Ensure arbitrage profit is greater than gas cost
        const potentialProfit = opportunity.profit.sub(estimatedGasCost);
        if (potentialProfit.lte(0)) {
            console.log("Trade rejected: Gas cost too high.");
            return;
        }

        console.log(`Executing flash loan arbitrage... Expected Profit: ${ethers.utils.formatEther(potentialProfit)} ETH`);

        const bundle = [
            {
                signer: this.wallet,
                transaction: {
                    to: this.contract.address,
                    data: this.contract.interface.encodeFunctionData("executeArbitrage", [
                        opportunity.dexes,
                        opportunity.paths,
                        opportunity.amountIn,
                        opportunity.minProfit
                    ]),
                    gasPrice: ethers.utils.parseUnits((await this.provider.getGasPrice()).toString(), "gwei")
                }
            }
        ];

        const simulate = await this.flashbotsProvider.simulate(bundle, await this.provider.getBlockNumber() + 1);
        
        if (!simulate.success) {
            console.error(`Simulation failed: ${simulate.error.message}`);
            return;
        }

        const targetBlock = await this.provider.getBlockNumber() + 1;
        const signedBundle = await this.flashbotsProvider.signBundle(bundle);

        try {
            const bundleHash = await this.flashbotsProvider.sendRawBundle(signedBundle, targetBlock);
            await bundleHash.wait();
            console.log("Arbitrage executed successfully:", bundleHash.transactionHash);
        } catch (error) {
            console.error("Failed to execute arbitrage:", error);
        }
    }
}

// Start the bot
const bot = new ArbitrageBot();
bot.scanForOpportunities();
