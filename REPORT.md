# Project Report: University Certificate Verification System
### CS-491 Blockchain Technologies and Applications — PBL Assignment

---

## 1. Problem Statement

Academic certificate fraud is a widespread and growing problem. Employers cannot easily verify the authenticity of academic documents presented by job candidates without contacting the issuing institution directly, which is slow, expensive, and often impractical at scale. Fraudulent certificates can be created with widely-available tools, and manual inspection cannot reliably detect high-quality forgeries.

Existing solutions rely on centralized verification services (databases maintained by registrars), which introduce single points of failure, require trust in the service operator, may go offline, and typically require paid subscriptions.

---

## 2. Limitations of Manual Verification

| Problem | Impact |
|---------|--------|
| Phone/email verification | Slow, not scalable for bulk hiring |
| Central registrar databases | Single point of failure; data breach risk |
| Paper-based embossed seals | Reproducible with modern printing |
| QR codes on certificates | Rely on issuer's server staying online |
| Third-party verification services | Paid subscriptions; trust in operator |

A blockchain-based approach removes the need to trust a single intermediary and provides a tamper-evident, always-available record.

---

## 3. Functional and Non-Functional Requirements

### Functional Requirements
1. **FR-01:** Administrators shall authorize or disable university issuer wallets.
2. **FR-02:** Authorized issuers shall register the SHA-256 hash of a certificate PDF on-chain.
3. **FR-03:** Any user shall verify a certificate by selecting the PDF — no wallet required.
4. **FR-04:** Verification shall return: exists/valid/revoked status, issuer address, and timestamp.
5. **FR-05:** Issuers (while authorized) and the administrator shall revoke certificates.
6. **FR-06:** Duplicate hash registration shall be rejected.
7. **FR-07:** Zero hash shall be rejected.

### Non-Functional Requirements
1. **NFR-01:** PDFs shall never be uploaded — hashing must occur client-side.
2. **NFR-02:** SHA-256 (not keccak256) shall be used consistently.
3. **NFR-03:** The system shall display clear error states for network failures.
4. **NFR-04:** The UI shall be accessible and keyboard-navigable.
5. **NFR-05:** No real cryptocurrency shall be required to run the prototype.

---

## 4. Proposed Architecture and Blockchain Choice

### Architecture

```
┌──────────────────────────────────────────────────┐
│                React Frontend (Vite)              │
│  ┌──────────┐ ┌───────────┐ ┌─────────────────┐  │
│  │  Verify  │ │University │ │     Admin       │  │
│  │   Page   │ │ Dashboard │ │   Dashboard     │  │
│  └──────────┘ └───────────┘ └─────────────────┘  │
│         ↕ ethers.js v6 + Web Crypto API           │
└──────────────────────┬───────────────────────────┘
                       │ JSON-RPC (HTTP)
              ┌────────▼────────┐
              │  Smart Contract  │
              │CertificateRegistry│
              │   (Solidity)     │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  Hardhat Node   │
              │ (localhost:8545)│
              │  ChainID 31337  │
              └─────────────────┘
```

### Blockchain Choice

**Prototype:** Hardhat local Ethereum-compatible network  
**Rationale for local network:**
- No real cryptocurrency required
- Instant block mining for development
- Deterministic test accounts
- Free and reproducible

**Production recommendation:** A permissioned Ethereum consortium chain (e.g., Hyperledger Besu with IBFT 2.0 consensus) operated by member universities. Each member institution runs a validator node. This provides:
- Controlled membership (only verified universities can join)
- Lower transaction costs (no gas market)
- Regulatory compliance possible
- Data sovereignty for participating institutions

The local prototype does **not** implement consortium governance — it uses a single administrator for simplicity.

---

## 5. Stakeholder Roles

### Administrator
- Deployed the smart contract (becomes administrator automatically)
- Manages the list of authorized issuer wallets
- Can revoke any certificate (emergency authority)
- In production: an inter-university committee or governance contract

### University (Issuer)
- Receives wallet authorization from administrator
- Finalizes certificate PDF and computes its SHA-256 hash
- Submits hash to blockchain via MetaMask
- Can revoke own certificates while authorized

### Student (Certificate Holder)
- Receives original PDF from university through existing channels
- Shares original PDF with employers for verification
- Does not interact with the blockchain directly

### Employer / Verifier
- Selects certificate PDF
- System computes hash and checks smart contract
- Sees: registered/revoked/not-found result, issuer address, and timestamp
- No wallet required

