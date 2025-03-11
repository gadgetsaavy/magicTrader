const { ethers } = require("ethers");
const { FlashbotsBundleProvider } = require("@flashbots/ethers-provider-bundle");
const config = require("./config");

class FlashbotsExecutor {
    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider(config.RPC_URL);
        this.wallet = new ethers.Wallet(config.PRIVATE_KEY, this.provider);
        this.flashbotsProvider = null;
        this.currentBlock = null;
        this.nextBlock = null;
        this.bundleHashes = new Set();
    }

    /**
     * @notice Initializes the Flashbots provider and block tracking.
     */
    async initialize() {
        if (!this.flashbotsProvider) {
            this.flashbotsProvider = await FlashbotsBundleProvider.create(
                this.provider, 
                this.wallet, 
                config.FLASHBOTS_ENDPOINT
            );
        }

        this.currentBlock = await this.provider.getBlockNumber();
        this.nextBlock = this.currentBlock + 1;
        console.log(`Flashbots Executor initialized for block ${this.nextBlock}`);
    }

    /**
     * @notice Creates and signs a Flashbots transaction bundle.
     * @param {Array} transactions - Array of transactions to include in the bundle.
     * @returns {Promise<Array>} - Returns the signed bundle.
     */
    async createBundle(transactions) {
        const bundle = transactions.map(tx => ({
            signer: this.wallet,
            transaction: tx,
        }));

        return await this.flashbotsProvider.signBundle(bundle);
    }

    /**
     * @notice Simulates the execution of a Flashbots bundle.
     * @param {Array} signedBundle - The signed bundle.
     * @param {number} targetBlock - The target block for execution.
     * @returns {Promise<Object>} - Returns the simulation result.
     */
    async simulateBundle(signedBundle, targetBlock) {
        try {
            const simulation = await this.flashbotsProvider.simulate(signedBundle, targetBlock);

            if (!simulation.success) {
                console.error(`Simulation failed: ${simulation.error.message}`);
                return { success: false };
            }

            console.log(`Simulation successful! Gas used: ${simulation.results[0].gasUsed.toString()}`);
            return {
                success: true,
                gasUsed: simulation.results[0].gasUsed,
                coinbaseDiff: simulation.coinbaseDiff
            };
        } catch (error) {
            console.error("Simulation error:", error);
            return { success: false };
        }
    }

    /**
     * @notice Sends a Flashbots bundle to the relay.
     * @param {Array} signedBundle - The signed bundle.
     * @param {number} targetBlock - The block to execute on.
     * @returns {Promise<Object>} - Returns execution result.
     */
    async submitBundle(signedBundle, targetBlock) {
        try {
            const bundleSubmission = await this.flashbotsProvider.sendBundle(signedBundle, targetBlock);
            this.bundleHashes.add(bundleSubmission.bundleHash);

            console.log(`Bundle submitted for block ${targetBlock}: ${bundleSubmission.bundleHash}`);

            const bundleReceipt = await bundleSubmission.wait();
            if (bundleReceipt === null) {
                console.log("Bundle not included in this block.");
                return { success: false };
            }

            console.log("Bundle executed successfully!");
            return {
                success: true,
                hash: bundleReceipt.transactionHash,
                blockNumber: targetBlock
            };
        } catch (error) {
            console.error("Error submitting bundle:", error);
            return { success: false };
        }
    }

    /**
     * @notice Executes a single transaction using Flashbots.
     * @param {Object} tx - The transaction object.
     * @returns {Promise<Object>} - Returns execution result.
     */
    async executeTransaction(tx) {
        await this.initialize();

        const signedBundle = await this.createBundle([tx]);
        const simulation = await this.simulateBundle(signedBundle, this.nextBlock);

        if (!simulation.success) {
            console.error("Bundle simulation failed, skipping execution.");
            return { success: false };
        }

        return await this.submitBundle(signedBundle, this.nextBlock);
    }
}

module.exports = FlashbotsExecutor;