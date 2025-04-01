import { HardhatRuntimeEnvironment } from "hardhat/types";
import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  parseEther, 
  formatEther, 
  getAddress, 
  Address, 
  Hex, 
  encodeFunctionData,
  GetContractReturnType
} from 'viem';
import { config as dotenvConfig } from 'dotenv';
import { getChain } from "../../src/helpers/utils";
import { privateKeyToAccount } from "viem/accounts";

dotenvConfig();

const ENTRY_POINT_V07_ADDRESS = process.env.ENTRY_POINT_V07_ADDRESS as Address;
if (!ENTRY_POINT_V07_ADDRESS || !isValidAddress(ENTRY_POINT_V07_ADDRESS)) {
  throw new Error('ENTRY_POINT_V07_ADDRESS is required in environment variables');
}

/**
 * Deploy the UUPS paymaster and proxy
 */
export async function main(hre: HardhatRuntimeEnvironment): Promise<void> {
  console.log('Deploying SignatureVerifyingPaymasterV07 with UUPS Proxy...');
  
  const TRUSTED_SIGNER = process.env.TRUSTED_SIGNER as Address;
  if (!TRUSTED_SIGNER || !isValidAddress(TRUSTED_SIGNER)) {
    throw new Error('TRUSTED_SIGNER is required in environment variables');
  }

  // Setup viem clients
  const publicClient = createPublicClient({
    chain: getChain(),
    transport: http(process.env.RPC_URL),
  });

  // Get the deployer account
  const deployer = createWalletClient({
    chain: getChain(),
    transport: http(process.env.RPC_URL),
    account: privateKeyToAccount(`0x${process.env.DEPLOYER_PRIVATE_KEY}`),
  });
  const deployerAddress = deployer.account.address;
  console.log(`Deploying with account: ${deployerAddress}`);
  console.log(`EntryPoint address: ${ENTRY_POINT_V07_ADDRESS}`);
  console.log(`Trusted signer: ${TRUSTED_SIGNER}`);

  // Get contract artifacts directly
  const paymasterArtifact = await hre.artifacts.readArtifact('SignatureVerifyingPaymasterV07');
  const proxyArtifact = await hre.artifacts.readArtifact('ERC1967Proxy');
  
  // Deploy the implementation contract first
  console.log("Deploying implementation contract...");
  const implementationDeployTx = await deployer.deployContract({
    abi: paymasterArtifact.abi,
    bytecode: paymasterArtifact.bytecode as Hex,
    args: [ENTRY_POINT_V07_ADDRESS]
  });

  // Wait for deployment transaction
  const implementationReceipt = await publicClient.waitForTransactionReceipt({
    hash: implementationDeployTx
  });
  
  if (!implementationReceipt.contractAddress) {
    throw new Error("Implementation deployment failed");
  }
  
  const implementationAddress = implementationReceipt.contractAddress;
  console.log(`Implementation deployed to: ${implementationAddress}`);

  // Prepare initialization data
  const initializeFunction = paymasterArtifact.abi.find((item: any) => 
    item.type === 'function' && item.name === 'initialize'
  );
  
  if (!initializeFunction) {
    throw new Error('Initialize function not found in ABI');
  }
  
  const initData = encodeFunctionData({
    abi: [initializeFunction],
    functionName: 'initialize',
    args: [TRUSTED_SIGNER, deployerAddress]
  });

  // Deploy the proxy
  console.log("Deploying proxy contract...");
  const proxyDeployTx = await deployer.deployContract({
    abi: proxyArtifact.abi,
    bytecode: proxyArtifact.bytecode as Hex,
    args: [implementationAddress, initData]
  });
  
  // Wait for proxy deployment
  const proxyReceipt = await publicClient.waitForTransactionReceipt({
    hash: proxyDeployTx
  });
  
  if (!proxyReceipt.contractAddress) {
    throw new Error("Proxy deployment failed");
  }
  
  const proxyAddress = proxyReceipt.contractAddress;
  console.log(`Proxy deployed to: ${proxyAddress}`);
  
  // Get the proxy contract with the paymaster ABI
  const paymaster = await hre.viem.getContractAt(
    'SignatureVerifyingPaymasterV07',
    proxyAddress
  );
  
  // Verify initialization
  console.log('\nVerifying initialization...');
  const verificationResults = await Promise.all([
    paymaster.read.owner([]),
    paymaster.read.entryPoint([]),
    paymaster.read.verifyingSigner([]),
    paymaster.read.VERSION([])
  ]);
  
  console.log(`Owner: ${verificationResults[0]}`);
  console.log(`EntryPoint: ${verificationResults[1]}`);
  console.log(`Verifying Signer: ${verificationResults[2]}`);
  console.log(`Version: ${verificationResults[3]}`);

  console.log('\nFund your paymaster by sending ETH to the proxy address');
  console.log('Then call the fund-paymaster task to transfer funds to the EntryPoint');

  console.log('\n*** Remember to update the .env file with the new PROXY_ADDRESS ***');
  console.log(`PROXY_ADDRESS=${proxyAddress}`);
}

