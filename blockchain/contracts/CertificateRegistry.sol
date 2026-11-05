// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CertificateRegistry
 * @author CS-491 BTA PBL — University Certificate Verification System
 * @notice Stores SHA-256 hashes of academic certificate PDFs on-chain.
 *         PDFs and personal data are NEVER stored on-chain.
 *
 * NOTE ON NETWORK CHOICE
 * ----------------------
 * This contract is deployed to a LOCAL Hardhat development network for prototyping.
 * A production deployment would use a permissioned university consortium chain
 * (e.g., Hyperledger Besu or a private Ethereum PoA network shared by member
 * universities).  The local prototype does NOT implement consortium governance;
 * it uses a single administrator for simplicity.
 *
 * PRIVACY NOTE
 * ------------
 * A SHA-256 hash is NOT encryption.  It is a one-way fingerprint of the file.
 * The hash itself reveals nothing about the certificate content.  However, if
 * an attacker obtains the original PDF they can confirm it matches the hash.
 * Never store sensitive personal data on a public blockchain.
 */
contract CertificateRegistry {

    // ─────────────────────────────────────────────────────────────────────────
    // State variables
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice The administrator who can manage issuer authorizations.
    address public administrator;

    /// @notice Mapping of addresses authorised to issue certificates.
    mapping(address => bool) public authorizedIssuers;

    /// @notice Full certificate record stored for each SHA-256 hash.
    struct Certificate {
        address issuer;      // Wallet that registered this certificate
        uint256 issuedAt;    // Block timestamp at registration (Unix seconds)
        bool    revoked;     // Whether the certificate has been revoked
        bool    exists;      // Sentinel to distinguish "not found" from revoked
    }

    /// @notice Indexed by the SHA-256 hash of the certificate PDF (as bytes32).
    mapping(bytes32 => Certificate) private certificates;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event IssuerAuthorized(address indexed issuer);
    event IssuerDisabled(address indexed issuer);
    event CertificateIssued(bytes32 indexed certHash, address indexed issuer, uint256 issuedAt);
    event CertificateRevoked(bytes32 indexed certHash, address indexed revokedBy);

    // ─────────────────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────────────────

    modifier onlyAdmin() {
        require(msg.sender == administrator, "CertReg: caller is not administrator");
        _;
    }

    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender], "CertReg: caller is not an authorized issuer");
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor() {
        administrator = msg.sender;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Issuer management  (administrator only)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Authorize a university wallet to issue certificates.
     * @param issuer The wallet address to authorize.
     */
    function authorizeIssuer(address issuer) external onlyAdmin {
        require(issuer != address(0), "CertReg: zero address");
        require(!authorizedIssuers[issuer], "CertReg: already authorized");
        authorizedIssuers[issuer] = true;
        emit IssuerAuthorized(issuer);
    }

    /**
     * @notice Disable a previously authorized issuer.
     *         Certificates already issued by this address remain valid
     *         unless separately revoked.
     * @param issuer The wallet address to disable.
     */
    function disableIssuer(address issuer) external onlyAdmin {
        require(issuer != address(0), "CertReg: zero address");
        require(authorizedIssuers[issuer], "CertReg: not currently authorized");
        authorizedIssuers[issuer] = false;
        emit IssuerDisabled(issuer);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Certificate issuance  (authorized issuers only)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Register a certificate PDF hash on-chain.
     * @param certHash SHA-256 hash of the finalized certificate PDF.
     *
     * IMPORTANT: certHash must be the SHA-256 hash computed in the browser
     * using the Web Crypto API — NOT Ethereum's keccak256.
     * Using the wrong hash algorithm will silently produce wrong results.
     */
    function issueCertificate(bytes32 certHash) external onlyAuthorizedIssuer {
        require(certHash != bytes32(0), "CertReg: zero hash rejected");
        require(!certificates[certHash].exists, "CertReg: certificate already registered");
        certificates[certHash] = Certificate({
            issuer:   msg.sender,
            issuedAt: block.timestamp,
            revoked:  false,
            exists:   true
        });
        emit CertificateIssued(certHash, msg.sender, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Certificate revocation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Revoke a certificate.
     *         Allowed callers:
     *           • The original issuer, IF that issuer is still authorized.
     *           • The administrator (always).
     * @param certHash The SHA-256 hash of the certificate to revoke.
     */
    function revokeCertificate(bytes32 certHash) external {
        Certificate storage cert = certificates[certHash];
        require(cert.exists, "CertReg: certificate does not exist");
        require(!cert.revoked, "CertReg: already revoked");

        bool isAdmin         = (msg.sender == administrator);
        bool isOriginalIssuer = (msg.sender == cert.issuer);
        bool issuerStillAuth = authorizedIssuers[cert.issuer];

        // Original issuer may only revoke if they are still authorized.
        require(
            isAdmin || (isOriginalIssuer && issuerStillAuth),
            "CertReg: caller not permitted to revoke"
        );

        cert.revoked = true;
        emit CertificateRevoked(certHash, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Certificate verification  (read-only — no wallet required)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Verify a certificate by its SHA-256 hash.
     * @param certHash The SHA-256 hash of the PDF to verify.
     * @return exists  True if the hash was ever registered.
     * @return valid   True if registered AND not revoked.
     * @return issuer  The wallet address that registered this certificate.
     * @return issuedAt Unix timestamp of registration (0 if not exists).
     *
     * NOTE: A "valid" result means:
     *   • The exact bytes of the presented file were registered by the
     *     recorded issuer and have not been revoked.
     *   • It does NOT independently prove the holder's identity or the
     *     academic truth of the certificate's content.
     *   • Even a minor metadata change to the PDF produces a different
     *     hash and will return exists=false.
     */
    function verifyCertificate(bytes32 certHash)
        external
        view
        returns (
            bool exists,
            bool valid,
            address issuer,
            uint256 issuedAt
        )
    {
        Certificate storage cert = certificates[certHash];
        exists   = cert.exists;
        valid    = cert.exists && !cert.revoked;
        issuer   = cert.issuer;
        issuedAt = cert.issuedAt;
    }
}
