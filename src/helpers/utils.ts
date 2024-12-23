import {
  http,
  createWalletClient,
  createPublicClient,
  defineChain,
  Hex,
} from "viem";
import { base, baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import "dotenv/config";

/// Returns the bigger of two BigInts.
export const maxBigInt = (a: bigint, b: bigint) => {
  return a > b ? a : b;
};

export const getChain = () => baseSepolia;

export const getWalletClient = () => {
  const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);

  return createWalletClient({
    account,
    chain: getChain(),
    transport: http(process.env.RPC_URL),
  });
};
