# Viva Questions & Answers
## University Certificate Verification System — CS-491 BTA PBL

---

### Q1. Why use blockchain for certificate verification instead of a regular database?

**Answer:**  
A regular database is controlled by a single organization — if that organization goes offline, is compromised, or acts maliciously, the records cannot be trusted. A blockchain is maintained by multiple nodes, so no single party can alter or delete records without consensus. Records are permanent, publicly auditable, and do not require trusting a central authority. This makes blockchain ideal for cross-institutional trust scenarios like certificate verification.

---

### Q2. What is stored on the blockchain in this system? What is NOT stored?

**Answer:**  
**Stored on-chain:** The SHA-256 hash of the certificate PDF (32 bytes), the issuer wallet address, the block timestamp of registration, and the revocation status (boolean).  
**NOT stored on-chain:** The certificate PDF itself, student names, grades, or any personal information. PDFs are processed entirely in the user's browser — they are never sent to any server.

---

### Q3. What is SHA-256? Why use it instead of Ethereum's keccak256?

**Answer:**  
SHA-256 (Secure Hash Algorithm 256-bit) is a widely-used cryptographic hash function that produces a 32-byte fingerprint from any input. We use SHA-256 — not Ethereum's keccak256 — because:
1. SHA-256 is universally available (built into browsers, Python, Java, etc.), so the hash can be independently verified by anyone with standard tools.
2. Consistency: both the university and the verifier must use the same algorithm. Using SHA-256 in the browser (Web Crypto API) and keccak256 in the contract would produce different hashes for the same file, silently breaking verification.

---

### Q4. How does the system detect a tampered or modified certificate?

**Answer:**  
SHA-256 has the "avalanche effect" — even a single bit change in the input produces a completely different 256-bit output. If someone modifies a certificate PDF (changes a grade, adds a watermark, prints and re-scans it), the SHA-256 hash of the modified file will be completely different from the hash registered on the blockchain. Verification will return "Not Registered" for the modified file, alerting the verifier.

---

### Q5. Why does the Verify page not require a MetaMask wallet?

**Answer:**  
The `verifyCertificate` function in the smart contract is a `view` function — it only reads state from the blockchain without modifying it. Read-only calls do not require a transaction, gas fees, or a wallet signature. The frontend uses a plain `JsonRpcProvider` (a direct HTTP connection to the blockchain node) for verification. This allows anyone — including employers with no crypto knowledge — to verify certificates without setting up MetaMask.

---

### Q6. What is the difference between "disabling an issuer" and "revoking a certificate"?

**Answer:**  
**Disabling an issuer** removes their authorization to issue NEW certificates. It does NOT automatically affect certificates they previously issued — those remain valid. This models a real scenario: if a university professor retires, their previously signed documents remain legitimate.  
**Revoking a certificate** marks a specific certificate hash as invalid. Future verification of that exact file will show "Revoked." Revocation is specific to one certificate and is irreversible on-chain.

---

### Q7. What happens if the same certificate PDF is submitted for registration twice?

**Answer:**  
The second registration is rejected by the smart contract with the error "CertReg: certificate already registered." The contract checks `certificates[certHash].exists` before storing. If `exists` is already `true`, the transaction reverts. This prevents duplicate entries but note that two *different* PDFs describing the same qualification would have different hashes and would not be detected as duplicates.

---

### Q8. What is the administrator's role? Why is there only one?

**Answer:**  
The administrator is the wallet that deployed the smart contract. They can:
- Authorize new university issuer wallets
- Disable compromised issuers
- Revoke any certificate

There is only one administrator in this prototype for simplicity. In a production system, the administrator role should be a **multi-signature wallet** (requiring M-of-N signatures from committee members) to prevent a single compromised key from granting malicious authorizations.

---

### Q9. What is a smart contract? How does CertificateRegistry.sol work?

