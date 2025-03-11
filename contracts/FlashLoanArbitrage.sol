// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IPriceFeed {
    function getLatestPrice(address token) external view returns (uint256);
}

interface IDex {
    function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256);
    function swap(address tokenIn, address tokenOut, uint256 amountIn) external returns (uint256);
    function getReserves(address tokenA, address tokenB) external view returns (uint256 reserveA, uint256 reserveB);
}

contract FlashLoanArbitrage is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address private immutable aavePool;
    address private owner;
    IPriceFeed private priceFeed;
    IDex[] private dexes;
    uint256 private takeProfitThreshold;
    uint256 private slippageTolerance = 50; // 0.5% max slippage allowed

    event ArbitrageOpportunity(string strategy, uint256 profit);
    event FlashLoanRequested(address asset, uint256 amount);
    event ArbitrageExecuted(string strategy, uint256 profit);
    event ProfitWithdrawn(address token, uint256 amount);

    constructor(address _aavePool, address _priceFeed, address[] memory _dexes, uint256 _takeProfitThreshold) {
        aavePool = _aavePool;
        priceFeed = IPriceFeed(_priceFeed);
        takeProfitThreshold = _takeProfitThreshold;
        owner = msg.sender;

        for (uint256 i = 0; i < _dexes.length; i++) {
            dexes.push(IDex(_dexes[i]));
        }
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Unauthorized");
        _;
    }

    /**
     * @notice Scans multiple DEXs for profitable arbitrage opportunities.
     * @dev Compares asset prices and checks profitability before executing.
     */

    function scanForArbitrage(address tokenA, address tokenB, address tokenC) external view returns (bool, uint256, string memory, IDex, IDex) {
        uint256 priceA = priceFeed.getLatestPrice(tokenA);
        uint256 priceB = priceFeed.getLatestPrice(tokenB);
        uint256 priceC = priceFeed.getLatestPrice(tokenC);

        uint256 bestProfit = 0;
        string memory bestStrategy = "None";
        IDex bestDex1;
        IDex bestDex2;

        for (uint256 i = 0; i < dexes.length; i++) {
            for (uint256 j = 0; j < dexes.length; j++) {
                if (i == j) continue;

                uint256 estimatedFees = estimateFees(tokenA, tokenB, tokenC);
                uint256 profitTriangular = (priceC - priceA) - estimatedFees;
                uint256 profitCrossExchange = (priceB - priceA) - estimatedFees;

                if (profitTriangular > bestProfit && profitTriangular > takeProfitThreshold) {
                    bestProfit = profitTriangular;
                    bestStrategy = "Triangular";
                    bestDex1 = dexes[i];
                    bestDex2 = dexes[j];
                } else if (profitCrossExchange > bestProfit && profitCrossExchange > takeProfitThreshold) {
                    bestProfit = profitCrossExchange;
                    bestStrategy = "CrossExchange";
                    bestDex1 = dexes[i];
                    bestDex2 = dexes[j];
                }
            }
        }

        if (bestProfit > 0) {
            emit ArbitrageOpportunity(bestStrategy, bestProfit);
        }

        return (bestProfit > 0, bestProfit, bestStrategy, bestDex1, bestDex2);
    }

    /**
     * @notice Executes a flash loan if an off-chain bot detects a profitable arbitrage.
     */

    function executeFlashLoan(address token, uint256 amount, address tokenB, address tokenC) external onlyOwner {
        (bool profitable, , string memory strategy, IDex bestDex1, IDex bestDex2) = scanForArbitrage(token, tokenB, tokenC);
        require(profitable, "NoProf");

        emit FlashLoanRequested(token, amount);

        address;
        assets[0] = token;

        uint256;
        amounts[0] = amount;

        uint256;
        modes[0] = 0;

        IPool(aavePool).flashLoan(
            address(this),
            assets,
            amounts,
            modes,
            address(this),
            abi.encode(strategy, tokenB, tokenC, bestDex1, bestDex2),
            0
        );
    }

    /**
     * @notice Callback function executed after receiving flash loan.
     */

    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        require(msg.sender == aavePool, "Unauthorized");
        require(initiator == address(this), "Unauthorized initiator");

        (string memory strategy, address tokenB, address tokenC, IDex bestDex1, IDex bestDex2) = abi.decode(params, (string, address, address, IDex, IDex));

        if (keccak256(bytes(strategy)) == keccak256(bytes("Triangular"))) {
        
        function performTriangularArbitrage(address tokenA, uint256 amount, address tokenB, address tokenC, IDex bestDex1) internal {
            uint256 amountB = bestDex1.swap(tokenA, tokenB, amount);
            require(amountB > 0, "Swap 1 failed");

            uint256 amountC = bestDex1.swap(tokenB, tokenC, amountB);
            require(amountC > 0, "Swap 2 failed");

            uint256 finalAmount = bestDex1.swap(tokenC, tokenA, amountC);
            require(finalAmount > 0, "Swap 3 failed");

            require(finalAmount >= amount + takeProfitThreshold, "Arbitrage not profitable");
}
        } else {
        
        function performCrossExchangeArbitrage(address tokenA, uint256 amount, address tokenB, IDex bestDex1, IDex bestDex2) internal {
            uint256 amountB = bestDex1.swap(tokenA, tokenB, amount);
            require(amountB > 0, "DEX1 swap failed");

            uint256 amountA = bestDex2.swap(tokenB, tokenA, amountB);
            require(amountA > 0, "DEX2 swap failed");

            require(amountA >= amount + takeProfitThreshold, "Arbitrage not profitable");
}
        }

        uint256 amountOwed = amounts[0] + premiums[0];
        IERC20(assets[0]).approve(aavePool, amountOwed);

        return true;
    }

    /**
     * @notice Ensures flash loan repayment before completing execution.
     */

    function ensureFlashLoanRepayment(address asset, uint256 amountOwed) internal {
        uint256 balance = IERC20(asset).balanceOf(address(this));
        require(balance >= amountOwed, "NoLoanFunds");
    }

    /**
     * @notice Estimates fees and gas costs.
     */

    function estimateFees(address tokenA, address tokenB, address tokenC) internal view returns (uint256) {
        uint256 gasUsed = 500_000; // Estimate gas used in execution
        uint256 gasCost = tx.gasprice * gasUsed; // Calculate gas fee in WEI

        uint256 dexSwapFee = 3; // Assume 0.3% DEX swap fee (Uniswap, Sushi, etc.)
        uint256 flashLoanFee = 9; // Assume 0.09% Aave flash loan fee

        // Fees based on trade amount (assuming 3 trades for triangular arbitrage)
        uint256 estimatedTradeFees = (dexSwapFee * 3) + flashLoanFee;
    
        return gasCost + estimatedTradeFees;
}

}

