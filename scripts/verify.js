require('@nomiclabs/hardhat-ethers');
require('dotenv').config();
require('@nomiclabs/hardhat-etherscan');

async function main() {
    const [deployer] = await ethers.getSigners();
    const flashLoanArbitrageAddress = process.env.FLASHLOAN_ARBITRAGE_ADDRESS;
    
    await hre.run('verify:verify', {
        address: flashLoanArbitrageAddress,
        constructorArguments: []
    });
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });