require('@nomiclabs/hardhat-ethers');
require('dotenv').config();

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log('Deploying contracts with account:', deployer.address);
    
    const FlashLoanArbitrage = await ethers.getContractFactory('FlashLoanArbitrage');
    const flashLoanArbitrage = await FlashLoanArbitrage.deploy();
    
    await flashLoanArbitrage.deployed();
    
    console.log('FlashLoanArbitrage deployed to:', flashLoanArbitrage.address);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
