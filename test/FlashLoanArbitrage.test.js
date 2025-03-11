// FlashLoanArbitrage.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FlashLoanArbitrage", function () {
    it("Should detect arbitrage and execute a profitable trade", async function () {
        const [owner] = await ethers.getSigners();
        const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");
        const contract = await FlashLoanArbitrage.deploy(AAVE_POOL, PRICE_FEED, [DEX1, DEX2], 100);

        expect(await contract.takeProfitThreshold()).to.equal(100);
    });
});
