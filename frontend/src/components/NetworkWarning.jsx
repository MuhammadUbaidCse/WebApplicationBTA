/**
 * NetworkWarning — Banner shown when the contract is not deployed yet.
 */
import { isPlaceholderContract, CONTRACT_ADDRESS, NETWORK_NAME } from "../utils/contract.js";

export default function NetworkWarning() {
  if (!isPlaceholderContract()) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
          Connected to <strong>{NETWORK_NAME}</strong> — Contract: <span className="font-mono">{CONTRACT_ADDRESS}</span>
        </div>
      </div>
    );
  }

  if (import.meta.env.PROD) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
        <div className="alert-warning">
          <strong>Blockchain not configured.</strong>{" "}
          This hosted frontend needs a deployed contract and a public RPC endpoint. The local Hardhat
          network is only available on the developer&apos;s computer.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
      <div className="alert-warning">
        <strong>Contract not deployed.</strong>{" "}
        Run <code className="font-mono bg-amber-100 px-1 rounded">npx hardhat node</code> then{" "}
        <code className="font-mono bg-amber-100 px-1 rounded">npx hardhat run scripts/deploy.js --network localhost</code>{" "}
        from the <code>blockchain/</code> folder.
        The frontend config is updated automatically after deployment.
      </div>
    </div>
  );
}
