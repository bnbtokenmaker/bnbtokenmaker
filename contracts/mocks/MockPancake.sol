// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @dev TEST ONLY — never deployed to any chain by the factory or app.
/// Mock PancakeSwap V2 router, etched at the canonical router address in
/// Hardhat tests via `hardhat_setCode` so the REAL SwapLib code path
/// executes 1:1 swaps against deterministic behavior.
interface IERC20pull {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract MockPancakeRouter {
    uint256 public swapCalls;
    uint256 public addLiquidityCalls;
    address public lastAddLiquidityTo;
    address public lastAddLiquidityToken;
    uint256 public lastAddLiquidityTokenAmount;
    uint256 public lastAddLiquidityBNB;
    bool public failSwaps;

    /// @dev Accepts test funding after hardhat_setCode etching.
    receive() external payable {}

    function setFailSwaps(bool fail) external {
        failSwaps = fail;
    }

    function getAmountsOut(uint256 amountIn, address[] calldata)
        external
        pure
        returns (uint256[] memory amounts)
    {
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountIn; // 1:1 quote (token units == wei units in tests)
    }

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256
    ) external {
        if (failSwaps) revert("MOCK_SWAP_FAIL");
        require(amountIn >= amountOutMin, "MOCK_SLIPPAGE");
        IERC20pull(path[0]).transferFrom(msg.sender, address(this), amountIn);
        (bool ok, ) = to.call{value: amountIn}("");
        require(ok, "MOCK_BNB_SEND");
        swapCalls += 1;
    }

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256,
        uint256,
        address to,
        uint256
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
        // Mirror the real router: pull the token leg via transferFrom
        // (allowance was set by the token before the call).
        IERC20pull(token).transferFrom(msg.sender, address(this), amountTokenDesired);
        lastAddLiquidityToken = token;
        lastAddLiquidityTokenAmount = amountTokenDesired;
        lastAddLiquidityBNB = msg.value;
        lastAddLiquidityTo = to;
        addLiquidityCalls += 1;
        return (amountTokenDesired, msg.value, msg.value);
    }
}

/// @dev TEST ONLY — executes two token transfers atomically in ONE
/// transaction so same-block cooldown behavior is deterministic (no miner
/// games: both legs share block.number by construction).
interface IERC20transfer {
    function transfer(address to, uint256 value) external returns (bool);
}

contract BatchBuyer {
    function singleBuy(address token, address to, uint256 amount) external {
        IERC20transfer(token).transfer(to, amount);
    }

    function doubleBuy(address token, address to, uint256 amount) external {
        IERC20transfer(token).transfer(to, amount);
        IERC20transfer(token).transfer(to, amount);
    }
}

/// @dev TEST ONLY — rejects plain BNB transfers (failing marketing wallet).
contract RejectBNB {
    receive() external payable {
        revert("MOCK_NO_BNB");
    }
}

/// @dev TEST ONLY — minimal pair with programmable reserves for
/// pairHasLiquidity / threshold-path tests.
contract MockPancakePair {
    uint112 private _r0;
    uint112 private _r1;

    constructor(uint112 r0, uint112 r1) {
        _r0 = r0;
        _r1 = r1;
    }

    function getReserves()
        external
        view
        returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)
    {
        return (_r0, _r1, 0);
    }
}
