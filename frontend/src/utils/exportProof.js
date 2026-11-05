/**
 * exportProof.js — Utilities for generating and downloading verification proofs
 * and university certificate registry CSV records.
 */

import { CONTRACT_ADDRESS, NETWORK_CHAIN_ID, NETWORK_NAME, RPC_URL } from "../config/contract.js";

/**
 * Trigger a browser file download.
 * @param {string} fileName 
 * @param {string} content 
 * @param {string} contentType 
 */
export function downloadFile(fileName, content, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export university issued certificates to a standard CSV file.
 * @param {Array} certs - List of certificate records
 * @param {string} issuerAddress - Wallet address of the issuer
 */
export function exportCertificatesCSV(certs, issuerAddress = "unknown") {
  if (!certs || certs.length === 0) {
    throw new Error("No certificates available to export.");
  }

  const headers = [
    "Certificate Hash",
    "Status",
    "Issued At (ISO/UTC)",
    "Issued At (Local)",
    "Issuer Wallet Address",
    "Transaction Hash",
    "Block Number"
  ];

  const escapeCSV = (str) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = certs.map((c) => {
    let statusText = "Unknown";
    if (c.valid === true) statusText = "Valid";
    else if (c.valid === false && c.exists) statusText = "Revoked";
    else if (!c.exists) statusText = "Not Registered";

    return [
      escapeCSV(c.certHash),
      escapeCSV(statusText),
      escapeCSV(c.issuedAt ? c.issuedAt.toISOString() : ""),
      escapeCSV(c.issuedAt ? c.issuedAt.toLocaleString() : ""),
      escapeCSV(issuerAddress),
      escapeCSV(c.txHash || ""),
      escapeCSV(c.blockNumber ?? "")
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\r\n");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const shortAddr = issuerAddress.slice(0, 8);
  const fileName = `certificates_${shortAddr}_${timestamp}.csv`;

  downloadFile(fileName, csvContent, "text/csv;charset=utf-8;");
}

/**
 * Generate and download a JSON cryptographic proof receipt.
 * @param {object} result - Verification result { exists, valid, issuer, issuedAt }
 * @param {string} certHash - SHA-256 hash (0x...)
 * @param {string} fileName - Optional source file name
 */
export function downloadVerificationProofJSON(result, certHash, fileName = "") {
  let status = "NOT_REGISTERED";
  if (result.exists) {
    status = result.valid ? "VALID" : "REVOKED";
  }

  const proof = {
    title: "Blockchain Academic Certificate Verification Proof",
    standard: "CS491-BTA-PBL-Proof-v1.0",
    verifiedAt: new Date().toISOString(),
    certificate: {
      sourceFileName: fileName || null,
      sha256Hash: certHash,
      status: status,
      isValid: Boolean(result.valid),
      isRevoked: Boolean(result.exists && !result.valid),
      isRegistered: Boolean(result.exists),
      issuerAddress: result.issuer || null,
      issuedAtUTC: result.issuedAt ? result.issuedAt.toISOString() : null,
      issuedAtLocal: result.issuedAt ? result.issuedAt.toLocaleString() : null
    },
    blockchainProof: {
      network: NETWORK_NAME,
      chainId: NETWORK_CHAIN_ID,
      contractAddress: CONTRACT_ADDRESS,
      rpcEndpoint: RPC_URL,
      verificationMechanism: "Client-Side Web Crypto SHA-256 + On-Chain State Query (verifyCertificate)"
    },
    disclaimer: "This document certifies that the provided SHA-256 cryptographic digest matches the on-chain registry state at the time of verification."
  };

  const jsonStr = JSON.stringify(proof, null, 2);
  const shortH = certHash ? certHash.slice(0, 10) : "cert";
  const fileNameOut = `verification-proof-${shortH}.json`;

  downloadFile(fileNameOut, jsonStr, "application/json;charset=utf-8;");
}
