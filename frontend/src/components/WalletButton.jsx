/**
 * WalletButton — Connect / disconnect MetaMask button.
 * Shows connected address, admin badge, and authorized-issuer badge.
 * Labels all accounts as "LOCAL TEST ACCOUNT" in dev mode.
 */
export default function WalletButton({ address, isAdmin, isAuthorized, connecting, error, onConnect, onDisconnect }) {
  const short = address
    ? address.slice(0, 6) + "…" + address.slice(-4)
    : null;

  if (address) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" aria-hidden="true"></span>
            <span className="font-mono text-sm text-emerald-800">{short}</span>
            <span className="badge-demo ml-1">local test</span>
          </div>
          {isAdmin      && <span className="badge-valid">Administrator</span>}
          {isAuthorized && !isAdmin && <span className="badge-valid">Authorized Issuer</span>}
          {!isAdmin && !isAuthorized && (
            <span className="badge-unknown">Not Authorized</span>
          )}
          <button onClick={onDisconnect} className="btn-secondary text-xs px-3 py-1.5 ml-auto">
            Disconnect
          </button>
        </div>
        {!isAdmin && !isAuthorized && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            This address is not authorized as an issuer. Ask the administrator to authorize it first.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onConnect}
        disabled={connecting}
        className="btn-primary"
        aria-busy={connecting}
      >
        {connecting ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <circle cx="12" cy="12" r="10" strokeWidth="3" strokeDasharray="60" strokeDashoffset="15"/>
            </svg>
            Connecting…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
            </svg>
            Connect MetaMask
          </>
        )}
      </button>
      {error && <p className="alert-error">{error}</p>}
    </div>
  );
}
