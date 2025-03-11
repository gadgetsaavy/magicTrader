// hardhat.config.js
require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-etherscan');

module.exports = {
    networks: {
        mainnet: {
            url: process.env.MAINNET_RPC_URL,
            accounts: [process.env.DEPLOYER_PRIVATE_KEY]
        },
        testnet: {
            url: process.env.TESTNET_RPC_URL,
            accounts: [process.env.DEPLOYER_PRIVATE_KEY]
        }
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY
    }
};
