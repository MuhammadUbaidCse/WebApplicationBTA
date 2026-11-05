/**
 * create-demo-pdfs.js
 * Creates two minimal PDF files for demonstration:
 *   1. DEMO_CERTIFICATE.pdf    — original file
 *   2. DEMO_CERTIFICATE_MODIFIED.pdf — slightly modified (different hash)
 *
 * Uses only Node.js built-in modules — no external libraries needed.
 * The PDFs are intentionally marked "DEMO — NOT A REAL QUALIFICATION."
 */

const fs   = require("fs");
const path = require("path");
const crypto = require("crypto");

function buildPdf(content) {
  // Minimal valid PDF structure
  const objects = [];

  // Object 1: Catalog
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  // Object 2: Pages
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  // Object 3: Page
  objects.push("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]\n   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n");

  // Object 4: Content stream
  const stream = content;
  objects.push(`4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);

  // Object 5: Font
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n");

  // Build PDF bytes
  const header = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  let body     = "";
  const offsets = [];

  offsets.push(header.length); // obj 1
  body += objects[0];

  offsets.push(header.length + body.length);
  body += objects[1];

  offsets.push(header.length + body.length);
  body += objects[2];

  offsets.push(header.length + body.length);
  body += objects[3];

  offsets.push(header.length + body.length);
  body += objects[4];

  const xrefStart = header.length + body.length;

  // xref table
  let xref = "xref\n";
  xref += `0 ${objects.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  for (const off of offsets) {
    xref += String(off).padStart(10, "0") + " 00000 n \n";
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return header + body + xref + trailer;
}

// ── Certificate 1: Original ───────────────────────────────────────────────────
const originalContent = `BT
/F1 20 Tf
72 780 Td
(DEMO - NOT A REAL QUALIFICATION) Tj
0 -40 Td
/F1 16 Tf
(CERTIFICATE OF COMPLETION) Tj
0 -30 Td
/F1 12 Tf
(This is to certify that) Tj
0 -20 Td
(STUDENT NAME: Jane Doe [DEMO ONLY]) Tj
0 -20 Td
(PROGRAMME: Bachelor of Computer Science) Tj
0 -20 Td
(GRADE: First Class Honours [DEMO ONLY]) Tj
0 -20 Td
(DATE: January 2025 [DEMO ONLY]) Tj
0 -20 Td
(INSTITUTION: Demo University [FICTIONAL]) Tj
0 -40 Td
/F1 10 Tf
(THIS DOCUMENT IS FOR DEMONSTRATION PURPOSES ONLY.) Tj
0 -15 Td
(It does not represent a real academic qualification.) Tj
0 -15 Td
(For the blockchain verification demo: CS-491 BTA PBL.) Tj
0 -15 Td
(Hash this file to see the registered SHA-256 value.) Tj
ET`;

// ── Certificate 2: Modified (one character different → completely different hash) ──
const modifiedContent = `BT
/F1 20 Tf
72 780 Td
(DEMO - NOT A REAL QUALIFICATION) Tj
0 -40 Td
/F1 16 Tf
(CERTIFICATE OF COMPLETION) Tj
0 -30 Td
/F1 12 Tf
(This is to certify that) Tj
0 -20 Td
(STUDENT NAME: Jane Doe [DEMO ONLY]) Tj
0 -20 Td
(PROGRAMME: Bachelor of Computer Science) Tj
0 -20 Td
(GRADE: Second Class Honours [DEMO ONLY - MODIFIED]) Tj
0 -20 Td
(DATE: January 2025 [DEMO ONLY]) Tj
0 -20 Td
(INSTITUTION: Demo University [FICTIONAL]) Tj
0 -40 Td
/F1 10 Tf
(THIS DOCUMENT IS FOR DEMONSTRATION PURPOSES ONLY.) Tj
0 -15 Td
(MODIFIED VERSION: Grade changed from First to Second class.) Tj
0 -15 Td
(SHA-256 hash will be DIFFERENT from the original.) Tj
0 -15 Td
(This simulates a tampered certificate for the demo.) Tj
ET`;

const demoDir = path.join(__dirname, "../../demo");
fs.mkdirSync(demoDir, { recursive: true });

const orig = buildPdf(originalContent);
const mod  = buildPdf(modifiedContent);

fs.writeFileSync(path.join(demoDir, "DEMO_CERTIFICATE.pdf"), orig, "binary");
fs.writeFileSync(path.join(demoDir, "DEMO_CERTIFICATE_MODIFIED.pdf"), mod, "binary");

// Print SHA-256 of both so you can verify
const hash1 = crypto.createHash("sha256").update(Buffer.from(orig, "binary")).digest("hex");
const hash2 = crypto.createHash("sha256").update(Buffer.from(mod,  "binary")).digest("hex");

console.log("Demo PDFs created:");
console.log(`  DEMO_CERTIFICATE.pdf          SHA-256: ${hash1}`);
console.log(`  DEMO_CERTIFICATE_MODIFIED.pdf SHA-256: ${hash2}`);
console.log(`\n  Hashes are ${hash1 === hash2 ? "IDENTICAL (ERROR!)" : "DIFFERENT ✓ (as expected)"}`);
console.log("\nRegister the DEMO_CERTIFICATE.pdf hash in the demo, then");
console.log("verify with DEMO_CERTIFICATE_MODIFIED.pdf to show tamper detection.");
