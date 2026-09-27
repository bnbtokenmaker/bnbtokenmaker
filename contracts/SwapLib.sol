// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title SwapLib — external immutable stateless execution library
/// @notice PancakeSwap V2 swap/liquidity execution plus full token-config
/// validation, callable ONLY via DELEGATECALL from generated tokens (direct
/// Solidity library calls, linked at compile time).
///
/// DEPLOYMENT REQUIREMENT (linked library):
///  1. Deploy SwapLib FIRST as a standalone contract.
///  2. Link its address into the token AND factory bytecode at compile time
///     (the factory embeds token creation code, placeholders included).
///  3. Deploy the factory with the linked bytecode.
/// Tokens reference the library address immutably; it can never be replaced
/// for an existing token. A library change requires a new token generation.
///
/// TRUST / DEPENDENCY MODEL (exact):
/// - NO storage: zero state variables; reads no slots, writes none. There is
///   NOTHING to couple to any token's storage layout.
/// - NO owner/admin, NO selfdestruct, NO delegatecall of its own.
/// - NO platform role, NO fee sink, NO LP sink: marketing BNB can only flow
///   to the explicit `marketingWallet` parameter; LP can only be sent to the
///   burn address. BNBTokenMaker never receives value through this library.
/// - `address(this)` under DELEGATECALL is the CALLING TOKEN; every unit of
///   value moved is derived from on-chain balances, never trusted inputs.
/// - Events below are emitted in token context, so logs are attributed to the
///   TOKEN address with identical topics.
interface IPancakeRouter02 {
    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;
    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);
}

interface IPancakePair {
    function getReserves()
        external
        view
        returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
}