**Answer:**  
A smart contract is a program stored on the blockchain that runs automatically when called, with no possibility of interference or downtime. `CertificateRegistry.sol` is written in Solidity and deployed to an Ethereum-compatible network.  
It maintains two mappings: one for authorized issuers and one for certificate records indexed by SHA-256 hash. Functions like `issueCertificate` and `revokeCertificate` modify state (require transactions), while `verifyCertificate` only reads state (free, no wallet needed). All state changes emit events logged permanently on the blockchain.

---

### Q10. What does "valid" mean in the verification result? What does it NOT mean?

**Answer:**  
A "valid" result means: **the exact bytes of the presented PDF file were registered by the recorded issuer wallet and have not been revoked.**  
It does NOT mean:
- The holder of the PDF is the person named in it (identity verification is separate)
- The academic achievement described is truthful (the smart contract does not read PDF contents)
- The issuing institution still exists or is accredited
A valid blockchain record proves file integrity and registration provenance, not academic truth.

---

### Q11. What is a Hardhat network? Is this a real blockchain?

**Answer:**  
Hardhat is a development framework for Ethereum. The Hardhat network is a local, in-process Ethereum simulation. It uses the same EVM (Ethereum Virtual Machine) as real Ethereum but runs only on your computer, mines blocks instantly, and uses test accounts with no real monetary value. It is a real blockchain in the technical sense (it has blocks, transactions, and smart contracts) but is not connected to any public network. This is ideal for development: free, fast, and reproducible. A production deployment would use a real permissioned or public network.

---

### Q12. What happens when an issuer's key is compromised?

**Answer:**  
If a university's private key is stolen:
1. The attacker can issue fraudulent certificates from that address until the key is deactivated.
2. The administrator immediately calls `disableIssuer(compromisedAddress)`.
3. No new certificates can be issued from that address.
4. The administrator must then individually revoke any fraudulent certificates issued by the attacker.
5. The previously legitimate certificates from that address remain valid unless separately revoked.
Mitigation: universities should use hardware wallets (e.g., Ledger) for signing to prevent key theft.

---

### Q13. Why is the zero hash rejected by the contract?

**Answer:**  
In Solidity, `bytes32(0)` (32 zero bytes) is the default/uninitialized value. Storing a zero hash would collide with uninitialized state and could cause the contract to behave incorrectly — for example, treating any unregistered certificate lookup as "registered." By explicitly rejecting zero, the contract ensures every stored hash corresponds to an actual file.

---

### Q14. How are events used in this system?

**Answer:**  
Solidity events are logged to the Ethereum transaction receipt and stored in the block, but they do not consume regular contract storage (making them cheaper). Events used:
- `CertificateIssued(hash, issuer, timestamp)` — logged when a certificate is registered
- `CertificateRevoked(hash, revokedBy)` — logged on revocation
- `IssuerAuthorized/Disabled(issuer)` — logged on issuer changes

The University Dashboard uses `contract.queryFilter(CertificateIssued, 0, "latest")` to fetch the history of certificates issued by the connected address without any off-chain database.

---

### Q15. What is the difference between this system and a regular website QR code verification?

**Answer:**  
| Aspect | Website QR Verification | Blockchain (This System) |
|--------|------------------------|--------------------------|
| **Single point of failure** | Yes — server goes down → verification fails | No — multiple nodes |
| **Can be tampered** | Server admin can alter records | Immutable once recorded |
| **Trust requirement** | Trust the server operator | Trust only the math |
| **Availability** | Depends on server uptime | Blockchain is always available |
| **Cost** | Server hosting fees | Transaction gas (one-time per cert) |
| **Auditability** | Private logs | Public, transparent |

The blockchain approach removes the need to trust a central operator, making it more suitable for cross-institutional verification.

---

### Q16 (Bonus). Can a certificate holder change their grade in the PDF and still pass verification?

**Answer:**  
No. SHA-256 produces a unique fingerprint for any given file. If a student modifies even one character in the PDF (e.g., changes "B+" to "A"), the SHA-256 hash of the modified file will be completely different from the hash registered on the blockchain. Verification would return "Not Registered." The avalanche property of SHA-256 guarantees this — there is no way to make a meaningful change to a file without changing its hash.
