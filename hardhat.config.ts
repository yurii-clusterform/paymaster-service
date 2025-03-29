import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-viem";
import dotenv from "dotenv";
import { Wallet } from "ethers";

// Load environment variables
dotenv.config();

// Log variables for debugging
console.log("Network configs:", {
  baseSepolia: {
    url: process.env.BASE_SEPOLIA_RPC_URL || 'MISSING_URL',
    apiKey: process.env.BASESCAN_API_KEY || 'MISSING_API_KEY'
  }
});

// Task to convert a private key to an address
task("pk-to-address", "Get address from private key")
  .addParam("pk", "The private key")
  .setAction(async (taskArgs) => {
    try {
      const wallet = new Wallet(taskArgs.pk);
      console.log(`Address: ${wallet.address}`);
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
    }
  });

// Task to deploy the paymaster
task("deploy-paymaster", "Deploy the UUPS paymaster and proxy")
  .setAction(async (_, hre) => {
    const deployPaymaster = require("./scripts/tasks/deploy-paymaster");
    await deployPaymaster.main(hre);
  });

// Task to upgrade the paymaster implementation
task("upgrade-paymaster", "Upgrade the UUPS paymaster implementation")
  .setAction(async (_, hre) => {
    const deployPaymaster = require("./scripts/tasks/deploy-paymaster");
    await deployPaymaster.upgrade(hre);
  });

// Task to deposit funds into the paymaster
task("deposit-funds", "Fund the paymaster by sending ETH to the EntryPoint")
  .setAction(async (_, hre) => {
    const depositFunds = require("./scripts/tasks/deposit-funds");
    await depositFunds.main(hre);
  });

// Task to withdraw funds from the paymaster
task("withdraw-funds", "Withdraw funds from the paymaster")
  .addParam("amount", "Amount of ETH to withdraw", "0.05")
  .setAction(async (taskArgs, hre) => {
    const withdrawFunds = require("./scripts/tasks/withdraw-funds");
    await withdrawFunds.main(hre, taskArgs.amount);
  });

// Task to check the status of the paymaster
task("paymaster-status", "Check the status of the paymaster contract")
  .setAction(async (_, hre) => {
    const checkStatus = require("./scripts/tasks/check-paymaster-status");
    await checkStatus.main(hre);
  });

// Task to update the trusted signer
task("update-signer", "Update the trusted signer address for the paymaster")
  .addParam("address", "The new signer address")
  .setAction(async (taskArgs, hre) => {
    const updateSigner = require("./scripts/tasks/update-signer");
    await updateSigner.main(hre, taskArgs.address);
  });

task("verify-source", "Verify the paymaster implementation and proxy contracts on Etherscan")
  .setAction(async (args, hre) => {
    const verifySource = require("./scripts/tasks/verify-source");
    await verifySource.main(hre);
  });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    optimism: {
      url: process.env.OPTIMISM_RPC_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    base: {
      url: process.env.BASE_RPC_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 84532
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      arbitrum: process.env.ARBISCAN_API_KEY || "",
      optimism: process.env.OPTIMISM_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || "",
      baseSepolia: process.env.BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      }
    ]
  },
};

export default config; 