/**
 * Upgrade the UUPS paymaster implementation
 */
export async function upgrade(hre: HardhatRuntimeEnvironment): Promise<void> {
  const PROXY_ADDRESS = process.env.PROXY_ADDRESS as Address;
  if (!PROXY_ADDRESS || !isValidAddress(PROXY_ADDRESS)) {
    throw new Error('PROXY_ADDRESS is required in environment variables');
  }

  console.log('Upgrading paymaster implementation...');
  console.log(`Proxy address: ${PROXY_ADDRESS}`);
  
  // Setup viem clients
  const publicClient = createPublicClient({
    chain: getChain(),
    transport: http(process.env.RPC_URL),
  });
  const deployer = createWalletClient({
    chain: getChain(),
    transport: http(process.env.RPC_URL),
    account: privateKeyToAccount(`0x${process.env.DEPLOYER_PRIVATE_KEY}`),
  });
  
  // Get the implementation address (using storage slot for ERC1967)
  const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
  const implAddressData = await publicClient.getStorageAt({
    address: PROXY_ADDRESS,
    slot: implementationSlot
  });
  
  const currentImpl = getAddress('0x' + (implAddressData?.slice(26) || ''));
  console.log(`Current implementation: ${currentImpl}`);
  
  // Get the deployer account information
  console.log(`Upgrading with account: ${deployer.account.address}`);
  
  // Get the contract artifact
  const paymasterArtifact = await hre.artifacts.readArtifact('SignatureVerifyingPaymasterV07');
  console.log("Deploying new implementation...");
  
  const implementationDeployTx = await deployer.deployContract({
    abi: paymasterArtifact.abi,
    bytecode: paymasterArtifact.bytecode as Hex,
    args: [ENTRY_POINT_V07_ADDRESS]
  });

  // Wait for deployment transaction
  const implementationReceipt = await publicClient.waitForTransactionReceipt({
    hash: implementationDeployTx
  });
  
  if (!implementationReceipt.contractAddress) {
    throw new Error("Implementation deployment failed");
  }
  
  const implementationAddress = implementationReceipt.contractAddress;
  console.log(`New implementation deployed to: ${implementationAddress}`);
  
  // Upgrade the proxy by calling the upgradeToAndCall function
  console.log("Upgrading proxy implementation...");
  
  // Get the proxy contract with UUPS interface
  const proxy = await hre.viem.getContractAt(
    'UUPSUpgradeable',
    PROXY_ADDRESS
  );
  
  const upgradeTx = await proxy.write.upgradeToAndCall([
    implementationAddress,
    '0x' as Hex // No initialization data needed for upgrade
  ]);
  
  // Wait for upgrade transaction
  await publicClient.waitForTransactionReceipt({
    hash: upgradeTx
  });
  
  // Verify the new implementation address
  const newImplAddressData = await publicClient.getStorageAt({
    address: PROXY_ADDRESS,
    slot: implementationSlot
  });
  
  const newImpl = getAddress('0x' + (newImplAddressData?.slice(26) || ''));
  console.log(`New implementation address verified: ${newImpl}`);
  console.log("Upgrade completed successfully!");
}

// Helper function to check if an address is valid
function isValidAddress(address: string): boolean {
  try {
    getAddress(address);
    return true;
  } catch {
    return false;
  }
} 