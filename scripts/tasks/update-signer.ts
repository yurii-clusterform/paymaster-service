import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getAddress, Address, createPublicClient, http, createWalletClient } from 'viem';
import { config as dotenvConfig } from 'dotenv';
import { getChain } from "../../src/helpers/utils";
import { privateKeyToAccount } from "viem/accounts";

dotenvConfig();

/**
 * Update the trusted signer address for the paymaster
 */
export async function main(hre: HardhatRuntimeEnvironment, newSignerAddress: string): Promise<void> {
  try {
    // Validate the new signer address
    if (!newSignerAddress || !isValidAddress(newSignerAddress)) {
      throw new Error('Invalid or missing signer address');
    }
    
    // Get the proxy address from environment
    const proxyAddress = process.env.PROXY_ADDRESS;
    if (!proxyAddress || !isValidAddress(proxyAddress)) {
      throw new Error('Invalid or missing PROXY_ADDRESS in .env file');
    }

    console.log(`Updating trusted signer for paymaster at address: ${proxyAddress}`);
    console.log(`New signer address: ${newSignerAddress}`);

    // Setup clients
    const deployer = createWalletClient({
      chain: getChain(),
      transport: http(process.env.RPC_URL),
      account: privateKeyToAccount(`0x${process.env.DEPLOYER_PRIVATE_KEY}`),
    });
    const deployerAddress = deployer.account.address;
    const publicClient = createPublicClient({
      chain: getChain(),
      transport: http(process.env.RPC_URL),
    });
    
    console.log(`Using account: ${deployerAddress}`);

    // Get the paymaster contract
    const paymaster = await hre.viem.getContractAt('SignatureVerifyingPaymasterV07', proxyAddress as Address);

    // Check if the deployer is the owner
    const owner = await paymaster.read.owner([]) as Address;
    if (owner.toLowerCase() !== deployerAddress.toLowerCase()) {
      throw new Error(`The deployer (${deployerAddress}) is not the owner (${owner}) of the paymaster contract.`);
    }

    // Get current trusted signer
    const currentTrustedSigner = await paymaster.read.verifyingSigner([]) as Address;
    console.log(`Current trusted signer: ${currentTrustedSigner}`);

    // Update the trusted signer
    console.log('\nUpdating trusted signer...');
    const txHash = await paymaster.write.setVerifyingSigner([newSignerAddress as Address]);
    
    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash
    });
    
    console.log(`Transaction hash: ${receipt.transactionHash}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);

    // Verify the update
    const updatedVerifyingSigner = await paymaster.read.verifyingSigner([]) as Address;
    console.log(`\nVerified new trusted signer: ${updatedVerifyingSigner}`);
    
    if (updatedVerifyingSigner.toLowerCase() === newSignerAddress.toLowerCase()) {
      console.log('Trusted signer updated successfully ✅');
    } else {
      console.error('Error: Trusted signer update failed');
      process.exit(1);
    }

  } catch (error) {
    console.error('Error updating trusted signer:', error);
    process.exit(1);
  }
}

// Helper function to check if an address is valid
function isValidAddress(address: string): boolean {
  try {
    getAddress(address as Address);
    return true;
  } catch {
    return false;
  }
} 