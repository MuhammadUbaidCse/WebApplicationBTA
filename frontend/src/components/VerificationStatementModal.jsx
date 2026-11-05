import React from "react";
import { CONTRACT_ADDRESS, NETWORK_NAME, NETWORK_CHAIN_ID } from "../config/contract.js";

export default function VerificationStatementModal({
  isOpen,
  onClose,
  result,
  certHash,
  fileName
}) {
  if (!isOpen || !result) return null;

  const verifiedAt = new Date();
  const isValid = result.valid;
  const isRevoked = result.exists && !result.valid;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 my-8 border border-gray-200">
        
        {/* Modal Controls (Hidden in print) */}
        <div className="no-print flex justify-between items-center pb-4 mb-4 border-b border-gray-200">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Official Verification Audit Certificate
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
              <span>🖨</span>
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Close
            </button>
          </div>
        </div>

        {/* Printable Certificate Container */}
        <div className="border-4 border-double border-navy-500 p-6 sm:p-8 rounded-xl bg-gradient-to-b from-white to-gray-50">
          
          {/* Header */}
          <div className="text-center pb-4 border-b border-gray-300">
            <div className="inline-block p-2 rounded-full bg-teal-50 text-teal-700 text-2xl mb-2">
              🎓
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-navy-500 uppercase">
              Blockchain Verification Audit Record
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Decentralized Academic Credential Verification System (CS-491)
            </p>
          </div>

          {/* Status Banner */}
          <div className="my-6 text-center">
            {isValid && (
              <div className="inline-block px-6 py-2.5 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-800 font-bold text-base tracking-wide">
                ✓ CRYPTOGRAPHICALLY VERIFIED &amp; VALID
              </div>
            )}
            {isRevoked && (
              <div className="inline-block px-6 py-2.5 rounded-full bg-red-100 border-2 border-red-500 text-red-800 font-bold text-base tracking-wide">
                ✗ CERTIFICATE REVOKED BY ISSUER / ADMIN
              </div>
            )}
            {!result.exists && (
              <div className="inline-block px-6 py-2.5 rounded-full bg-amber-100 border-2 border-amber-500 text-amber-800 font-bold text-base tracking-wide">
                ⚠ NOT REGISTERED ON BLOCKCHAIN
              </div>
            )}
          </div>

          {/* Details Table */}
          <div className="space-y-4 text-xs sm:text-sm">
            {fileName && (
              <div className="flex flex-col sm:flex-row justify-between py-1.5 border-b border-gray-200">
                <span className="font-semibold text-gray-600">Source Document:</span>
                <span className="font-medium text-gray-900">{fileName}</span>
              </div>
            )}

            <div className="flex flex-col py-1.5 border-b border-gray-200">
              <span className="font-semibold text-gray-600 mb-1">SHA-256 Cryptographic Hash:</span>
              <span className="font-mono text-xs break-all bg-gray-100 p-2 rounded border border-gray-200">
                {certHash}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row justify-between py-1.5 border-b border-gray-200">
              <span className="font-semibold text-gray-600">Issuing Authority Wallet:</span>
              <span className="font-mono text-xs break-all text-gray-900">{result.issuer || "—"}</span>
            </div>

            <div className="flex flex-col sm:flex-row justify-between py-1.5 border-b border-gray-200">
              <span className="font-semibold text-gray-600">Issuance Timestamp (On-Chain):</span>
              <span className="text-gray-900">
                {result.issuedAt ? result.issuedAt.toLocaleString() : "—"}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row justify-between py-1.5 border-b border-gray-200">
              <span className="font-semibold text-gray-600">Verification Timestamp:</span>
              <span className="text-gray-900">{verifiedAt.toLocaleString()}</span>
            </div>

            <div className="flex flex-col sm:flex-row justify-between py-1.5 border-b border-gray-200">
              <span className="font-semibold text-gray-600">Network / Chain ID:</span>
              <span className="text-gray-900">{NETWORK_NAME} (ID: {NETWORK_CHAIN_ID})</span>
            </div>

            <div className="flex flex-col sm:flex-row justify-between py-1.5 border-b border-gray-200">
              <span className="font-semibold text-gray-600">Registry Smart Contract:</span>
              <span className="font-mono text-xs break-all text-gray-700">{CONTRACT_ADDRESS}</span>
            </div>
          </div>

          {/* Legal / Technical Disclaimer */}
          <div className="mt-6 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
            <p>
              This document is an immutable proof receipt generated via client-side SHA-256 hash calculation
              and direct on-chain verification against the smart contract registry. No PDF data was uploaded.
            </p>
          </div>
        </div>

        {/* Footer info in modal */}
        <div className="no-print mt-4 text-center">
          <button
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-800 underline"
          >
            Back to Verification Screen
          </button>
        </div>

      </div>
    </div>
  );
}
