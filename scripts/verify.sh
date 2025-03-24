#!/bin/bash

# Check if arguments are provided
if [ "$#" -lt 3 ]; then
    echo "Usage: npm run verify:contract [CONTRACT_NAME] [CONTRACT_ADDRESS] [NETWORK]"
    echo "Example: npm run verify:contract SignatureVerifyingPaymasterV07 0x... baseSepolia"
    exit 1
fi

# Set variables from arguments
export CONTRACT=$1
export ADDRESS=$2
export NETWORK=$3

echo "Verifying contract $CONTRACT at address $ADDRESS on network $NETWORK"

# Determine constructor arguments based on contract
if [ "$CONTRACT" = "SignatureVerifyingPaymasterV07" ]; then
    # The EntryPoint contract address for v0.7
    ENTRYPOINT="0x0000000071727De22E5E9d8BAf0edAc6f37da032"
    
    # Get trusted signer private key from .env file
    TRUSTED_SIGNER_PRIVATE_KEY=$(grep -o "TRUSTED_SIGNER_PRIVATE_KEY=.*" .env | cut -d= -f2 | tr -d '"')
    if [ -z "$TRUSTED_SIGNER_PRIVATE_KEY" ]; then
        echo "Error: Could not find TRUSTED_SIGNER_PRIVATE_KEY in .env file"
        exit 1
    fi
    
    # Convert private key to address using hardhat task
    echo "Converting trusted signer private key to address..."
    TRUSTED_SIGNER_ADDRESS=$(npx hardhat pk-to-address --pk "$TRUSTED_SIGNER_PRIVATE_KEY" | grep "Address:" | awk '{print $2}')
    
    if [ -z "$TRUSTED_SIGNER_ADDRESS" ]; then
        echo "Failed to get address from private key."
        exit 1
    fi

    # Get deployer address from .env file's DEPLOYER_PRIVATE_KEY
    DEPLOYER_PRIVATE_KEY=$(grep -o "DEPLOYER_PRIVATE_KEY=.*" .env | cut -d= -f2 | tr -d '"')
    DEPLOYER_ADDRESS=$(npx hardhat pk-to-address --pk "$DEPLOYER_PRIVATE_KEY" | grep "Address:" | awk '{print $2}')
    if [ -z "$DEPLOYER_ADDRESS" ]; then
        echo "Failed to get address from private key."
        exit 1
    fi
    
    echo "Using EntryPoint: $ENTRYPOINT"
    echo "Using Trusted Signer: $TRUSTED_SIGNER_ADDRESS"
    echo "Using Owner: $DEPLOYER_ADDRESS"
    # Run verification with constructor arguments (entrypoint, trusted signer, owner)
    npx hardhat verify --network "$NETWORK" "$ADDRESS" "$ENTRYPOINT" "$TRUSTED_SIGNER_ADDRESS" "$DEPLOYER_ADDRESS" --contract "contracts/$CONTRACT.sol:$CONTRACT"
else
    # For other contracts without special handling
    npm run verify
fi 