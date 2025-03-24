# Changelog

## 0.2.0

- Use `SignatureVerifyingPaymaster` contract with ECDSA signature verification, verifying signer and owner
- Added compatible paymaster service
- Configurable `TRUSTED_SIGNER_PRIVATE_KEY`, `DEPLOYER_PRIVATE_KEY`, and `CHAIN` via environment variables
- Hardhat task to convert private key to address, verifying contract source code on Etherscan

## 0.1.0

- Initial release
- Added support for v0.7 of the Account Abstraction standard
- Use `ApproveAllPaymaster` smart contract
- Configurable `BUNDLER_URL` and `RPC_URL` via environment variables
- Hosted on Vercel Serverless
