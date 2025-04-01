import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getAddress, Address } from 'viem';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

/**
 * Verify the paymaster implementation and proxy contracts on Etherscan
 */
export async function main(hre: HardhatRuntimeEnvironment): Promise<void> {
  try {
    // Get the proxy address from environment
    const proxyAddress = process.env.PROXY_ADDRESS;
    if (!proxyAddress || !isValidAddress(proxyAddress)) {
      throw new Error('Invalid or missing PROXY_ADDRESS in .env file');
    }

    // Get the implementation address using the ERC1967 storage slot
    const publicClient = await hre.viem.getPublicClient();
    const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
    const implAddressData = await publicClient.getStorageAt({
      address: proxyAddress as Address,
      slot: implementationSlot
    });
    
    const implementationAddress = getAddress('0x' + (implAddressData?.slice(26) || ''));
    console.log(`Implementation address: ${implementationAddress}`);
    console.log(`Proxy address: ${proxyAddress}`);

    // Get required addresses for verification
    const ENTRY_POINT_V07_ADDRESS = process.env.ENTRY_POINT_V07_ADDRESS as Address;
    if (!ENTRY_POINT_V07_ADDRESS || !isValidAddress(ENTRY_POINT_V07_ADDRESS)) {
      throw new Error('ENTRY_POINT_V07_ADDRESS is required in environment variables');
    }
    
    const TRUSTED_SIGNER = process.env.TRUSTED_SIGNER as Address;
    if (!TRUSTED_SIGNER || !isValidAddress(TRUSTED_SIGNER)) {
      throw new Error('TRUSTED_SIGNER is required in environment variables');
    }

    console.log('\nVerifying implementation contract...');
    try {
      await hre.run("verify:verify", {
        address: implementationAddress,
        contract: "contracts/SignatureVerifyingPaymasterV07.sol:SignatureVerifyingPaymasterV07",
        constructorArguments: [ENTRY_POINT_V07_ADDRESS]
      });
      console.log('Implementation verification successful ✅');
    } catch (error: any) {
      if (error.message.includes('Already Verified')) {
        console.log('Implementation contract is already verified ✅');
      } else {
        console.error('Error verifying implementation:', error);
      }
    }

    console.log('\nVerification process completed!');
    console.log('You can now view your contracts on Sepolia BaseScan:');
    console.log(`Implementation: https://sepolia.basescan.org/address/${implementationAddress}`);
    console.log("\n");
    console.log(`Proxy: https://sepolia.basescan.org/address/${proxyAddress}`);
    console.log("To verify the proxy contract, visit the link above and click `Is this a proxy?` and follow the instructions.");

  } catch (error) {
    console.error('Error during verification:', error);
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