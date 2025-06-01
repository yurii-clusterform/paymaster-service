// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@account-abstraction/contracts/core/BasePaymaster.sol";
import "@account-abstraction/contracts/core/UserOperationLib.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title SignatureVerifyingPaymasterV07
 * @dev A Paymaster contract for ERC-4337 v0.7 that sponsors UserOperations 
 * if they have a valid signature from the authorized signer.
 * 
 * This paymaster uses timestamps for validity periods and allows transactions
 * to be signed by a trusted entity before they're submitted on-chain.
 */
contract SignatureVerifyingPaymasterV07 is Initializable, UUPSUpgradeable, BasePaymaster {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    using UserOperationLib for PackedUserOperation;

    // Address authorized to sign paymaster approvals
    address public verifyingSigner;
    
    // Maximum gas cost the paymaster is willing to cover (in wei)
    uint256 public maxAllowedGasCost;

    uint256 public constant VERSION = 4;

    error InvalidSignatureLength(uint256 length);
    error SignerMismatch(address recovered, address expected);
    error InvalidPaymasterData();
    error UnauthorizedUpgrade();
    error GasCostTooHigh(uint256 requested, uint256 maxAllowed);

    event VerifyingSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event EntryPointChanged(address indexed newEntryPoint);
    event Validated(bytes32 userOpHash, uint256 maxCost, uint48 validUntil, uint48 validAfter);
    event MaxAllowedGasCostUpdated(uint256 oldLimit, uint256 newLimit);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(IEntryPoint _entryPoint) BasePaymaster(_entryPoint) {
        _disableInitializers();
    }

    /**
     * @dev Initializes the paymaster with verifying signer address and owner
     * @param _verifyingSigner The address authorized to sign transaction approvals
     * @param _owner The address that will be set as owner of this contract
     */
    function initialize(address _verifyingSigner, address _owner) public initializer {
        __UUPSUpgradeable_init();
        verifyingSigner = _verifyingSigner;
        
        // Set default maximum gas cost to 0.01 ETH (10^16 wei)
        // This can be adjusted by the owner after deployment
        maxAllowedGasCost = 0.01 ether;
        
        // Transfer ownership to the specified owner
        // This is necessary because BasePaymaster's constructor runs for the implementation
        // but not for the proxy, so we need to set ownership in the initializer
        _transferOwnership(_owner);
    }

    /**
     * @dev Updates the authorized signer address
     * @param _verifyingSigner The new authorized signer address
     */
    function setVerifyingSigner(address _verifyingSigner) external onlyOwner {
        address oldSigner = verifyingSigner;
        verifyingSigner = _verifyingSigner;
        emit VerifyingSignerUpdated(oldSigner, _verifyingSigner);
    }

    /**
     * @dev Updates the maximum allowed gas cost
     * @param _maxAllowedGasCost The new maximum gas cost in wei
     */
    function setMaxAllowedGasCost(uint256 _maxAllowedGasCost) external onlyOwner {
        uint256 oldLimit = maxAllowedGasCost;
        maxAllowedGasCost = _maxAllowedGasCost;
        emit MaxAllowedGasCostUpdated(oldLimit, _maxAllowedGasCost);
    }

    /**
     * @dev Function that authorizes upgrades to the proxy. Only owner can upgrade.
     * Required by UUPSUpgradeable.
     */
    function _authorizeUpgrade(address) internal override onlyOwner {
        // Additional authorization logic can be added here if needed
    }

    /**
     * @dev Extracts and parses validation timestamps and signature from paymasterData
     * 
     * Format of paymasterData:
     * - First 6 bytes: validUntil timestamp (uint48)
     * - Next 6 bytes: validAfter timestamp (uint48)
     * - Remaining bytes: 65-byte signature (r, s, v)
     * 
     * @param paymasterData Raw bytes containing timestamps and signature
     * @return validUntil Timestamp after which the signature expires
     * @return validAfter Timestamp before which the signature is not valid
     * @return signature The 65-byte signature to verify
     */
    function parsePaymasterData(bytes calldata paymasterData)
        internal
        pure
        returns (
            uint48 validUntil,
            uint48 validAfter,
            bytes calldata signature
        )
    {
        // Require minimum length for timestamps (12 bytes) + signature (65 bytes)
        if (paymasterData.length < 77) revert InvalidPaymasterData();
        
        // First 12 bytes contain validUntil and validAfter timestamps (6 bytes each)
        validUntil = uint48(bytes6(paymasterData[:6]));
        validAfter = uint48(bytes6(paymasterData[6:12]));
        
        // Remaining bytes are the signature
        signature = paymasterData[12:];
        
        if (signature.length != 65) revert InvalidSignatureLength(signature.length);
    }

    /**
     * @dev Generates a hash for signing and verification based on timestamps, addresses, nonce, and calldata
     * 
     * This method creates a hash that includes the userOp nonce and calldata hash to prevent
     * replay attacks. Each signature is now tied to a specific transaction.
     * 
     * @param validUntil Timestamp after which the signature expires
     * @param validAfter Timestamp before which the signature is not valid
     * @param paymasterAddress The address of this paymaster contract
     * @param senderAddress The address of the sender initiating the UserOperation
     * @param nonce The nonce from the UserOperation to prevent replay attacks
     * @param calldataHash Hash of the UserOperation calldata to tie signature to specific transaction
     * @return A bytes32 hash that should be signed by the verifyingSigner
     */
    function getHash(
        uint48 validUntil,
        uint48 validAfter,
        address paymasterAddress,
        address senderAddress,
        uint256 nonce,
        bytes32 calldataHash
    ) public view returns (bytes32) {
        return keccak256(abi.encode(
            validUntil,
            validAfter,
            block.chainid,
            paymasterAddress,
            senderAddress,
            nonce,
            calldataHash
        ));
    }

    /**
     * @dev Packs validation timestamps and signature status into the format 
     * expected by the EntryPoint contract
     * 
     * @param sigFailed True if signature validation failed
     * @param validUntil Timestamp until which the signature is valid
     * @param validAfter Timestamp after which the signature is valid
     * @return packed A uint256 containing all validation data
     */
    function _packValidationData(
        bool sigFailed,
        uint48 validUntil,
        uint48 validAfter
    ) internal pure returns (uint256) {
        return uint256(
            (sigFailed ? 1 : 0) |
            (uint256(validUntil) << 160) |
            (uint256(validAfter) << 208)
        );
    }

    /**
     * @dev The main validation function called by the EntryPoint during UserOperation validation
     * BasePaymaster handles calling this internal method from the external validatePaymasterUserOp
     * 
     * @param userOp The UserOperation being validated
     * @param userOpHash Hash of the user operation
     * @param maxCost The maximum cost in wei that may be charged to the paymaster
     * @return context Data to pass to postOp (contains maxCost)
     * @return validationData Packed validation result and validity timeframe
     */
    function _validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) internal virtual override returns (bytes memory context, uint256 validationData) {
        // Extract timestamps and signature from paymaster data
        bytes calldata paymasterData = userOp.paymasterAndData[UserOperationLib.PAYMASTER_DATA_OFFSET:]; 
        
        // Parse the paymaster data
        (uint48 validUntil, uint48 validAfter, bytes calldata signature) = 
            parsePaymasterData(paymasterData);
            
        // Generate hash of calldata for signature verification
        bytes32 calldataHash = keccak256(userOp.callData);
            
        // Generate the hash using all UserOperation parameters to prevent replay attacks
        bytes32 hash = getHash(
            validUntil, 
            validAfter, 
            address(this), 
            userOp.sender, 
            userOp.nonce, 
            calldataHash
        );
        
        // Convert to EIP-191 format
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(hash);
        
        // Recover signer address from signature
        address recovered = ECDSA.recover(ethSignedHash, signature);
        
        // If signature doesn't match our authorized signer, return signature failure
        if (recovered != verifyingSigner) {
            return ("", _packValidationData(true, validUntil, validAfter));
        }
        
        // Validate gas cost doesn't exceed maximum allowed
        if (maxCost > maxAllowedGasCost) {
            revert GasCostTooHigh(maxCost, maxAllowedGasCost);
        }
        
        emit Validated(userOpHash, maxCost, validUntil, validAfter);

        // Signature is valid, return success 
        return (abi.encode(maxCost), _packValidationData(false, validUntil, validAfter));
    }

    /**
     * @dev Post-operation handler called by the EntryPoint after UserOperation execution
     * 
     * @param mode Whether the op succeeded, reverted, or postOp reverted
     * @param context The context value returned by validatePaymasterUserOp
     * @param actualGasCost The actual gas cost of the transaction
     */
    function _postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost,
        uint256 actualUserOpFeePerGas
    ) internal virtual override {
        // No additional logic needed at this time
        (mode, context, actualGasCost, actualUserOpFeePerGas); // Prevent unused parameter warnings
    }

    // In case contract receives ETH directly to its address
    receive() external payable {
        deposit();
    }
    
    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}