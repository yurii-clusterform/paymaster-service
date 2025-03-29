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
CHAIN=""
ENTRY_POINT_V07_ADDRESS=""
BASE_SEPOLIA_RPC_URL=""
BASESCAN_API_KEY=""

DEPLOYER="0x..."
DEPLOYER_PRIVATE_KEY="0x..."
TRUSTED_SIGNER="0x..."
TRUSTED_SIGNER_PRIVATE_KEY="0x..."
OWNER="0x..."
OWNER_PRIVATE_KEY="0x..."

PROXY_ADDRESS=""
```

## Compile the paymaster contract

When you first clone the repository (or change the paymaster contract), you will need to (re)compile the paymaster contract and copy the ABI and bytecode to the `src/contracts/abi` subdirectory (using the `npm run copy` command).

```bash
npm run copy
```

## Admin Tasks

For details on the admin tasks, such as deploying, upgrading, funding the paymaster, etc., see the [ADMIN-README.md](ADMIN-README.md) file.

## Run locally for development

Running the project locally is done by running the following command. The paymaster service will be available at `https://localhost:3000`.

```bash
npm run start
```

## Vercel Deployment

As expected, deployment is done by pushing to the main branch. The deployment is done by Vercel.

## Author

- [@Ectsang](https://www.github.com/Ectsang)
