/**
 * contract.js — Helpers for interacting with the CertificateRegistry smart contract.
 *
 * Verification (verifyCertificate) uses a read-only provider so employers and
 * students do NOT need to connect a wallet.
 *
 * Write operations (issue, authorize, revoke) require a signer from MetaMask.
 */

import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI, RPC_URL, NETWORK_CHAIN_ID } from "../config/contract.js";

// ─────────────────────────────────────────────────────────────────────────────
// Read-only provider  (no wallet required)
// ─────────────────────────────────────────────────────────────────────────────

function getReadProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

function getReadContract() {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, getReadProvider());
}

// ─────────────────────────────────────────────────────────────────────────────
// MetaMask / wallet connection helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Request MetaMask connection and return { signer, address }.
 * Throws a user-readable error if MetaMask is unavailable or the user rejects.
 */
export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install it from metamask.io.");
  }

  // Ask MetaMask to connect (may prompt user)
  await window.ethereum.request({ method: "eth_requestAccounts" });

  const provider = new ethers.BrowserProvider(window.ethereum);
  const network  = await provider.getNetwork();
  const chainId  = Number(network.chainId);

  if (chainId !== NETWORK_CHAIN_ID) {
    throw new Error(
      `Wrong network. Please switch MetaMask to the Hardhat Local Network ` +
      `(Chain ID ${NETWORK_CHAIN_ID}). Current chain: ${chainId}.`
    );
  }

  const signer  = await provider.getSigner();
  const address = await signer.getAddress();
  return { signer, address, provider };
}

function getWriteContract(signer) {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

// ─────────────────────────────────────────────────────────────────────────────
// Verification  (read-only — no wallet needed)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify a certificate by its SHA-256 hash.
 * @param {string} certHashHex   "0x..." 64-char SHA-256 hex
 * @returns {{ exists: boolean, valid: boolean, issuer: string, issuedAt: Date|null }}
 */
export async function verifyCertificate(certHashHex) {
  const contract = getReadContract();
  const [exists, valid, issuer, issuedAtBig] = await contract.verifyCertificate(certHashHex);
  const issuedAt = issuedAtBig > 0n ? new Date(Number(issuedAtBig) * 1000) : null;
  return { exists, valid, issuer, issuedAt };
}

// ─────────────────────────────────────────────────────────────────────────────
// Certificate issuance
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register a certificate hash on-chain.
 * @param {ethers.Signer} signer
 * @param {string}        certHashHex   "0x..." SHA-256 hash
 * @returns {ethers.TransactionReceipt}
 */
export async function issueCertificate(signer, certHashHex) {
  const contract = getWriteContract(signer);
  const tx       = await contract.issueCertificate(certHashHex);
  const receipt  = await tx.wait();
  return { tx, receipt };
}

// ─────────────────────────────────────────────────────────────────────────────
// Revocation
// ─────────────────────────────────────────────────────────────────────────────

export async function revokeCertificate(signer, certHashHex) {
  const contract = getWriteContract(signer);
  const tx       = await contract.revokeCertificate(certHashHex);
  const receipt  = await tx.wait();
  return { tx, receipt };
}

// ─────────────────────────────────────────────────────────────────────────────
// Issuer management  (admin only)
// ─────────────────────────────────────────────────────────────────────────────

export async function authorizeIssuer(signer, issuerAddress) {
  const contract = getWriteContract(signer);
  const tx       = await contract.authorizeIssuer(issuerAddress);
  const receipt  = await tx.wait();
  return { tx, receipt };
}

export async function disableIssuer(signer, issuerAddress) {
  const contract = getWriteContract(signer);
  const tx       = await contract.disableIssuer(issuerAddress);
  const receipt  = await tx.wait();
  return { tx, receipt };
}

export async function getAdministrator() {
  const contract = getReadContract();
  return await contract.administrator();
}

export async function isAuthorizedIssuer(address) {
  const contract = getReadContract();
  return await contract.authorizedIssuers(address);
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch events — used to list issued certificates per university
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return all CertificateIssued events for a specific issuer address.
 * Reads from block 0 to latest — suitable for a local dev node.
 * A production deployment would paginate or use an indexer.
 *
 * @param {string} issuerAddress
 * @returns {Array<{ certHash, issuedAt, txHash }>}
 */
export async function getIssuedByAddress(issuerAddress) {
  const contract = getReadContract();
  const filter   = contract.filters.CertificateIssued(null, issuerAddress);
  const events   = await contract.queryFilter(filter, 0, "latest");
  return events.map(e => ({
    certHash:    e.args.certHash,
    issuedAt:    new Date(Number(e.args.issuedAt) * 1000),
    txHash:      e.transactionHash,
    blockNumber: e.blockNumber,
  }));
}

/**
 * Return all CertificateRevoked events (for admin view).
 */
export async function getAllRevokedEvents() {
  const contract = getReadContract();
  const filter   = contract.filters.CertificateRevoked();
  const events   = await contract.queryFilter(filter, 0, "latest");
  return events.map(e => ({
    certHash:  e.args.certHash,
    revokedBy: e.args.revokedBy,
    txHash:    e.transactionHash,
  }));
}

export function isPlaceholderContract() {
  return CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000";
}

export { CONTRACT_ADDRESS, NETWORK_CHAIN_ID, NETWORK_NAME } from "../config/contract.js";
