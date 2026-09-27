// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {BNBTokenMakerToken} from "./BNBTokenMakerToken.sol";

/// @title TokenFactory — EIP-712 quoted deployment factory
/// @notice Creates BNBTokenMakerToken instances against server-signed
/// deployment quotes. Ordinary price/campaign changes need NO on-chain
/// transaction and NO new factory: the server just signs a different feeWei.
/// The user cannot underpay (the factory verifies the signature over the
/// EXACT config hash and requires msg.value == signed feeWei); the server
/// cannot overcharge beyond the immutable MAX_FEE_WEI cap (the wallet UI
/// shows msg.value before signing).
///
/// AUTHORITY LIMITS (structural):
/// - Factory ownership covers signer rotation + ownership lifecycle ONLY.
/// - Factory owner, quote signer and fee recipient have ZERO authority over
///   generated tokens: the factory holds no reference, no role and no
///   upgrade path over them. Token owner is ALWAYS msg.sender by construction.
contract TokenFactory is Ownable, EIP712 {
    /// @notice Non-privileged provenance. Informational only.
    string public constant GENERATOR = "BNBTokenMaker.com";

    /// @notice Platform treasury. Immutable: fee flow is transparent forever.
    address public immutable feeRecipient;
    /// @notice Hard ceiling for any single deployment fee. Immutable:
    /// a compromised server key can never overcharge beyond this.
    uint256 public immutable MAX_FEE_WEI;

    /// @notice Current quote signer (platform backend key). Rotatable by the
    /// factory owner after a suspected compromise; old quotes fail closed.
    /// Read via SignerUpdated events or eth_call; no public getter is needed.
    address private _signer;
    mapping(bytes32 => bool) private _usedNonces;

    // ---- feature bitmap (extends the Phase 6B bits 0-6) ----
    uint256 private constant FLAG_BURN = 1 << 0;
    uint256 private constant FLAG_MINT = 1 << 1;
    uint256 private constant FLAG_PAUSE = 1 << 2;
    uint256 private constant FLAG_MAX_TX = 1 << 3;
    uint256 private constant FLAG_MAX_WALLET = 1 << 4;
    uint256 private constant FLAG_BLACKLIST = 1 << 5;
    uint256 private constant FLAG_WHITELIST = 1 << 6;
    uint256 private constant FLAG_TRADING = 1 << 7;
    uint256 private constant FLAG_ANTIBOT = 1 << 8;
    uint256 private constant FLAG_AUTOLIQ = 1 << 9;

    struct TokenParams {
        BNBTokenMakerToken.TokenConfig token;
    }

    /// @notice Server-authoritative deployment quote. Binds the EXACT token
    /// config hash, fee, chain, factory, nonce and expiry together.
    struct DeployQuote {
        bytes32 configHash;
        uint256 feeWei;
        uint256 chainId;
        address factory;
        bytes32 nonce;
        uint256 expiry;
        bytes32 pricingVersion;
    }

    bytes32 private constant QUOTE_TYPEHASH =
        keccak256(
            "DeployQuote(bytes32 configHash,uint256 feeWei,uint256 chainId,address factory,bytes32 nonce,uint256 expiry,bytes32 pricingVersion)"
        );

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
    event DeploymentPaid(
        address indexed token,
        address indexed payer,
        uint256 feeWei,
        bytes32 pricingVersion,
        bytes32 indexed nonce
    );
    event SignerUpdated(address indexed signer);

    error OwnerMustBeSender(address owner, address sender);
    error ZeroRecipient();
    error ZeroSigner();
    error QuoteExpired(uint256 expiry);
    error QuoteReplayed(bytes32 nonce);
    error WrongChain(uint256 expected);
    error WrongFactory(address expected);
    error FeeExceedsCap(uint256 feeWei, uint256 maxFeeWei);
    error FeeMismatch(uint256 paid, uint256 quoted);
    error ConfigMismatch();
    error BadQuoteSigner();
    error FeeForwardFailed();

    constructor(
        address recipient,
        address initialSigner,
        uint256 maxFeeWei
    ) EIP712("BNBTokenMaker", "1") Ownable(msg.sender) {
        if (recipient == address(0)) revert ZeroRecipient();
        if (initialSigner == address(0)) revert ZeroSigner();
        feeRecipient = recipient;
        _signer = initialSigner;
        MAX_FEE_WEI = maxFeeWei;
        emit SignerUpdated(initialSigner);
    }

    /// @notice Rotate the quote signer after a suspected server-key
    /// compromise. Previously signed quotes fail closed immediately.
    function setSigner(address next) external onlyOwner {
        if (next == address(0)) revert ZeroSigner();
        _signer = next;
        emit SignerUpdated(next);
    }

    function quoteDigest(DeployQuote calldata quote) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        QUOTE_TYPEHASH,
                        quote.configHash,
                        quote.feeWei,
                        quote.chainId,
                        quote.factory,
                        quote.nonce,
                        quote.expiry,
                        quote.pricingVersion
                    )
                )
            );
    }

    /// @notice Deploy a token owned by `params.owner` against a signed quote.
    /// @dev Structural ownership guarantee: `params.owner` MUST equal
    /// msg.sender, so token.owner() == deployer always holds and the
    /// factory can never divert ownership to itself or a third party.
    /// NOTE: the TokenParams wrapper is load-bearing — flattening it
    /// overflows the stack. Keep the wrapper.
    function createToken(
        TokenParams calldata params,
        DeployQuote calldata quote,
        bytes calldata signature
    ) external payable returns (address) {
        BNBTokenMakerToken.TokenConfig memory cfg = params.token;
        if (cfg.owner != msg.sender) {
            revert OwnerMustBeSender(cfg.owner, msg.sender);
        }
        if (block.timestamp > quote.expiry) revert QuoteExpired(quote.expiry);
        if (_usedNonces[quote.nonce]) revert QuoteReplayed(quote.nonce);
        if (quote.chainId != block.chainid) revert WrongChain(quote.chainId);
        if (quote.factory != address(this)) revert WrongFactory(quote.factory);
        if (quote.feeWei > MAX_FEE_WEI) revert FeeExceedsCap(quote.feeWei, MAX_FEE_WEI);
        if (msg.value != quote.feeWei) revert FeeMismatch(msg.value, quote.feeWei);
        if (quote.configHash != keccak256(abi.encode(params))) revert ConfigMismatch();
        address recovered = ECDSA.recover(quoteDigest(quote), signature);
        if (recovered != _signer) revert BadQuoteSigner();
        _usedNonces[quote.nonce] = true;

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
        if (cfg.buyTaxBps > 0 || cfg.sellTaxBps > 0) features |= FLAG_TRADING;
        if (cfg.antiBotEnabled) features |= FLAG_ANTIBOT;
        if (cfg.autoLiquidityEnabled) features |= FLAG_AUTOLIQ;

        (bool ok, ) = feeRecipient.call{value: msg.value}("");
        if (!ok) revert FeeForwardFailed();

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
        emit DeploymentPaid(
            tokenAddress,
            msg.sender,
            quote.feeWei,
            quote.pricingVersion,
            quote.nonce
        );
        return tokenAddress;
    }
}
