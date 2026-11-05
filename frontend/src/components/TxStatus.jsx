/**
 * TxStatus — Displays transaction lifecycle: pending → confirmed → error.
 */
export default function TxStatus({ status }) {
  if (!status) return null;

  if (status.state === "pending") {
    return (
      <div className="alert-info flex items-center gap-3" role="status" aria-live="polite">
        <svg className="w-5 h-5 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="10" strokeWidth="3" strokeDasharray="60" strokeDashoffset="15"/>
        </svg>
        <div>
          <p className="font-medium">Transaction submitted — waiting for confirmation…</p>
          {status.txHash && (
            <p className="font-mono text-xs mt-0.5 break-all">Tx: {status.txHash}</p>
          )}
        </div>
      </div>
    );
  }

  if (status.state === "confirmed") {
    return (
      <div className="alert-success" role="status" aria-live="polite">
        <p className="font-medium">✓ {status.message || "Transaction confirmed"}</p>
        {status.txHash && (
          <p className="font-mono text-xs mt-1 break-all">Tx: {status.txHash}</p>
        )}
        {status.blockNumber && (
          <p className="text-xs mt-0.5">Block #{status.blockNumber}</p>
        )}
      </div>
    );
  }

  if (status.state === "error") {
    return (
      <div className="alert-error" role="alert">
        <p className="font-medium">✗ Transaction failed</p>
        <p className="text-xs mt-1 break-words">{status.message}</p>
      </div>
    );
  }

  return null;
}
