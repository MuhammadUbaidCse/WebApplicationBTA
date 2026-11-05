import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import FileDropzone from "../components/FileDropzone.jsx";
import NetworkWarning from "../components/NetworkWarning.jsx";
import VerificationStatementModal from "../components/VerificationStatementModal.jsx";
import { sha256File, shortHash } from "../utils/sha256.js";
import { verifyCertificate, isPlaceholderContract } from "../utils/contract.js";
import { downloadVerificationProofJSON } from "../utils/exportProof.js";

function StatusBadge({ exists, valid }) {
  if (!exists) {
    return (
      <div className="badge-unknown text-base px-4 py-2 rounded-lg font-semibold">
        ⚠ Not Registered
      </div>
    );
  }
  if (valid) {
    return (
      <div className="badge-valid text-base px-4 py-2 rounded-lg font-semibold">
        ✓ Valid — Registered &amp; Not Revoked
      </div>
    );
  }
  return (
    <div className="badge-revoked text-base px-4 py-2 rounded-lg font-semibold">
      ✗ Revoked
    </div>
  );
}

export default function Verify() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("file"); // "file" | "hash"
  const [manualHash, setManualHash] = useState("");
  const [hash,      setHash]      = useState(null);
  const [result,    setResult]    = useState(null);   // { exists, valid, issuer, issuedAt }
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [fileName,  setFileName]  = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Core verification function
  const executeVerification = useCallback(async (targetHash, sourceFileName = "") => {
    setHash(targetHash);
    setResult(null);
    setError(null);
    setFileName(sourceFileName);

    if (isPlaceholderContract()) {
      setError("Contract not deployed. Start the local Hardhat node and deploy the contract first.");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyCertificate(targetHash);
      setResult(res);
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("connect") || msg.toLowerCase().includes("rpc")) {
        setError("Could not reach the local blockchain. Make sure the Hardhat node is running (npx hardhat node).");
      } else {
        setError("Verification failed: " + msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle URL query parameter `?hash=...`
  useEffect(() => {
    const queryHash = searchParams.get("hash");
    if (queryHash && queryHash.startsWith("0x") && queryHash.length === 66) {
      setActiveTab("hash");
      setManualHash(queryHash);
      executeVerification(queryHash, "Query parameter verification");
    }
  }, [searchParams, executeVerification]);

  // Handle PDF file selection
  const handleFile = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    try {
      const fileHash = await sha256File(file);
      await executeVerification(fileHash, file.name);
    } catch (err) {
      setError("Failed to compute SHA-256 hash: " + err.message);
      setLoading(false);
    }
  }, [executeVerification]);

  // Handle manual hash submission
  const handleManualSubmit = (e) => {
    e.preventDefault();
    const cleanHash = manualHash.trim();
    if (!cleanHash.startsWith("0x") || cleanHash.length !== 66) {
      setError("Invalid SHA-256 hash format. Must be a 66-character hex string starting with 0x.");
      return;
    }
    executeVerification(cleanHash, "Manual hash lookup");
  };

  // Copy shareable verification link
  const handleCopyLink = () => {
    if (!hash) return;
    const link = `${window.location.origin}${import.meta.env.BASE_URL}verify?hash=${hash}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  // Download cryptographic JSON proof
  const handleDownloadProof = () => {
    if (!result || !hash) return;
    downloadVerificationProofJSON(result, hash, fileName);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <NetworkWarning />

      <section className="pt-10 pb-6">
        <h1 className="text-3xl font-bold text-navy-500 mb-2">Verify a Certificate</h1>
        <p className="text-gray-600">
          Verify academic credentials cryptographically against the blockchain.
          Select the original certificate PDF or enter its SHA-256 hash directly.
        </p>
      </section>

      {/* Info notice */}
      <div className="alert-info mb-6 text-sm">
        <strong>For students &amp; employers:</strong> You do not need a crypto wallet.
        Verification reads the blockchain using a read-only RPC connection.
        Files are hashed entirely client-side and never uploaded.
      </div>

      {/* Verification method tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => { setActiveTab("file"); setError(null); }}
          className={`py-2.5 px-5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "file"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          📄 Verify via PDF File
        </button>
        <button
          onClick={() => { setActiveTab("hash"); setError(null); }}
          className={`py-2.5 px-5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "hash"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          #️⃣ Verify via SHA-256 Hash
        </button>
      </div>

      {/* Step 1 Input Card */}
      <div className="card mb-6">
        {activeTab === "file" ? (
          <>
            <h2 className="text-lg font-semibold text-navy-500 mb-4">Step 1 — Select Certificate PDF</h2>
            <FileDropzone onFile={handleFile} />
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-navy-500 mb-2">Step 1 — Enter SHA-256 Hash</h2>
            <p className="text-xs text-gray-500 mb-4">
              Enter the exact 32-byte (64 hex characters) SHA-256 digest of the certificate.
            </p>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <input
                type="text"
                value={manualHash}
                onChange={(e) => setManualHash(e.target.value)}
                placeholder="0x..."
                className="input-field font-mono text-xs"
              />
              <button
                type="submit"
                disabled={loading || !manualHash.trim()}
                className="btn-primary text-sm"
              >
                {loading ? "Checking On-Chain…" : "Verify Hash On-Chain"}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Step 2 — Hash display */}
      {(loading || hash) && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-navy-500">Step 2 — SHA-256 Hash</h2>
            {hash && (
              <button
                onClick={handleCopyLink}
                className="text-xs text-teal-700 hover:text-teal-900 font-medium flex items-center gap-1"
              >
                <span>{copiedLink ? "✓ Link Copied!" : "🔗 Shareable Link"}</span>
              </button>
            )}
          </div>
          {loading && !hash && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="3" strokeDasharray="60" strokeDashoffset="15"/>
              </svg>
              Computing hash…
            </div>
          )}
          {hash && (
            <>
              <div className="hash-display" aria-label="SHA-256 hash">
                {hash}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This is the SHA-256 fingerprint of {fileName ? <strong>{fileName}</strong> : "this document"}.
                Using the exact same file bytes always produces the exact same hash.
              </p>
            </>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="alert-error mb-6" role="alert">
          <strong>Error: </strong>{error}
        </div>
      )}

      {/* Step 3 — Result */}
      {result && !loading && (
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-navy-500">Step 3 — Verification Result</h2>
            {result.exists && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDownloadProof}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                  title="Download cryptographic JSON proof"
                >
                  <span>📥</span>
                  <span>JSON Proof</span>
                </button>
                <button
                  onClick={() => setModalOpen(true)}
                  className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                  title="View official printable verification statement"
                >
                  <span>🖨</span>
                  <span>Print Audit Statement</span>
                </button>
              </div>
            )}
          </div>

          <div className="mb-4">
            <StatusBadge exists={result.exists} valid={result.valid} />
          </div>

          {!result.exists && (
            <div className="alert-warning text-sm">
              <strong>No record found</strong> for this file hash. This may mean:
              <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
                <li>The certificate was never registered on this blockchain.</li>
                <li>The file has been modified (even slightly) since registration.</li>
                <li>You may have been provided a different version of the file.</li>
              </ul>
              <p className="mt-2 text-xs">
                <em>A missing record does not necessarily mean the document is fraudulent — it may simply not have been registered in this system.</em>
              </p>
            </div>
          )}

          {result.exists && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Issuer Wallet Address</p>
                  <p className="font-mono break-all bg-gray-100 rounded px-2 py-1.5 text-xs">
                    {result.issuer}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Authorized blockchain address of the issuing university institution.
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Registration Time</p>
                  <p className="text-gray-900 font-medium">
                    {result.issuedAt ? result.issuedAt.toLocaleString() : "—"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Exact block timestamp recorded upon registration.
                  </p>
                </div>
              </div>

              {result.valid && (
                <div className="alert-success text-xs">
                  <strong>What this means: </strong>
                  The exact bytes of this PDF were registered by the issuer above and have not been revoked.
                  It does <em>not</em> independently verify the holder's identity or the academic truth of the certificate content.
                </div>
              )}

              {!result.valid && (
                <div className="alert-error text-xs">
                  <strong>Certificate revoked: </strong>
                  This certificate hash exists in the registry but has been withdrawn by the issuer or administrator.
                  Contact the issuing institution for more information.
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Full Hash</p>
                <div className="hash-display text-xs">{hash}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Guide */}
      <div className="card bg-gray-50">
        <h3 className="font-semibold text-navy-500 mb-2 text-sm">Understanding the results</h3>
        <dl className="text-sm space-y-2">
          <div className="flex gap-2">
            <dt><span className="badge-valid">Valid</span></dt>
            <dd className="text-gray-600">The exact file was registered and has not been revoked.</dd>
          </div>
          <div className="flex gap-2">
            <dt><span className="badge-revoked">Revoked</span></dt>
            <dd className="text-gray-600">The certificate was registered but later withdrawn.</dd>
          </div>
          <div className="flex gap-2">
            <dt><span className="badge-unknown">Not Registered</span></dt>
            <dd className="text-gray-600">No matching record found. The file may be unregistered, modified, or from a different version.</dd>
          </div>
        </dl>
      </div>

      {/* Verification Statement Printable Modal */}
      <VerificationStatementModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        result={result}
        certHash={hash}
        fileName={fileName}
      />
    </div>
  );
}
