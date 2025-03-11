const { ethers } = require('ethers');

class GasEstimator {
    static async estimateGas(contract, method, args) {
        const gasLimit = await contract.estimateGas[method](...args);
        const gasPrice = await contract.provider.getGasPrice();
        const estimatedCost = gasLimit.mul(gasPrice);
        
        return {
            gasLimit: gasLimit.toString(),
            gasPrice: gasPrice.toString(),
            estimatedCost: estimatedCost.toString()
        };
    }

    static async calculateProfitAfterGas(profit, gasCost) {
        return profit.sub(gasCost);
    }
}

module.exports = GasEstimator;

const { ethers } = require("ethers");

class GasEstimator {
    /**
     * @notice Estimates gas cost for a given transaction
     * @param {Object} transaction - The unsigned transaction object.
     * @param {Object} provider - Ethers.js provider instance.
     * @returns {Promise<ethers.BigNumber>} - Estimated gas cost in WEI.
     */
    static async estimateGas(transaction, provider) {
        try {
            const gasEstimate = await provider.estimateGas(transaction);
            const gasPrice = await provider.getGasPrice();
            return gasEstimate.mul(gasPrice);
        } catch (error) {
            console.error("Gas estimation failed:", error);
            return ethers.BigNumber.from("0");
        }
    }
}

module.exports = GasEstimator;
