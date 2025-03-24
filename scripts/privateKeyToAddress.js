// Helper script to convert a private key to an Ethereum address
const { ethers } = require('ethers');

// Get the private key from command line arguments
const privateKey = process.argv[2];

if (!privateKey) {
  console.error('Please provide a private key as argument');
  process.exit(1);
}

try {
  // Create a wallet instance from the private key
  const wallet = new ethers.Wallet(privateKey);
  
  // Output the corresponding address
  console.log(wallet.address);
} catch (error) {
  console.error('Error converting private key to address:', error.message);
  process.exit(1);
} 