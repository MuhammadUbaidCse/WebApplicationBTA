const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * CertificateRegistry — Automated Test Suite
 * CS-491 BTA PBL — University Certificate Verification System
 *
 * 16 test cases as specified in the project requirements.
 * Each test case is numbered and labeled so results are traceable in the report.
 */

// Helper: produce a non-zero bytes32 value for testing
function makeHash(seed) {
  return ethers.id(seed); // keccak256 of seed string — used ONLY in tests to
                           // generate unique 32-byte values; the actual system
                           // uses SHA-256 from the browser's Web Crypto API.
}

describe("CertificateRegistry", function () {
  let registry;
  let admin, university, university2, randomUser;

  beforeEach(async function () {
    [admin, university, university2, randomUser] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CertificateRegistry");
    registry = await Factory.deploy();
    await registry.waitForDeployment();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-01: Administrator authorizes an issuer
  // ─────────────────────────────────────────────────────────────────────────
  it("TC-01: Administrator can authorize an issuer", async function () {
    await expect(registry.connect(admin).authorizeIssuer(university.address))
      .to.emit(registry, "IssuerAuthorized")
      .withArgs(university.address);

    expect(await registry.authorizedIssuers(university.address)).to.equal(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-02: Non-administrator cannot manage issuers
  // ─────────────────────────────────────────────────────────────────────────
  it("TC-02: Non-administrator cannot authorize issuers", async function () {
    await expect(
      registry.connect(randomUser).authorizeIssuer(university.address)
    ).to.be.revertedWith("CertReg: caller is not administrator");

    await expect(
      registry.connect(university).disableIssuer(university2.address)
    ).to.be.revertedWith("CertReg: caller is not administrator");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-03: Authorized university issues a certificate
  // ─────────────────────────────────────────────────────────────────────────
  it("TC-03: Authorized issuer can register a certificate", async function () {
    await registry.connect(admin).authorizeIssuer(university.address);
    const hash = makeHash("cs491-cert-001");

    const tx = await registry.connect(university).issueCertificate(hash);
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);

    await expect(tx)
      .to.emit(registry, "CertificateIssued")
      .withArgs(hash, university.address, block.timestamp);

    // Verify issuance
    const [exists, valid, issuer] = await registry.verifyCertificate(hash);
    expect(exists).to.equal(true);
    expect(valid).to.equal(true);
    expect(issuer).to.equal(university.address);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-04: Unauthorized account cannot issue
  // ─────────────────────────────────────────────────────────────────────────
  it("TC-04: Unauthorized account cannot issue certificates", async function () {
    const hash = makeHash("unauthorized-attempt");
    await expect(
      registry.connect(randomUser).issueCertificate(hash)
    ).to.be.revertedWith("CertReg: caller is not an authorized issuer");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-05: Registered certificate verifies as valid
  // ─────────────────────────────────────────────────────────────────────────
  it("TC-05: Registered certificate verifies as valid (exists=true, valid=true)", async function () {
    await registry.connect(admin).authorizeIssuer(university.address);
    const hash = makeHash("valid-cert");
    await registry.connect(university).issueCertificate(hash);

    const [exists, valid, issuer, issuedAt] = await registry.verifyCertificate(hash);
    expect(exists).to.equal(true);
    expect(valid).to.equal(true);
    expect(issuer).to.equal(university.address);
    expect(issuedAt).to.be.gt(0n);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-06: Altered file produces a different hash and is not registered
  // ─────────────────────────────────────────────────────────────────────────
  it("TC-06: Different hash (simulating modified file) returns exists=false", async function () {
    await registry.connect(admin).authorizeIssuer(university.address);
    const originalHash = makeHash("original-cert-bytes");
    await registry.connect(university).issueCertificate(originalHash);

    // Slightly different seed => completely different hash (avalanche effect)
    const alteredHash = makeHash("original-cert-bytes-altered");

    const [exists, valid] = await registry.verifyCertificate(alteredHash);
    expect(exists).to.equal(false);
    expect(valid).to.equal(false);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-07: Duplicate registration is rejected
  // ─────────────────────────────────────────────────────────────────────────
  it("TC-07: Duplicate registration is rejected", async function () {
    await registry.connect(admin).authorizeIssuer(university.address);
    const hash = makeHash("duplicate-cert");
    await registry.connect(university).issueCertificate(hash);

    await expect(
      registry.connect(university).issueCertificate(hash)
    ).to.be.revertedWith("CertReg: certificate already registered");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-08: Original issuer can revoke its own certificate
  // ─────────────────────────────────────────────────────────────────────────
  it("TC-08: Original issuer can revoke its certificate while authorized", async function () {
    await registry.connect(admin).authorizeIssuer(university.address);
    const hash = makeHash("revocable-cert");
    await registry.connect(university).issueCertificate(hash);

    await expect(registry.connect(university).revokeCertificate(hash))
      .to.emit(registry, "CertificateRevoked")
      .withArgs(hash, university.address);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-09: Administrator can revoke any certificate
  // ─────────────────────────────────────────────────────────────────────────
  it("TC-09: Administrator can revoke any certificate", async function () {
    await registry.connect(admin).authorizeIssuer(university.address);
    const hash = makeHash("admin-revoke-cert");
    await registry.connect(university).issueCertificate(hash);

    await expect(registry.connect(admin).revokeCertificate(hash))
      .to.emit(registry, "CertificateRevoked")
      .withArgs(hash, admin.address);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-10: Another university cannot revoke another's certificate
  // ─────────────────────────────────────────────────────────────────────────
  it("TC-10: Another authorized university cannot revoke a different issuer's certificate", async function () {
    await registry.connect(admin).authorizeIssuer(university.address);
    await registry.connect(admin).authorizeIssuer(university2.address);

    const hash = makeHash("uni1-cert");
    await registry.connect(university).issueCertificate(hash);

    await expect(
      registry.connect(university2).revokeCertificate(hash)
    ).to.be.revertedWith("CertReg: caller not permitted to revoke");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-11: Revoked certificate verifies as invalid
  // ─────────────────────────────────────────────────────────────────────────
  it("TC-11: Revoked certificate verifies as invalid (exists=true, valid=false)", async function () {
    await registry.connect(admin).authorizeIssuer(university.address);
    const hash = makeHash("revoked-verification-cert");
    await registry.connect(university).issueCertificate(hash);
    await registry.connect(admin).revokeCertificate(hash);

    const [exists, valid] = await registry.verifyCertificate(hash);
    expect(exists).to.equal(true);
    expect(valid).to.equal(false);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-12: Unknown certificate returns exists=false and valid=false
  // ─────────────────────────────────────────────────────────────────────────
  it("TC-12: Unknown hash returns exists=false and valid=false", async function () {
    const unknownHash = makeHash("never-registered");
    const [exists, valid, issuer, issuedAt] = await registry.verifyCertificate(unknownHash);
    expect(exists).to.equal(false);
    expect(valid).to.equal(false);
    expect(issuer).to.equal(ethers.ZeroAddress);
    expect(issuedAt).to.equal(0n);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-13: Disabled issuer cannot issue new certificates
  // ─────────────────────────────────────────────────────────────────────────
  it("TC-13: Disabled issuer cannot issue new certificates", async function () {
    await registry.connect(admin).authorizeIssuer(university.address);
    await registry.connect(admin).disableIssuer(university.address);

    const hash = makeHash("post-disable-cert");
    await expect(
      registry.connect(university).issueCertificate(hash)
    ).to.be.revertedWith("CertReg: caller is not an authorized issuer");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-14: Previously issued certificates remain valid after issuer disablement
  // ─────────────────────────────────────────────────────────────────────────
  it("TC-14: Certificates issued before disablement stay valid unless separately revoked", async function () {
    await registry.connect(admin).authorizeIssuer(university.address);
    const hash = makeHash("pre-disable-cert");
    await registry.connect(university).issueCertificate(hash);

    // Disable the issuer
    await registry.connect(admin).disableIssuer(university.address);

    // Old certificate should still be valid
    const [exists, valid] = await registry.verifyCertificate(hash);
    expect(exists).to.equal(true);
    expect(valid).to.equal(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-15: Zero hash is rejected
  // ─────────────────────────────────────────────────────────────────────────
  it("TC-15: Zero hash is rejected by issueCertificate", async function () {
    await registry.connect(admin).authorizeIssuer(university.address);
    await expect(
      registry.connect(university).issueCertificate(ethers.ZeroHash)
    ).to.be.revertedWith("CertReg: zero hash rejected");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-16: Repeated revocation is rejected
  // ─────────────────────────────────────────────────────────────────────────
  it("TC-16: Revoking an already-revoked certificate is rejected", async function () {
    await registry.connect(admin).authorizeIssuer(university.address);
    const hash = makeHash("double-revoke-cert");
    await registry.connect(university).issueCertificate(hash);
    await registry.connect(admin).revokeCertificate(hash);

    await expect(
      registry.connect(admin).revokeCertificate(hash)
    ).to.be.revertedWith("CertReg: already revoked");
  });
});
