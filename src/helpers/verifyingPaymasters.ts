import {
  http,
  type Account,
  type Address,
  type Chain,
  type Hex,
  type Transport,
  type WalletClient,
  concat,
  createPublicClient,
  getContract,
  getContractAddress,
  formatEther,
  parseEther,
  slice,
} from "viem";
import { ENTRYPOINT_ADDRESS_V07, ENTRYPOINT_ADDRESS_V06 } from "permissionless";
import { ENTRYPOINT_V07_ABI, ENTRYPOINT_V06_ABI } from "./abi";
import { getChain } from "./utils";
import {
  SBC_PAYMASTER_V07_Address,
  DETERMINISTIC_DEPLOYER,
  SALT,
} from "./constants";
import {
  abi as PaymasterV07Abi,
  bytecode as PaymasterV07Bytecode,
} from "../../contracts/abi/ApproveAllPaymasterV07.json";

const SBC_PAYMASTER_V07_CALL = concat([SALT, PaymasterV07Bytecode as Hex]);

/**
 * Check if the paymaster is already deployed and deploy it if it's not
 * @param walletClient walletClient with ETH balance to deploy the paymaster
 * @returns
 */
export const deploySbcPaymasterV07 = async (
  walletClient: WalletClient<Transport, Chain, Account>
) => {
  const publicClient = createPublicClient({
    transport: http(process.env.RPC_URL),
    chain: getChain(),
  });

  const bytecode = await publicClient.getCode({
    address: SBC_PAYMASTER_V07_Address,
  });

  if (bytecode !== "0x") {
    console.log(
      "SBC Paymaster v0.7 already deployed at",
      SBC_PAYMASTER_V07_Address
    );
    const paymaster = getContract({
      address: SBC_PAYMASTER_V07_Address,
      abi: PaymasterV07Abi,
      client: walletClient,
    });

    return paymaster;
  }

  const data = SBC_PAYMASTER_V07_CALL;
  await walletClient
    .sendTransaction({
      to: DETERMINISTIC_DEPLOYER,
      data,
    })
    .then((hash) => publicClient.waitForTransactionReceipt({ hash }))
    .then(() => console.log("deployed SBC Paymaster v0.7"));

  const address = getContractAddress({
    opcode: "CREATE2",
    from: DETERMINISTIC_DEPLOYER,
    salt: slice(data, 0, 32),
    bytecode: slice(data, 32),
  });

  console.log(`SBC Paymaster v0.7 address: ${address}`);

  const paymaster = getContract({
    address,
    abi: PaymasterV07Abi,
    client: walletClient,
  });

  return paymaster;
};

/**
 * Check if the paymaster is already funded with 0.01 ETH and fund it if it's not
 * @param walletClient walletClient with ETH balance to fund the paymaster
 */
export const fundSbcPaymasterV07 = async (
  walletClient: WalletClient<Transport, Chain, Account>
) => {
  const entryPointV7 = getContract({
    address: ENTRYPOINT_ADDRESS_V07,
    abi: ENTRYPOINT_V07_ABI,
    client: walletClient,
  });

  const balance = await entryPointV7.read.balanceOf([
    SBC_PAYMASTER_V07_Address,
  ]);

  if (BigInt(balance) >= parseEther("0.01")) {
    console.log(
      `SBC Paymaster v0.7 already funded with ${formatEther(balance)} ETH`
    );
    return;
  }

  await entryPointV7.write
    .depositTo([SBC_PAYMASTER_V07_Address], {
      value: parseEther("0.01"),
    })
    .then(() => console.log("Funded SBC Paymaster V0.7"));
};