interface IERC20like {
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

library SwapLib {
    IPancakeRouter02 private constant ROUTER =
        IPancakeRouter02(0x10ED43C718714eb63d5aA57B78B54704E256024E);
    address private constant WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
    address private constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 private constant SLIPPAGE_BPS = 500; // 5% tolerance on swaps

    error EmptyName();
    error NameTooLong();
    error InvalidSymbol();
    error DecimalsOutOfRange(uint8 decimals);
    error ZeroInitialSupply();
    error MaxWalletBelowMaxTx(uint256 maxWallet, uint256 maxTx);
    error TaxTooHigh();
    error MarketingWalletRequired();
    error BadShares();
    error AutoLiquidityWithoutTax();
    error BadThreshold();
    error SnipeWindowTooLong();
    error MaxSupplyWithoutMint();
    error InitialSupplyExceedsMax(uint256 initialSupply, uint256 maxSupply);
    error SwapQuoteFailed();
    error SwapSendFailed();
    error MarketingSendFailed();
    error ApproveFailed();

    event MarketingPaid(uint256 bnbAmount);
    event LiquidityAdded(uint256 tokenAmount, uint256 bnbAmount, uint256 lpBurned);
    event SwapBackExecuted(uint256 tokensSwapped, uint256 bnbForMarketing, uint256 lpBurned);

    struct SwapArgs {
        address token;
        address marketingWallet;
        uint256 liquidityShareBps;
        uint256 marketingShareBps;
    }

    /// @notice Pure base-config validation (no state). Covers identity,
    /// supply and limit coherence. Called by the token constructor via
    /// DELEGATECALL (smaller token init bytecode than inlining).
    function validateBasicConfig(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 initialSupply,
        uint256 maxTxAmount,
        uint256 maxWalletAmount
    ) external pure {
        uint256 nameLen = bytes(name).length;
        if (nameLen == 0) revert EmptyName();
        if (nameLen > 64) revert NameTooLong();
        bytes memory sym = bytes(symbol);
        uint256 symbolLen = sym.length;
        if (symbolLen == 0 || symbolLen > 11) revert InvalidSymbol();
        for (uint256 i = 0; i < symbolLen; ++i) {
            bytes1 c = sym[i];
            bool ok = (c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x5A);
            if (!ok) revert InvalidSymbol();
        }
        if (decimals > 18) revert DecimalsOutOfRange(decimals);
        if (initialSupply == 0) revert ZeroInitialSupply();
        if (maxWalletAmount > 0 && maxTxAmount > 0) {
            if (maxWalletAmount < maxTxAmount) {
                revert MaxWalletBelowMaxTx(maxWalletAmount, maxTxAmount);
            }
        }
    }

    /// @notice Pure advanced-config validation (no state): lifetime cap,
    /// tax policy, liquidity coherence and launch bounds. Enforcement is
    /// identical whether the token is deployed via the factory or directly:
    /// the token ALWAYS calls this alongside validateBasicConfig.
    function validateAdvancedConfig(
        uint256 buyTaxBps,
        uint256 sellTaxBps,
        address marketingWallet,
        uint256 marketingShareBps,
        uint256 liquidityShareBps,
        bool autoLiquidityEnabled,
        uint256 swapThreshold,
        uint256 initialSupply,
        uint256 snipeBlocks,
        bool mintable,
        uint256 maxSupply
    ) external pure {
        // Lifetime issuance cap (cumulative semantics, immutable in token).
        if (maxSupply > 0) {
            if (!mintable) revert MaxSupplyWithoutMint();
            if (initialSupply > maxSupply) {
                revert InitialSupplyExceedsMax(initialSupply, maxSupply);
            }
        }
        if (buyTaxBps > 1000 || sellTaxBps > 1000) revert TaxTooHigh();
        bool taxOn = buyTaxBps > 0 || sellTaxBps > 0;
        if (taxOn) {
            if (marketingWallet == address(0)) revert MarketingWalletRequired();
            if (marketingShareBps + liquidityShareBps != 10000) revert BadShares();
        }
        if (autoLiquidityEnabled != (liquidityShareBps > 0)) {
            revert AutoLiquidityWithoutTax();
        }
        if (autoLiquidityEnabled) {
            if (!taxOn) revert AutoLiquidityWithoutTax();
            if (
                swapThreshold < initialSupply / 1_000_000 ||
                swapThreshold > initialSupply / 100
            ) revert BadThreshold();
        }
        if (snipeBlocks > 50) revert SnipeWindowTooLong();
    }

    function pairHasLiquidity(address pair) external view returns (bool) {
        if (pair == address(0)) return false;
        try IPancakePair(pair).getReserves() returns (
            uint112 r0,
            uint112 r1,
            uint32
        ) {
            return r0 > 0 && r1 > 0;
        } catch {
            return false;
        }
    }

    /// @notice Executes one full swapBack in the CALLER's (token's) context.
    /// Token accounting (threshold, mutex) stays in the token; every unit of
    /// value here is derived from on-chain balances, never trusted inputs.
    /// Reverts bubble to the token, which catches them per-leg policy so a
    /// swap failure NEVER reverts an ordinary holder transfer.
    function executeSwap(SwapArgs calldata args) external returns (uint256 lpBurned) {
        address token = args.token;
        uint256 balance = IERC20like(token).balanceOf(address(this));
        if (balance == 0) return 0;
        uint256 liquidityTokens = (balance * args.liquidityShareBps) / 10000;
        uint256 marketingTokens = balance - liquidityTokens;

        if (marketingTokens > 0 && args.marketingWallet != address(0)) {
            uint256 bnbBefore = address(this).balance;
            _swapTokensForBNB(token, marketingTokens);
            uint256 received = address(this).balance - bnbBefore;
            if (received > 0) {
                (bool ok, ) = args.marketingWallet.call{value: received}("");
                if (!ok) revert MarketingSendFailed();
                emit MarketingPaid(received);
            }
        }

        if (liquidityTokens > 0) {
            uint256 half = liquidityTokens / 2;
            uint256 otherHalf = liquidityTokens - half;
            if (otherHalf > 0) {
                uint256 bnbBefore = address(this).balance;
                _swapTokensForBNB(token, otherHalf);
                uint256 bnbReceived = address(this).balance - bnbBefore;
                _approveSelf(token, address(ROUTER), half);
                // LP is ALWAYS sent to the burn address: permanently locked,
                // provably no team/Platform withdrawal path exists.
                (,, uint256 liquidity) = ROUTER.addLiquidityETH{value: bnbReceived}(
                    token,
                    half,
                    0,
                    0,
                    BURN_ADDRESS,
                    block.timestamp
                );
                emit LiquidityAdded(half, bnbReceived, liquidity);
                lpBurned = liquidity;
            }
        }
        emit SwapBackExecuted(balance, marketingTokens, liquidityTokens);
    }

    function _swapTokensForBNB(address token, uint256 amount) internal {
        address[] memory path = new address[](2);
        path[0] = token;
        // NOTE: under DELEGATECALL, address(this) is the TOKEN, but the swap
        // input is the explicit `token` parameter (identical in production).
        path[1] = WBNB;
        _approveSelf(token, address(ROUTER), amount);
        uint256 minOut;
        try ROUTER.getAmountsOut(amount, path) returns (uint256[] memory quoted) {
            minOut = (quoted[1] * (10000 - SLIPPAGE_BPS)) / 10000;
        } catch {
            revert SwapQuoteFailed();
        }
        try
            ROUTER.swapExactTokensForETHSupportingFeeOnTransferTokens(
                amount,
                minOut,
                path,
                address(this),
                block.timestamp
            )
        {} catch {
            revert SwapSendFailed();
        }
    }

    /// @dev Tolerates non-standard ERC20 approve (missing returndata).
    function _approveSelf(address token, address spender, uint256 amount) internal {
        (bool ok, bytes memory ret) =
            token.call(abi.encodeCall(IERC20like.approve, (spender, amount)));
        if (!ok || (ret.length == 32 && !abi.decode(ret, (bool)))) {
            revert ApproveFailed();
        }
    }
}
