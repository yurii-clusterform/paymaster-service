import {
  http,
  createWalletClient,
  Chain,
} from "viem";
import { base, baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import "dotenv/config";

/// Returns the bigger of two BigInts.
export const maxBigInt = (a: bigint, b: bigint) => {
  return a > b ? a : b;
};

/**
 * Returns the chain to use based on the CHAIN environment variable.
 * @returns The chain to use.
 */
export const getChain = (): Chain => {
  if (process.env.CHAIN === "baseSepolia") {
    return baseSepolia;
  }
  return base;
};

/**
 * Returns a wallet client for the given chain.
 * @returns The wallet client.
 */
export const getDeployerWalletClient = () => {
  const account = privateKeyToAccount(`0x${process.env.DEPLOYER_PRIVATE_KEY}`);

  return createWalletClient({
    account,
    chain: getChain(),
    transport: http(process.env.RPC_URL),
  });
};

/**
 * Returns a wallet client for the trusted signer.
 * @returns The wallet client for the trusted signer.
 */
export const getTrustedSignerWalletClient = () => {
  const account = privateKeyToAccount(`0x${process.env.TRUSTED_SIGNER_PRIVATE_KEY}`);

  return createWalletClient({
    account,
    chain: getChain(),
    transport: http(process.env.RPC_URL),
  });
};
