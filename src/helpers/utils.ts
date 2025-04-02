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
 * Returns the chain to use based on the chain name.
 * @param chain The name of the chain to use.
 * @returns The chain to use.
 */
export const getChain = (chain: string): Chain => {
  if (chain === "baseSepolia") {
    return baseSepolia;
  }
  return base;
};

/**
 * Returns a wallet client for the given chain.
 * @param chain The name of the chain to use.
 * @returns The wallet client.
 */
export const getDeployerWalletClient = (chain: string) => {
  const account = privateKeyToAccount(`0x${process.env.DEPLOYER_PRIVATE_KEY}`);

  return createWalletClient({
    account,
    chain: getChain(chain),
    transport: http(getRPCUrl(chain)),
  });
};

/**
 * Returns a wallet client for the trusted signer.
 * @param chain The name of the chain to use.
 * @returns The wallet client for the trusted signer.
 */
export const getTrustedSignerWalletClient = (chain: string) => {
  const account = privateKeyToAccount(`0x${process.env.TRUSTED_SIGNER_PRIVATE_KEY}`);

  return createWalletClient({
    account,
    chain: getChain(chain),
    transport: http(getRPCUrl(chain)),
  });
};

export const getRPCUrl = (chain: string) => {
  if (chain === "baseSepolia") {
    return process.env.BASE_SEPOLIA_RPC_URL;
  }
  return process.env.BASE_RPC_URL;
};

/**
 * Returns the bundler URL for the given chain.
 * @param chain The name of the chain to use.
 * @returns The bundler URL.
 */
export const getBundlerUrl = (chain: string) => {
  if (chain === "baseSepolia") {
    return process.env.BASE_SEPOLIA_BUNDLER_URL;
  }
  return process.env.BASE_BUNDLER_URL;
};

/**
 * Returns the scanner URL for the given chain.
 * @param chain The name of the chain to use.
 * @returns The scanner URL.
 */
export const getScannerUrl = (chain: string) => {
  if (chain === "baseSepolia") {
    return "https://sepolia.basescan.org";
  }
  return "https://basescan.org";
};
