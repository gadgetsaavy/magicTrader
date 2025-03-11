class SlippageCalculator {
    static calculateSlippage(currentPrice, targetPrice, slippagePercentage) {
        const maxSlippage = currentPrice.mul(slippagePercentage).div(100);
        return targetPrice.add(maxSlippage);
    }

    static calculateExpectedAmount(amountIn, reserveIn, reserveOut, fee) {
        const amountInWithFee = amountIn.mul(ethers.utils.parseEther('1').sub(fee));
        const numerator = amountInWithFee.mul(reserveOut);
        const denominator = reserveIn.add(amountInWithFee);
        return numerator.div(denominator);
    }
}

module.exports = SlippageCalculator;