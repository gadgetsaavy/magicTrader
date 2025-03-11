const { ethers } = require("ethers");

class LiquidityChecker {
    /**
     * @notice Checks if a DEX has sufficient liquidity for a trade.
     * @param {Object} dex - The DEX contract instance.
     * @param {string} tokenA - The address of the input token.
     * @param {string} tokenB - The address of the output token.
     * @param {ethers.BigNumber} amount - The trade amount.
     * @returns {Promise<boolean>} - Returns true if liquidity is sufficient, false otherwise.
     */
    static async hasSufficientLiquidity(dex, tokenA, tokenB, amount) {
        const [reserveA, reserveB] = await dex.getReserves(tokenA, tokenB);
        return reserveA.gte(amount) && reserveB.gte(amount);
    }

    /**
     * @notice Calculates the impact of a trade on liquidity pools.
     * @param {ethers.BigNumber} amountIn - The amount of tokenA being traded.
     * @param {ethers.BigNumber} reserveIn - The liquidity pool reserve for tokenA.
     * @param {ethers.BigNumber} reserveOut - The liquidity pool reserve for tokenB.
     * @returns {ethers.BigNumber} - The expected price impact.
     */
    static calculateLiquidityImpact(amountIn, reserveIn, reserveOut) {
        if (reserveIn.isZero() || reserveOut.isZero()) {
            throw new Error("Liquidity pool reserves cannot be zero.");
        }

        // Expected price impact formula based on the constant product formula (Uniswap V2)
        const newReserveIn = reserveIn.add(amountIn);
        const newReserveOut = reserveOut.mul(reserveIn).div(newReserveIn);
        const priceImpact = reserveOut.sub(newReserveOut);
        
        return priceImpact;
    }
}

module.exports = LiquidityChecker;
