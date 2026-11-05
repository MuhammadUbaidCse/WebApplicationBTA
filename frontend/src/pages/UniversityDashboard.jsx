import { useState, useCallback, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import FileDropzone from "../components/FileDropzone.jsx";
import WalletButton from "../components/WalletButton.jsx";
import TxStatus from "../components/TxStatus.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import NetworkWarning from "../components/NetworkWarning.jsx";
import GoogleDrivePanel from "../components/GoogleDrivePanel.jsx";
import { useWallet } from "../hooks/useWallet.js";
import { useGoogleDrive } from "../hooks/useGoogleDrive.js";
import { sha256File, shortHash } from "../utils/sha256.js";
import {
  issueCertificate, revokeCertificate,
  getIssuedByAddress, verifyCertificate,
  isPlaceholderContract
} from "../utils/contract.js";
import { exportCertificatesCSV } from "../utils/exportProof.js";

export default function UniversityDashboard() {
  const wallet = useWallet();
  const drive = useGoogleDrive();

  // Certificate issuance state
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileHash,     setFileHash]     = useState(null);
  const [fileDropzoneKey, setFileDropzoneKey] = useState(0);
  const [issueTx,      setIssueTx]      = useState(null);
  const [issueLoading, setIssueLoading] = useState(false);

  // Issued certificates list
  const [certs,        setCerts]        = useState([]);
  const [certsLoading, setCertsLoading] = useState(false);
  const [certsError,   setCertsError]   = useState(null);

  // Search & Filter state
  const [searchQuery,  setSearchQuery]  = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "valid" | "revoked"
  const [sortOrder,    setSortOrder]    = useState("newest"); // "newest" | "oldest"

  // Revocation state
  const [revokeTarget, setRevokeTarget] = useState(null); // { certHash }
  const [revokeTx,     setRevokeTx]     = useState(null);

  // Copied indicator state for row hashes
  const [copiedHash,   setCopiedHash]   = useState(null);

  // ── Load issued certificates when wallet connects ─────────────────────────
  const loadCerts = useCallback(async () => {
    if (!wallet.address || isPlaceholderContract()) return;
    setCertsLoading(true);
    setCertsError(null);
    try {
      const issued = await getIssuedByAddress(wallet.address);
      // Enrich each with current on-chain status
      const enriched = await Promise.all(
        issued.map(async (c) => {
          try {
            const status = await verifyCertificate(c.certHash);
            return { ...c, ...status };
          } catch {
            return { ...c, exists: true, valid: null, issuer: wallet.address };
          }
        })
      );
      setCerts(enriched.reverse()); // default newest first
    } catch (err) {
      setCertsError(err.message || "Failed to load certificates.");
    } finally {
      setCertsLoading(false);
    }
  }, [wallet.address]);

  useEffect(() => { loadCerts(); }, [loadCerts]);

  // ── Handle file selection ─────────────────────────────────────────────────
  const handleFile = useCallback(async (file) => {
    setSelectedFile(file);
    setFileHash(null);
    setIssueTx(null);
    try {
      const h = await sha256File(file);
      setFileHash(h);
    } catch (err) {
      setIssueTx({ state: "error", message: `Could not compute the PDF hash: ${err.message}` });
    }
  }, []);

  // ── Issue certificate ─────────────────────────────────────────────────────
  const handleIssue = useCallback(async () => {
    if (!wallet.signer || !fileHash) return;
    setIssueLoading(true);
    setIssueTx({ state: "pending" });
    try {
      const { tx, receipt } = await issueCertificate(wallet.signer, fileHash);
      setIssueTx({
        state:       "confirmed",
        message:     "Certificate issued successfully!",
        txHash:      receipt.hash,
        blockNumber: receipt.blockNumber,
      });
      await loadCerts();
    } catch (err) {
      let msg = err?.reason || err?.message || "Unknown error";
      if (msg.includes("already registered")) msg = "This certificate hash is already registered on-chain. Duplicate issuance rejected.";
      if (msg.includes("not an authorized issuer")) msg = "Your wallet is not authorized to issue certificates. Contact the administrator.";
      if (msg.includes("user rejected")) msg = "Transaction cancelled by user in MetaMask.";
      setIssueTx({ state: "error", message: msg });
    } finally {
      setIssueLoading(false);
    }
  }, [wallet.signer, fileHash, loadCerts]);

  // ── Revoke certificate ────────────────────────────────────────────────────
  const handleRevoke = useCallback(async () => {
    if (!wallet.signer || !revokeTarget) return;
    setRevokeTx({ state: "pending" });
    setRevokeTarget(null);
    try {
      const { tx, receipt } = await revokeCertificate(wallet.signer, revokeTarget.certHash);
      setRevokeTx({
        state:       "confirmed",
        message:     "Certificate revoked.",
        txHash:      receipt.hash,
        blockNumber: receipt.blockNumber,
      });
      await loadCerts();
    } catch (err) {
      let msg = err?.reason || err?.message || "Revocation failed.";
      if (msg.includes("not permitted")) msg = "You are not permitted to revoke this certificate. Only the original authorized issuer or the administrator can revoke.";
      if (msg.includes("user rejected")) msg = "Transaction cancelled by user.";
      setRevokeTx({ state: "error", message: msg });
    }
  }, [wallet.signer, revokeTarget, loadCerts]);

  // ── Copy Hash ─────────────────────────────────────────────────────────────
  const handleCopyHash = (hash) => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 1500);
    });
  };

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (certs.length === 0) return;
    exportCertificatesCSV(certs, wallet.address);
  };

  // ── Statistics Calculations ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = certs.length;
    const valid = certs.filter((c) => c.valid === true).length;
    const revoked = certs.filter((c) => c.valid === false && c.exists).length;
    return { total, valid, revoked };
  }, [certs]);

  // ── Filtered & Sorted Certificates ────────────────────────────────────────
  const filteredCerts = useMemo(() => {
    return certs
      .filter((c) => {
        // Search query matching
        const matchesQuery =
          !searchQuery.trim() ||
          c.certHash.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          (c.txHash && c.txHash.toLowerCase().includes(searchQuery.trim().toLowerCase()));

        // Status matching
        let matchesStatus = true;
        if (statusFilter === "valid") matchesStatus = c.valid === true;
        else if (statusFilter === "revoked") matchesStatus = c.valid === false && c.exists;

        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        const timeA = a.issuedAt ? a.issuedAt.getTime() : 0;
        const timeB = b.issuedAt ? b.issuedAt.getTime() : 0;
        return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
      });
  }, [certs, searchQuery, statusFilter, sortOrder]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <NetworkWarning />

      <section className="pt-10 pb-6">
        <h1 className="text-3xl font-bold text-navy-500 mb-2">University Dashboard</h1>
        <p className="text-gray-600">
          Connect your authorized university wallet to issue, inspect, export, and revoke academic certificates on the blockchain.
        </p>
      </section>

      {/* Wallet connection */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-navy-500 mb-4">Wallet Connection</h2>
        <WalletButton
          address={wallet.address}
          isAdmin={wallet.isAdmin}
          isAuthorized={wallet.isAuthorized}
          connecting={wallet.connecting}
          error={wallet.error}
          onConnect={wallet.connect}
          onDisconnect={wallet.disconnect}
        />
        {wallet.address && (
          <div className="mt-3 text-xs text-gray-500 font-mono break-all">
            Full address: {wallet.address}
          </div>
        )}
      </div>

      {/* Summary Statistics Cards (shown when wallet connected) */}
      {wallet.address && certs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Issued</p>
            <p className="text-2xl font-bold text-navy-500 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/30">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Active &amp; Valid</p>
            <p className="text-2xl font-bold text-emerald-800 mt-1">{stats.valid}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-red-200 shadow-sm bg-red-50/30">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Revoked</p>
            <p className="text-2xl font-bold text-red-800 mt-1">{stats.revoked}</p>
          </div>
        </div>
      )}

      {/* Issue certificate — only shown if authorized */}
      {wallet.address && wallet.isAuthorized && (
        <GoogleDrivePanel
          drive={drive}
          selectedFile={selectedFile}
          fileHash={fileHash}
          onFileSelected={handleFile}
        />
      )}

      {/* Issue certificate — only shown if authorized */}
      {wallet.address && wallet.isAuthorized && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-navy-500 mb-2">Issue Certificate</h2>
          <p className="text-sm text-gray-600 mb-4">
            Select or retrieve the finalized certificate PDF. Its SHA-256 hash is computed locally
            and registered on-chain. Saving the PDF to Google Drive is optional and requires your consent.
          </p>

          <FileDropzone
            key={fileDropzoneKey}
            onFile={handleFile}
            selectedFileName={selectedFile?.name}
            privacyMessage="The PDF is hashed locally. It is uploaded to Google Drive only if you explicitly save it there."
          />

          {fileHash && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">SHA-256 Hash (to be registered)</p>
              <div className="hash-display text-xs">{fileHash}</div>
              <p className="text-xs text-gray-400 mt-1">
                This hash uniquely identifies the exact file bytes of {selectedFile?.name}.
              </p>
            </div>
          )}

          {fileHash && (!issueTx || issueTx.state === "error") && (
            <button
              onClick={handleIssue}
              disabled={issueLoading}
              className="btn-primary mt-4"
            >
              {issueLoading
                ? "Sending transaction…"
                : issueTx?.state === "error"
                  ? "Retry Certificate Registration"
                  : "Register Certificate Hash On-Chain"}
            </button>
          )}

          <div className="mt-4">
            <TxStatus status={issueTx} />
          </div>

          {issueTx?.state === "confirmed" && (
            <button
              onClick={() => {
                setIssueTx(null);
                setFileHash(null);
                setSelectedFile(null);
                setFileDropzoneKey((key) => key + 1);
              }}
              className="btn-secondary mt-2 text-sm"
            >
              Issue another certificate
            </button>
          )}
        </div>
      )}

      {/* Not authorized banner */}
      {wallet.address && !wallet.isAuthorized && !wallet.isAdmin && (
        <div className="alert-warning mb-6">
          <strong>Not authorized:</strong> This wallet address has not been granted issuer permissions.
          Ask the system administrator to authorize address <code className="font-mono">{wallet.address}</code>.
        </div>
      )}

      {/* Certificates issued by this university */}
      {wallet.address && (
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-navy-500">
                Certificates Issued by This Address
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                On-chain records retrieved from the CertificateRegistry event logs.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                disabled={certs.length === 0}
                className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                title="Export all records to CSV"
              >
                <span>📊</span>
                <span>Export CSV</span>
              </button>
              <button onClick={loadCerts} disabled={certsLoading} className="btn-secondary text-xs px-3 py-1.5">
                {certsLoading ? "Loading…" : "↻ Refresh"}
              </button>
            </div>
          </div>

          <TxStatus status={revokeTx} />

          {certsError && <div className="alert-error mb-3 text-sm">{certsError}</div>}

          {/* Search and Filters Bar */}
          {certs.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2.5 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by hash or transaction..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field text-xs py-1.5"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field text-xs py-1.5 w-auto"
                >
                  <option value="all">All Statuses ({certs.length})</option>
                  <option value="valid">Valid ({stats.valid})</option>
                  <option value="revoked">Revoked ({stats.revoked})</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="input-field text-xs py-1.5 w-auto"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>
          )}

          {certsLoading && (
            <div className="text-gray-500 text-sm flex items-center gap-2 py-4">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="3" strokeDasharray="60" strokeDashoffset="15"/>
              </svg>
              Loading from blockchain events…
            </div>
          )}

          {!certsLoading && certs.length === 0 && (
            <p className="text-gray-500 text-sm py-4">
              No certificates have been issued from this address yet.
            </p>
          )}

          {!certsLoading && certs.length > 0 && filteredCerts.length === 0 && (
            <p className="text-gray-500 text-sm py-4 text-center">
              No certificates match your search and filter criteria.
            </p>
          )}

          {!certsLoading && filteredCerts.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b">
                    <th className="pb-2 pr-4">Hash</th>
                    <th className="pb-2 pr-4">Issued At</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCerts.map((c) => (
                    <tr key={c.certHash} className="hover:bg-gray-50/50">
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-gray-900" title={c.certHash}>
                            {shortHash(c.certHash)}
                          </span>
                          <button
                            onClick={() => handleCopyHash(c.certHash)}
                            className="text-gray-400 hover:text-gray-600 text-xs px-1"
                            title="Copy full hash"
                          >
                            {copiedHash === c.certHash ? "✓" : "📋"}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-600 whitespace-nowrap">
                        {c.issuedAt?.toLocaleString() ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4">
                        {c.valid === true  && <span className="badge-valid text-xs">Valid</span>}
                        {c.valid === false && c.exists && <span className="badge-revoked text-xs">Revoked</span>}
                        {c.valid === null  && <span className="badge-unknown text-xs">Unknown</span>}
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-3 text-xs">
                          <Link
                            to={`/verify?hash=${c.certHash}`}
                            className="text-teal-600 hover:text-teal-800 font-medium underline"
                          >
                            Verify
                          </Link>
                          {c.valid && wallet.isAuthorized && (
                            <button
                              onClick={() => setRevokeTarget({ certHash: c.certHash })}
                              className="text-red-600 hover:text-red-800 underline font-medium"
                            >
                              Revoke
                            </button>
                          )}
                          {c.valid === false && c.exists && (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-xs text-gray-400 mt-3 text-right">
                Showing {filteredCerts.length} of {certs.length} certificates
              </div>
            </div>
          )}
        </div>
      )}

      {/* Revocation confirm dialog */}
      <ConfirmDialog
        isOpen={!!revokeTarget}
        title="Confirm Revocation"
        message={`Are you sure you want to revoke this certificate?\n\nHash: ${revokeTarget?.certHash ?? ""}\n\nThis action is irreversible on-chain. The certificate will appear as REVOKED to any future verifier.`}
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
        confirmLabel="Revoke Certificate"
        confirmClass="btn-danger"
      />
    </div>
  );
}
