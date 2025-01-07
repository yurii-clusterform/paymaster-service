# paymaster-service

A paymaster service that lets you use a custom paymaster contract. The service is built using Next.js and Fastify. It's hosted on Vercel.

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file. You can use a `RPC_URL` from public services or use your own (e.g. Infura, Alchemy, etc.). The `BUNDLER_URL` should be using Pimlico's API Key. The `PRIVATE_KEY` is the private key of your wallet that will be used to deploy and fund the paymaster contract.

```bash
RPC_URL=""
BUNDLER_URL=""
PRIVATE_KEY=""
```

## Compile the paymaster contract

```bash
npm run compile
```

## Copy the ABI and bytecode to the contracts/abi subdirectory

```bash
npm run copy
```

## Run locally

```bash
npm run start
```

## Set up your paymaster contract address

In `src/helps/contants.ts`, you can change the `SALT` to a Hex string of the same length to your liking. This is used by the CREATE2 opcode to deterministically generate the paymaster contract address. You can also change the `SBC_PAYMASTER_V07_Address` variable to the address of your paymaster contract after your first successful local run.

## Vercel Deployment

As expected, deployment is done by pushing to the main branch. The deployment is done by Vercel, which will detect and deploy/fund the paymaster smart contract if it has not been deployed/funded.

## Author

- [@Ectsang](https://www.github.com/Ectsang)
