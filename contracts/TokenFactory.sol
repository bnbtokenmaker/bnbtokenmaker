// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {BNBTokenMakerToken} from "./BNBTokenMakerToken.sol";

/// @title TokenFactory
/// @notice Phase 6B factory: creates BNBTokenMakerToken instances via
/// `new` (plain deployment, no proxies, no upgradeability) and transfers
/// nothing to itself — ownership is assigned directly to the deployer's
/// chosen address at construction time.
///
/// FEE BEHAVIOR (Phase 6B, BSC Testnet): strictly fee-free. `createToken` is
/// non-payable, so ANY attached native value reverts automatically. There is
/// no fee recipient, no fee storage, no privileged role, and the factory
/// retains zero control over created tokens (no ownership, no admin keys).
///
/// PRODUCTION MIGRATION PATH (later phase, NOT active now): deploy a new
/// factory contract that adds an immutable fee recipient + immutable fee
/// schedule with a payable `createToken`, keeping this exact creation +
/// ownership pattern. Do NOT retrofit fee state into this contract — a fresh
/// audited factory deployment keeps testnet history clean and reviewable.
contract TokenFactory {
    /// @dev Bit positions for the `features` bitmap in TokenCreated.
    uint256 private constant FLAG_BURN = 1 << 0;
    uint256 private constant FLAG_MINT = 1 << 1;
    uint256 private constant FLAG_PAUSE = 1 << 2;
    uint256 private constant FLAG_MAX_TX = 1 << 3;
    uint256 private constant FLAG_MAX_WALLET = 1 << 4;
    uint256 private constant FLAG_BLACKLIST = 1 << 5;
    uint256 private constant FLAG_WHITELIST = 1 << 6;

    struct TokenParams {
        BNBTokenMakerToken.TokenConfig token;
    }

    event TokenCreated(
        address indexed token,
        address indexed creator,
        address indexed owner,
        string name,
        string symbol,
        uint8 decimals,
        uint256 initialSupply,
        uint256 features
    );

    error OwnerMustBeSender(address owner, address sender);

    /// @notice Deploy a new token owned by `params.owner`.
    /// @dev Structural ownership guarantee: `params.owner` MUST equal
    /// msg.sender, so token.owner() == deployer always holds and the
    /// factory can never divert ownership to itself or a third party.
    function createToken(TokenParams calldata params) external returns (address) {
        BNBTokenMakerToken.TokenConfig memory cfg = params.token;
        if (cfg.owner != msg.sender) {
            revert OwnerMustBeSender(cfg.owner, msg.sender);
        }
        BNBTokenMakerToken token = new BNBTokenMakerToken(cfg);
        address tokenAddress = address(token);

        uint256 features = 0;
        if (cfg.burnable) features |= FLAG_BURN;
        if (cfg.mintable) features |= FLAG_MINT;
        if (cfg.pausable) features |= FLAG_PAUSE;
        if (cfg.maxTxAmount > 0) features |= FLAG_MAX_TX;
        if (cfg.maxWalletAmount > 0) features |= FLAG_MAX_WALLET;
        if (cfg.blacklistEnabled) features |= FLAG_BLACKLIST;
        if (cfg.whitelistEnabled) features |= FLAG_WHITELIST;

        emit TokenCreated(
            tokenAddress,
            msg.sender,
            cfg.owner,
            cfg.name,
            cfg.symbol,
            cfg.decimals,
            cfg.initialSupply,
            features
        );
        return tokenAddress;
    }
}
