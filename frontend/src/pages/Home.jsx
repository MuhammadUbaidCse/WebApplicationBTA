import { Link } from "react-router-dom";
import NetworkWarning from "../components/NetworkWarning.jsx";

const features = [
  {
    icon: "🏛️",
    title: "On-Chain Registration",
    desc: "Universities register the SHA-256 hash of a certificate PDF directly onto the Ethereum blockchain. The PDF itself is never uploaded.",
  },
  {
    icon: "🔍",
    title: "Instant Verification",
    desc: "Anyone can verify a certificate by selecting the original PDF. The hash is computed locally and checked against the smart contract — no wallet required.",
  },
  {
    icon: "🛡️",
    title: "Tamper Evidence",
    desc: "Even a one-byte change to a PDF produces a completely different hash. Altered documents are immediately detectable.",
  },
  {
    icon: "❌",
    title: "Revocation Support",
    desc: "Universities and the administrator can revoke certificates. Revoked certificates are clearly flagged during verification.",
  },
];

const roles = [
  {
    who: "Administrator",
    color: "navy",
    actions: ["Authorize university wallets as issuers", "Disable compromised or retired issuers", "Revoke any certificate"],
    link: "/admin",
    cta: "Open Admin Dashboard",
  },
  {
    who: "University",
    color: "teal",
    actions: ["Connect an authorized wallet", "Upload a finalized certificate PDF", "Register its SHA-256 hash on-chain", "View and revoke own certificates"],
    link: "/university",
    cta: "Open University Dashboard",
  },
  {
    who: "Student / Employer",
    color: "blue",
    actions: ["Receive original PDF from the university", "Upload PDF to verify its blockchain record", "See registration status and issuer address"],
    link: "/verify",
    cta: "Verify a Certificate",
  },
];

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <NetworkWarning />

      {/* Hero */}
      <section className="text-center py-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-100 text-teal-700 rounded-full text-sm font-medium mb-6">
          <span>CS-491 Blockchain Technologies & Applications — PBL Project</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-navy-500 mb-4">
          University Certificate<br />Verification System
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          A blockchain-based platform for issuing, verifying, and revoking academic certificates.
          Built on Ethereum with Hardhat, React, and ethers.js.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/verify" className="btn-primary text-base px-6 py-3">
            Verify a Certificate →
          </Link>
          <Link to="/university" className="btn-secondary text-base px-6 py-3">
            University Dashboard
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="py-10">
        <h2 className="text-2xl font-bold text-navy-500 text-center mb-2">How It Works</h2>
        <p className="text-center text-gray-500 text-sm mb-8 max-w-xl mx-auto">
          The SHA-256 hash of a certificate PDF is stored on a blockchain smart contract.
          Verification reads the contract state directly — no central server involved.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(f => (
            <div key={f.title} className="card text-center">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-navy-500 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Important privacy note */}
      <section className="py-4">
        <div className="alert-info">
          <strong>Privacy note: </strong>
          Certificate PDFs and personal data are <strong>never</strong> uploaded to the blockchain or any server.
          Only the SHA-256 hash — a one-way fingerprint of the file — is stored on-chain.
          A hash is <em>not</em> encryption; it reveals nothing about the file contents, but it uniquely identifies exact file bytes.
        </div>
      </section>

      {/* Roles */}
      <section className="py-10">
        <h2 className="text-2xl font-bold text-navy-500 text-center mb-8">Stakeholder Roles</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {roles.map(r => (
            <div key={r.who} className="card flex flex-col">
              <h3 className="font-bold text-navy-500 mb-3">{r.who}</h3>
              <ul className="text-sm text-gray-600 space-y-1.5 flex-1">
                {r.actions.map(a => (
                  <li key={a} className="flex items-start gap-2">
                    <span className="text-teal-500 mt-0.5 flex-shrink-0">✓</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
              <Link to={r.link} className="btn-primary mt-5 justify-center text-sm">
                {r.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section className="py-10">
        <h2 className="text-2xl font-bold text-navy-500 text-center mb-6">Architecture Overview</h2>
        <div className="card overflow-x-auto">
          <div className="flex flex-col items-center gap-2 text-sm min-w-[500px]">
            {/* Layer diagram */}
            <div className="w-full grid grid-cols-3 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <div className="font-semibold text-blue-800 text-xs mb-1">Student / Employer</div>
                <div className="text-xs text-blue-600">Select PDF → hash locally → read contract</div>
              </div>
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-center">
                <div className="font-semibold text-teal-800 text-xs mb-1">University</div>
                <div className="text-xs text-teal-600">Connect wallet → upload PDF → issue hash</div>
              </div>
              <div className="bg-navy-50 border border-navy-200 rounded-lg p-3 text-center bg-indigo-50 border-indigo-200">
                <div className="font-semibold text-indigo-800 text-xs mb-1">Administrator</div>
                <div className="text-xs text-indigo-600">Manage issuers → revoke certificates</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-xs">↕ ethers.js + MetaMask</div>
            <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <div className="font-semibold text-amber-800 text-xs mb-1">Smart Contract — CertificateRegistry.sol</div>
              <div className="text-xs text-amber-600">authorizeIssuer · issueCertificate · verifyCertificate · revokeCertificate</div>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-xs">↕ Ethereum JSON-RPC</div>
            <div className="w-full bg-gray-100 border border-gray-300 rounded-lg p-3 text-center">
              <div className="font-semibold text-gray-700 text-xs mb-1">Local Hardhat Network (prototype)</div>
              <div className="text-xs text-gray-500">Production: Permissioned university consortium chain</div>
            </div>
          </div>
        </div>
      </section>

      {/* Limitations notice */}
      <section className="py-4 mb-10">
        <div className="alert-warning text-sm">
          <strong>Prototype limitations: </strong>
          This system runs on a local Hardhat development network using test accounts.
          A production deployment would use a permissioned university consortium chain with formal governance.
          The local prototype does not implement consortium governance — it uses a single administrator for simplicity.
          A valid verification result confirms the exact file was registered by the recorded wallet address and has not been revoked.
          It does not independently prove the holder's identity or the academic truth of the certificate's content.
        </div>
      </section>
    </div>
  );
}
