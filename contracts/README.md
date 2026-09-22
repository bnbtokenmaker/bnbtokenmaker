# Phase 6B contracts — BSC Testnet deployment engine

Single-implementation BEP-20 + fee-free factory. No proxies, no upgradeability,
no hidden admin, no taxes, no fees. Full feature semantics are documented in
`BNBTokenMakerToken.sol` NatSpec and covered by tests in `test/`.

## Toolchain (pinned)

- Solidity `0.8.28` (checked arithmetic, custom errors)
- OpenZeppelin Contracts `5.4.0` (`ERC20`, `Ownable` only)
- Hardhat `2.26.3` + `@nomicfoundation/hardhat-viem` `2.1.x`
- EVM target `paris` (safe for BSC mainnet/testnet)

## Commands

```sh
npm run contracts:compile    # compile (sources -> contracts/.artifacts, gitignored)
npm run contracts:test       # 56 in-process tests (no network, no secrets)
npm run contracts:artifacts  # compile + sync ABIs to lib/token/abi/*.json
```

## Testnet configuration (chain 97)

- Native token: tBNB · Explorer: https://testnet.bscscan.com
- RPC: `BSC_TESTNET_RPC_URL` env, else public default (reads only).
- Verification: `hardhat verify --network bscTestnet <addr> ...` once
  `BSCSCAN_API_KEY` is set. Never invent or commit a key.

## BSC Testnet Deployment (chain 97)

- Factory: `0x5357b13C30967197CF38b5FfAE2088417c562187` — source verified on
  BscScan Testnet (Remix/Sourcify build, solc 0.8.28, optimizer runs 200).
  Recorded as `NEXT_PUBLIC_TESTNET_FACTORY_ADDRESS` in `.env.example`.
- Test token via `createToken`: `0x5bea9f88D0699ad213bae63d28a0164c770c8dc8`
  ("BNB Token Maker Test", BTMTEST, 18 decimals, 1,000,000 supply, base
  config — optional features disabled).
- `createToken` tx `0xbef763b25b6f9b8363b0ef9361356d1b46890eaf88eb60d2721af3f383cb748`:
  SUCCESS, value 0 BNB (gas only — no platform fee by construction).
- Owner/deployer `0x8d3218A2cD42388CA627a9432e8b14F65d1c9990` received the
  full 1,000,000 BTMTEST; BscScan detects the token as BEP-20.
- Generated-token source verification is deferred to the automated Phase 6C+
  integration (intentional, not a failure).

## Manual re-deployment flow — wallet-signed only (reference)

This repo performs NO automated signing: `hardhat.config.ts` configures zero
accounts on purpose. There is deliberately no deploy script that accepts a
private key. The real test is done by a human, in a browser, on BSC Testnet:

1. Get tBNB from a BSC Testnet faucet.
2. The live factory address is recorded above and in `.env.example`.
3. Deploy `TokenFactory` from your wallet. Safest path is Remix
   (https://remix.ethereum.org) connected to BSC Testnet (chain 97):
   compile `TokenFactory.sol` + `BNBTokenMakerToken.sol` at Solidity 0.8.28
   with optimizer runs 200, deploy `TokenFactory` with 0 value attached.
4. In Remix (or BscScan Testnet "Write Contract"), call
   `createToken` with your test parameters and 0 value. Your wallet signs;
   your address becomes the token owner (`owner == msg.sender` is enforced).
5. Record the `TokenCreated` event (token address), verify on BscScan
   Testnet: name/symbol/decimals/supply/owner, a transfer, and that only
   gas (tBNB) was spent — no fee transfer exists.
6. Verify source on BscScan Testnet, then update
  `NEXT_PUBLIC_TESTNET_FACTORY_ADDRESS` in `.env.example` if the factory
  address changed (never commit a mainnet address here).

## Safety rules (enforced by tests, not just docs)

- `TokenFactory.createToken` is non-payable: ANY attached value reverts.
- Factory requires `owner == msg.sender`: ownership can never be diverted.
- `lib/deploy/phase6b.ts` fails closed unless the LIVE provider chain is 97.
- Never paste a private key / seed phrase anywhere in this repo or chat.
