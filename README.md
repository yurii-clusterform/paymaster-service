# paymaster-service

A paymaster service that lets you use a custom paymaster contract. The service is built using Next.js and Fastify, hosted on Vercel.

Currently, the service supports v0.7 of the Account Abstraction standard. The paymaster smart contract is deployed using CREATE2 on:

- Base Sepolia

For more details on individual releases, see the [CHANGELOG.md](CHANGELOG.md) file.

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file. You can use a `RPC_URL` from public services or use your own (e.g. Infura, Alchemy, etc.). The `BUNDLER_URL` can be configured to any ERC4337 compatible bundler (e.g. Pimlico or our SBC Bundler). The `DEPLOYER_PRIVATE_KEY` is the private key of your wallet that will be used to deploy and fund the paymaster contract. The `TRUSTED_SIGNER_PRIVATE_KEY` is the private key of the wallet that will be used to sign transactions for the paymaster contract.

```bash
RPC_URL=""
BUNDLER_URL=""
DEPLOYER_PRIVATE_KEY=""
TRUSTED_SIGNER_PRIVATE_KEY=""
CHAIN=""
```

## Compile the paymaster contract

When you first clone the repository (or change the paymaster contract), you will need to (re)compile the paymaster contract and copy the ABI and bytecode to the `src/contracts/abi` subdirectory (using the `npm run copy` command).

```bash
npm run compile
```

## Copy the ABI and bytecode to the contracts/abi subdirectory

```bash
npm run copy
```

## Set up your paymaster contract address

In `src/helps/contants.ts`, you can change the `SALT` to a Hex string of the same length to your liking. This is used by the CREATE2 opcode to deterministically generate the paymaster contract address.

At SBC, our practice is to use `0x5bc0000000000000000000000000000000000000000000000000000000000000` as the salt. For development purposes, you can use `0x5bc0000000000000000000000000000000000000000000000000000000000001`, `0x5bc0000000000000000000000000000000000000000000000000000000000002`, etc.

## Run locally

Running the project locally is done by running the following command. THIS WILL DEPLOY (if not already deployed) and FUND (if necessary) the paymaster contract to the chain specified in the `CHAIN` environment variable. After deployment, the paymaster service will be available at `https://localhost:3000`.

```bash
npm run start
```

## Contract Verification

To verify your deployed contract on a block explorer:

```bash
# Verify a contract
npm run verify:contract SignatureVerifyingPaymasterV07 0xYourDeployedContractAddress baseSepolia
```

This will verify and publish your contract source code to the blockchain explorer, making it readable and transparent for users.

Supported networks: baseSepolia (add more as needed in hardhat.config.ts)

## Vercel Deployment

As expected, deployment is done by pushing to the main branch. The deployment is done by Vercel, which will detect and deploy/fund the paymaster smart contract if it has not been deployed/funded.

## Author

- [@Ectsang](https://www.github.com/Ectsang)
