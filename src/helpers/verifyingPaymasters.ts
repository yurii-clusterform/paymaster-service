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
  parseAbiParameters,
  encodeAbiParameters,
  GetContractReturnType,
  PublicClient,
} from "viem";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless/utils";
import { ENTRYPOINT_V07_ABI } from "./abi";
import { getChain } from "./utils";
import {
  SBC_PAYMASTER_V07_Address,
  DETERMINISTIC_DEPLOYER,
  SALT,
} from "./constants";

import {
  abi as PaymasterV07Abi,
  bytecode as PaymasterV07Bytecode,
} from "../../artifacts/contracts/SignatureVerifyingPaymasterV07.sol/SignatureVerifyingPaymasterV07.json";

/**
 * Returns the call data for the SBC Paymaster v0.7 constructor
 * @param trustedSigner The address of the trusted signer
 * @returns The call data for the SBC Paymaster v0.7 constructor
 */
const SBC_PAYMASTER_V07_CALL = (trustedSigner: Address, owner: Address): Hex => {
  const constructorArgs = encodeAbiParameters(
    parseAbiParameters("address _entryPoint, address _trustedSigner, address _owner"), 
    [ENTRYPOINT_ADDRESS_V07, trustedSigner, owner]
  );

  return concat([
    SALT,
    PaymasterV07Bytecode as Hex,
    constructorArgs
  ]);
} 

/**
 * Check if the paymaster is already deployed and deploy it if it's not
 * @param walletClient walletClient with ETH balance to deploy the paymaster
 * @param trustedSigner The address of the trusted signer
 * @returns The paymaster contract
 */
export const deploySbcPaymasterV07 = async (
  walletClient: WalletClient<Transport, Chain, Account>,
  trustedSigner: Address,
  owner: Address
) => {
  const publicClient = createPublicClient({
    transport: http(process.env.RPC_URL),
    chain: getChain(),
  });

  if (SBC_PAYMASTER_V07_Address.length > 0) {
    console.log("SBC Paymaster v0.7 has a non-zero address, checking if it's deployed...");

    const bytecode = await publicClient.getCode({
      address: SBC_PAYMASTER_V07_Address as Address,
    });

    if (bytecode && bytecode !== "0x") {
      console.log(
        "SBC Paymaster v0.7 already deployed at",
        SBC_PAYMASTER_V07_Address
      );
      const paymaster = getContract({
        address: SBC_PAYMASTER_V07_Address as Address,
        abi: PaymasterV07Abi,
        client: walletClient,
      });

      return paymaster;
    }
  }

  const data = SBC_PAYMASTER_V07_CALL(trustedSigner, owner);

  await walletClient
    .sendTransaction({
      to: DETERMINISTIC_DEPLOYER,
      data,
      gas: 10_000_000n,
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
  walletClient: WalletClient<Transport, Chain, Account>,
  paymaster: GetContractReturnType<typeof PaymasterV07Abi, PublicClient<Transport, Chain>>
) => {
  const entryPointV7 = getContract({
    address: ENTRYPOINT_ADDRESS_V07,
    abi: ENTRYPOINT_V07_ABI,
    client: walletClient,
  });

  const balance = await entryPointV7.read.balanceOf([
    paymaster.address,
  ]);

  if (BigInt(balance) >= parseEther("0.01")) {
    console.log(
      `SBC Paymaster v0.7 already funded with ${formatEther(balance)} ETH`
    );
    return;
  }

  await entryPointV7.write
    .depositTo([paymaster.address], {
      value: parseEther("0.01"),
    })
    .then(() => console.log("Funded SBC Paymaster V0.7"));
};
