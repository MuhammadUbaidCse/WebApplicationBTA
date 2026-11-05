import { useState, useCallback, useEffect } from "react";
import WalletButton from "../components/WalletButton.jsx";
import TxStatus from "../components/TxStatus.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import NetworkWarning from "../components/NetworkWarning.jsx";
import { useWallet } from "../hooks/useWallet.js";
import {
  authorizeIssuer, disableIssuer, revokeCertificate,
  isAuthorizedIssuer, isPlaceholderContract, getAdministrator
} from "../utils/contract.js";
import { ethers } from "ethers";

export default function AdminDashboard() {
  const wallet = useWallet();

  // Issuer management
  const [issuerInput, setIssuerInput]     = useState("");
  const [issuerStatus, setIssuerStatus]   = useState(null); // { authorized: bool }
  const [issuerTx,    setIssuerTx]        = useState(null);
  const [checkLoading, setCheckLoading]   = useState(false);

  // Certificate revocation by admin
  const [revokeHashInput, setRevokeHashInput] = useState("");
  const [revokeTx,        setRevokeTx]        = useState(null);
  const [revokeDialog,    setRevokeDialog]     = useState(false);

  // Admin address from contract
  const [contractAdmin, setContractAdmin] = useState(null);

  useEffect(() => {
    if (isPlaceholderContract()) return;
    getAdministrator().then(setContractAdmin).catch(() => {});
  }, []);

  // ── Check issuer status ───────────────────────────────────────────────────
  const checkIssuer = useCallback(async () => {
    if (!issuerInput || !ethers.isAddress(issuerInput)) {
      setIssuerStatus({ error: "Enter a valid Ethereum address." });
      return;
    }
    setCheckLoading(true);
    setIssuerStatus(null);
    try {
      const auth = await isAuthorizedIssuer(issuerInput);
      setIssuerStatus({ authorized: auth, address: issuerInput });
    } catch (err) {
      setIssuerStatus({ error: err.message });
    } finally {
      setCheckLoading(false);
    }
  }, [issuerInput]);

  // ── Authorize issuer ──────────────────────────────────────────────────────
  const handleAuthorize = useCallback(async () => {
    if (!wallet.signer || !ethers.isAddress(issuerInput)) return;
    setIssuerTx({ state: "pending" });
    try {
      const { receipt } = await authorizeIssuer(wallet.signer, issuerInput);
      setIssuerTx({ state: "confirmed", message: `Address ${issuerInput} authorized as issuer.`, txHash: receipt.hash, blockNumber: receipt.blockNumber });
      setIssuerStatus({ authorized: true, address: issuerInput });
      wallet.refresh();
    } catch (err) {
      let msg = err?.reason || err?.message || "Failed to authorize.";
      if (msg.includes("already authorized")) msg = "This address is already authorized.";
      if (msg.includes("not administrator"))  msg = "Only the administrator can manage issuers.";
      if (msg.includes("user rejected"))      msg = "Transaction cancelled.";
      setIssuerTx({ state: "error", message: msg });
    }
  }, [wallet, issuerInput]);

  // ── Disable issuer ────────────────────────────────────────────────────────
  const handleDisable = useCallback(async () => {
    if (!wallet.signer || !ethers.isAddress(issuerInput)) return;
    setIssuerTx({ state: "pending" });
    try {
      const { receipt } = await disableIssuer(wallet.signer, issuerInput);
      setIssuerTx({ state: "confirmed", message: `Address ${issuerInput} disabled. Previously issued certificates remain valid unless separately revoked.`, txHash: receipt.hash, blockNumber: receipt.blockNumber });
      setIssuerStatus({ authorized: false, address: issuerInput });
      wallet.refresh();
    } catch (err) {
      let msg = err?.reason || err?.message || "Failed to disable.";
      if (msg.includes("not currently authorized")) msg = "This address is not currently authorized.";
      if (msg.includes("user rejected"))             msg = "Transaction cancelled.";
      setIssuerTx({ state: "error", message: msg });
    }
  }, [wallet, issuerInput]);

  // ── Admin revoke by hash ──────────────────────────────────────────────────
  const handleAdminRevoke = useCallback(async () => {
    if (!wallet.signer) return;
    setRevokeDialog(false);
    setRevokeTx({ state: "pending" });
    try {
      const { receipt } = await revokeCertificate(wallet.signer, revokeHashInput.trim());
      setRevokeTx({ state: "confirmed", message: "Certificate revoked by administrator.", txHash: receipt.hash, blockNumber: receipt.blockNumber });
      setRevokeHashInput("");
    } catch (err) {
      let msg = err?.reason || err?.message || "Revocation failed.";
      if (msg.includes("does not exist"))  msg = "No certificate found for this hash.";
      if (msg.includes("already revoked")) msg = "This certificate is already revoked.";
      if (msg.includes("user rejected"))   msg = "Transaction cancelled.";
      setRevokeTx({ state: "error", message: msg });
    }
  }, [wallet.signer, revokeHashInput]);

  const isValidAddress = ethers.isAddress(issuerInput);
  const isValidHash    = /^0x[0-9a-fA-F]{64}$/.test(revokeHashInput.trim());
  const isActualAdmin  = wallet.address && contractAdmin &&
                          wallet.address.toLowerCase() === contractAdmin.toLowerCase();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <NetworkWarning />

      <section className="pt-10 pb-6">
        <h1 className="text-3xl font-bold text-navy-500 mb-2">Administrator Dashboard</h1>
        <p className="text-gray-600">
          Connect the administrator wallet to manage authorized issuers and revoke certificates.
          Only the wallet that deployed the contract is the administrator.
        </p>
      </section>

      {contractAdmin && (
        <div className="alert-info mb-4 text-sm">
          <strong>Administrator address (from contract): </strong>
          <span className="font-mono break-all">{contractAdmin}</span>
        </div>
      )}

      {/* Wallet */}
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
        {wallet.address && !isActualAdmin && contractAdmin && (
          <div className="alert-error mt-3 text-sm">
            The connected wallet is <strong>not the administrator</strong>.
            Administrator functions will fail. Connect the deployer account.
          </div>
        )}
      </div>

      {/* Issuer Management — only enabled for admin */}
      <div className={`card mb-6 ${!isActualAdmin ? "opacity-60 pointer-events-none" : ""}`}>
        <h2 className="text-lg font-semibold text-navy-500 mb-1">Manage Issuers</h2>
        <p className="text-sm text-gray-600 mb-4">
          Authorize a university wallet to issue certificates, or disable a compromised / retired issuer.
          Disabling an issuer does <strong>not</strong> automatically revoke their previously issued certificates.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="flex-1">
            <label htmlFor="issuer-addr" className="sr-only">University wallet address</label>
            <input
              id="issuer-addr"
              type="text"
              className="input-field font-mono text-sm"
              placeholder="0x… university wallet address"
              value={issuerInput}
              onChange={e => { setIssuerInput(e.target.value); setIssuerStatus(null); }}
              aria-label="University wallet address"
            />
          </div>
          <button onClick={checkIssuer} disabled={!issuerInput || checkLoading} className="btn-secondary whitespace-nowrap">
            {checkLoading ? "Checking…" : "Check Status"}
          </button>
        </div>

        {issuerStatus?.error && <p className="alert-error text-sm mb-2">{issuerStatus.error}</p>}
        {issuerStatus && !issuerStatus.error && (
          <div className={`text-sm px-3 py-2 rounded mb-3 ${issuerStatus.authorized ? "alert-success" : "alert-warning"}`}>
            <code className="font-mono text-xs">{issuerStatus.address}</code>:{" "}
            {issuerStatus.authorized ? "Currently authorized as issuer." : "Not currently authorized."}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleAuthorize}
            disabled={!wallet.signer || !isValidAddress || !isActualAdmin}
            className="btn-primary"
          >
            Authorize Issuer
          </button>
          <button
            onClick={handleDisable}
            disabled={!wallet.signer || !isValidAddress || !isActualAdmin}
            className="btn-danger"
          >
            Disable Issuer
          </button>
        </div>

        <div className="mt-3">
          <TxStatus status={issuerTx} />
        </div>
      </div>

      {/* Admin revocation */}
      <div className={`card ${!isActualAdmin ? "opacity-60 pointer-events-none" : ""}`}>
        <h2 className="text-lg font-semibold text-navy-500 mb-1">Revoke Certificate by Hash</h2>
        <p className="text-sm text-gray-600 mb-4">
          The administrator can revoke any registered certificate. Enter the full 0x-prefixed
          SHA-256 hash as displayed during verification.
        </p>

        <div className="mb-3">
          <label htmlFor="revoke-hash" className="sr-only">Certificate SHA-256 hash</label>
          <input
            id="revoke-hash"
            type="text"
            className="input-field font-mono text-sm"
            placeholder="0x… (64 hex chars = full SHA-256 hash)"
            value={revokeHashInput}
            onChange={e => setRevokeHashInput(e.target.value)}
            aria-label="Certificate hash to revoke"
          />
          {revokeHashInput && !isValidHash && (
            <p className="text-xs text-red-500 mt-1">Must be a 0x-prefixed 64-character hex string (bytes32).</p>
          )}
        </div>

        <button
          onClick={() => setRevokeDialog(true)}
          disabled={!wallet.signer || !isValidHash || !isActualAdmin}
          className="btn-danger"
        >
          Revoke Certificate
        </button>

        <div className="mt-3">
          <TxStatus status={revokeTx} />
        </div>
      </div>

      {/* Not connected info */}
      {!wallet.address && (
        <div className="alert-info mt-6 text-sm">
          Connect the administrator wallet (Account #0 from <code className="font-mono">npx hardhat node</code>) to manage the system.
          All accounts shown are local test accounts — no real cryptocurrency is used.
        </div>
      )}

      <ConfirmDialog
        isOpen={revokeDialog}
        title="Confirm Administrator Revocation"
        message={`You are about to revoke certificate hash:\n\n${revokeHashInput}\n\nThis action is irreversible on-chain. The certificate will appear as REVOKED to verifiers.`}
        onConfirm={handleAdminRevoke}
        onCancel={() => setRevokeDialog(false)}
        confirmLabel="Revoke"
        confirmClass="btn-danger"
      />
    </div>
  );
}