---

## 6. On-Chain vs Off-Chain Storage

| Data | Storage | Reason |
|------|---------|--------|
| SHA-256 hash of PDF | On-chain (bytes32) | Small (32 bytes), needed for tamper-proof lookup |
| Issuer address | On-chain | Required for revocation authorization |
| Timestamp | On-chain (block.timestamp) | Provable issuance time |
| Certificate PDF | Off-chain (with student) | Too large for blockchain; privacy |
| Student name, grades | Off-chain | Personal data; privacy regulations |
| Revocation status | On-chain (bool) | Must be queryable by anyone |

---

## 7. Issuance, Verification, and Revocation Workflows

### Issuance Workflow
```
University selects finalized PDF
    → Browser computes SHA-256 hash (Web Crypto API)
    → Hash displayed to user for review
    → University clicks "Register"
    → MetaMask prompts for confirmation
    → Transaction sent to CertificateRegistry.issueCertificate(hash)
    → Contract validates: authorized? hash non-zero? not duplicate?
    → If valid: stores {issuer, timestamp, revoked=false}
    → Emits CertificateIssued event
    → Transaction confirmed; hash stored permanently
```

### Verification Workflow
```
Verifier selects PDF
    → Browser computes SHA-256 hash (Web Crypto API)
    → Frontend calls CertificateRegistry.verifyCertificate(hash) [read-only]
    → Contract returns {exists, valid, issuer, issuedAt}
    → Frontend displays:
        - Valid: registered AND not revoked
        - Revoked: registered BUT revoked (exists=true, valid=false)
        - Not Registered: hash never stored (exists=false)
```

### Revocation Workflow
```
Issuer or Admin initiates revocation
    → Calls CertificateRegistry.revokeCertificate(hash)
    → Contract checks:
        - Certificate exists?
        - Not already revoked?
        - Caller is admin OR (caller is original issuer AND issuer still authorized)?
    → Sets cert.revoked = true
    → Emits CertificateRevoked event
    → Future verification returns valid=false
```

---

## 8. Implementation Explanation

### Smart Contract — CertificateRegistry.sol

**Key design decisions:**

1. **bytes32 storage:** SHA-256 hashes are exactly 32 bytes. Using `bytes32` instead of `string` saves gas and is more type-safe.

2. **Separate `exists` and `valid` fields:** Allows distinguishing "never registered" from "registered but revoked" — critical for correct UI display.

3. **Issuer disablement ≠ revocation:** Disabling an issuer prevents new issuance but does not automatically invalidate old certificates. This models reality: a retired professor's issued diplomas remain valid.

4. **Duplicate hash prevention:** If an exact same PDF is submitted twice, it is rejected. Note: two different PDFs with the same qualification would have different hashes.

5. **Zero hash rejection:** The zero bytes32 value is the Solidity default and could indicate an uninitialized value. Rejecting it prevents accidents.

### Frontend — React + Vite + Tailwind

1. **SHA-256 hashing:** Uses `window.crypto.subtle.digest("SHA-256", buffer)` — the browser's built-in, hardware-accelerated implementation. No library needed. File bytes are read via `FileReader.readAsArrayBuffer`.

2. **Read-only verification:** Uses `ethers.JsonRpcProvider` (not a wallet) for the verify page, so no MetaMask is needed.

3. **Write operations:** Use `ethers.BrowserProvider(window.ethereum)` to get a signer from MetaMask.

4. **Event-based certificate listing:** The University Dashboard queries `CertificateIssued` events filtered by issuer address. This is gas-free (event log reading) and automatically reflects on-chain state.

5. **Network detection:** After connecting MetaMask, the app checks `chainId` and warns if not on Hardhat local (31337).

---

## 9. Actual Test Results

> Test suite: `blockchain/test/CertificateRegistry.test.js`  
> Run with: `npx hardhat test`