pragma solidity ^0.8.0;

contract FlashLoanArbitrage {
    address private immutable OWNER;
    mapping(address => bool) public authorizedAddresses;
    
    modifier onlyOwner() {
        require(msg.sender == OWNER, "Not owner");
        _;
    }
    
    modifier onlyAuthorized() {
        require(authorizedAddresses[msg.sender], "Not authorized");
        _;
    }
    
    constructor() {
        OWNER = msg.sender;
        authorizedAddresses[msg.sender] = true;
    }
    
    function executeArbitrage(
        address[] memory dexes,
        address[] memory paths,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyAuthorized returns (uint256 profit) {
        // Implementation of arbitrage logic
        // This is simplified for demonstration
        // In production, implement proper slippage checks and error handling
        
        uint256 initialBalance = IERC20(paths[paths.length - 1]).balanceOf(address(this));
        
        for (uint256 i = 0; i < dexes.length; i++) {
            IDex(dexes[i]).swapExactTokensForTokens(
                amountIn,
                0,
                paths,
                address(this),
                block.timestamp + 15 minutes
            );
            
            if (i < paths.length - 1) {
                amountIn = IERC20(paths[i]).balanceOf(address(this));
            }
        }
        
        uint256 finalBalance = IERC20(paths[paths.length - 1]).balanceOf(address(this));
        profit = finalBalance - initialBalance;
        
        require(profit >= minProfit, "Insufficient profit");
        
        emit ProfitMade(msg.sender, profit);
    }
    
    event ProfitMade(address indexed executor, uint256 profit);