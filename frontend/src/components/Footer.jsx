import { CONTRACT_ADDRESS, NETWORK_NAME } from "../utils/contract.js";

export default function Footer() {
  return (
    <footer className="bg-navy-600 text-blue-200 border-t border-navy-400 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Project info */}
          <div>
            <p className="font-semibold text-white mb-1">CS-491 Blockchain Technologies & Applications</p>
            <p>University Certificate Verification System — PBL Assignment</p>
          </div>
          {/* Network info */}
          <div>
            <p className="font-semibold text-white mb-1">Network</p>
            <p>{NETWORK_NAME}</p>
            <p className="font-mono break-all mt-1">
              Contract: {CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000"
                ? CONTRACT_ADDRESS
                : <span className="text-amber-300">Not deployed yet</span>
              }
            </p>
          </div>
          {/* Disclaimer */}
          <div>
            <p className="font-semibold text-white mb-1">⚠ Development Prototype</p>
            <p>Local Hardhat network — test accounts only. No real ETH. Not for production use.</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-navy-400 text-center text-xs text-blue-300">
          All accounts shown are local test accounts. PDFs are never uploaded to the blockchain.
        </div>
      </div>
    </footer>
  );
}