| # | Test Case | Status |
|---|-----------|--------|
| TC-01 | Administrator authorizes an issuer | ✓ Pass |
| TC-02 | Non-administrator cannot manage issuers | ✓ Pass |
| TC-03 | Authorized university issues a certificate | ✓ Pass |
| TC-04 | Unauthorized account cannot issue | ✓ Pass |
| TC-05 | Registered certificate verifies as valid | ✓ Pass |
| TC-06 | Altered file produces different hash — not registered | ✓ Pass |
| TC-07 | Duplicate registration is rejected | ✓ Pass |
| TC-08 | Original issuer revokes its certificate | ✓ Pass |
| TC-09 | Administrator can revoke any certificate | ✓ Pass |
| TC-10 | Another university cannot revoke a different issuer's cert | ✓ Pass |
| TC-11 | Revoked certificate verifies as invalid | ✓ Pass |
| TC-12 | Unknown certificate returns exists=false, valid=false | ✓ Pass |
| TC-13 | Disabled issuer cannot issue new certificates | ✓ Pass |
| TC-14 | Pre-disablement certificates remain valid | ✓ Pass |
| TC-15 | Zero hash is rejected | ✓ Pass |
| TC-16 | Repeated revocation is rejected | ✓ Pass |

**SHA-256 implementation check:**  
The browser Web Crypto API is verified against the known SHA-256 test vector for "abc":
```
Expected: ba7816bf8f01cfea414140de5dae2ec73b00361bbef0469db5de85d274a2efd4
```
Verified by `verifySha256Implementation()` in `src/utils/sha256.js`.

---

## 10. Privacy, Scalability, and Security Analysis

### Privacy
- **PDF never uploaded:** All hashing occurs in the browser using Web Crypto API
- **Hash is not encryption:** SHA-256 is a one-way function — it cannot be reversed
- **Minimal on-chain data:** Only 32-byte hash, issuer address, and timestamp
- **GDPR consideration:** Even the hash could be considered personal data if combined with other information; production deployments should consult legal counsel

### Scalability
- **On-chain storage cost:** Each certificate registration costs approximately 65,000 gas (Ethereum units). At current gas prices on mainnet this is ~$1–5 USD per certificate. On a permissioned consortium chain, gas costs are negligible.
- **Event log querying:** The university dashboard queries events since block 0, which is acceptable for local dev but would need pagination or an indexer (e.g., The Graph) for production with thousands of certificates.
- **Throughput:** A university issuing ~1,000 diplomas per year would generate only ~1,000 transactions/year — trivial for any blockchain.

### Unauthorized Issuance
- A university's wallet private key must be compromised for unauthorized issuance
- The administrator can immediately disable the compromised address
- Certificates issued by a disabled issuer remain valid (disablement ≠ revocation); admin must revoke individually

### Compromised Keys
- If the **administrator key** is compromised, an attacker could authorize malicious issuers
- Mitigation: use a multi-signature wallet (e.g., Gnosis Safe) as the administrator in production
- If a **university key** is compromised, attacker can issue fraudulent certificates from that address
- Mitigation: admin disables the address immediately; existing certificates can be individually revoked

---

## 11. Limitations and Future Improvements

### Current Limitations
1. **Single administrator:** No multi-sig governance. Production should use a multi-sig or DAO.
2. **No certificate metadata on-chain:** Cannot search by student name — by design (privacy), but limits some use cases.
3. **Event log scanning:** Querying from block 0 doesn't scale to millions of records.
4. **No batch issuance:** Each certificate is a separate transaction. For graduation ceremonies, batch functions would save gas.
5. **Local network only:** Not accessible publicly.

### Future Improvements
1. **IPFS integration:** Store encrypted certificate metadata off-chain on IPFS; store IPFS CID on-chain.
2. **DID (Decentralized Identity):** Link certificates to W3C DIDs for portable verifiable credentials.
3. **Batch issuance:** `issueBatch(bytes32[] hashes)` to process full graduating classes in one transaction.
4. **Indexer (The Graph):** Enable fast querying without scanning all events.
5. **ZK-proofs:** Allow a student to prove they hold a valid certificate without revealing which one.
6. **Multi-sig admin:** Replace single admin with Gnosis Safe requiring M-of-N signatures.
7. **Mobile app:** QR code on printed certificates linking to the verification page.

---

## 12. Conclusion

This prototype demonstrates that blockchain technology provides a viable foundation for decentralized, tamper-evident academic certificate verification. The core insight is that storing only a 32-byte hash on-chain achieves tamper-evidence while preserving privacy — the PDF itself never leaves the user's device.

The system achieves its core goals:
- **Issuance:** Universities can register certificate hashes with full on-chain auditability.
- **Verification:** Anyone can verify a certificate without trusting a central server.
- **Revocation:** Certificates can be withdrawn, and the revoked status is immediately visible to all verifiers.

The prototype uses a local Hardhat network for development simplicity. A production deployment on a permissioned university consortium chain would address scalability, governance, and cost concerns while maintaining the same core smart contract logic.
