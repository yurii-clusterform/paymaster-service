# paymaster-service

A paymaster service that lets you use a custom paymaster contract. The service is built using Next.js and Fastify, hosted on Vercel.

Currently, the service supports v0.7 of the Account Abstraction standard. The paymaster smart contract is deployed using CREATE2 on:

- Base Sepolia
- Base Mainnet (TODO)

For more details on individual releases, see the [CHANGELOG.md](CHANGELOG.md) file.

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file. Run `cp .env.example .env` to create it.

```bash
ENTRY_POINT_V07_ADDRESS=""

BASE_SEPOLIA_RPC_URL=""
BASE_RPC_URL=""

BASE_SEPOLIA_BUNDLER_URL=""
BASE_BUNDLER_URL=""

BASESCAN_API_KEY=""

# Proxy address of the Paymaster (from the initial deployment)
PROXY_ADDRESS=""

# Deployer wallet private key
DEPLOYER_PRIVATE_KEY="0x..."

# Trusted signer wallet address
TRUSTED_SIGNER="0x..."
# Trusted signer wallet private key
TRUSTED_SIGNER_PRIVATE_KEY="0x..."

# Owner wallet private key
OWNER_PRIVATE_KEY="0x..."
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
