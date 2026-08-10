// ===== Utility: hash password dengan bcrypt =====
// Usage: npm run hash-password -- <password>
//   contoh: npm run hash-password -- hayko123
//
// Output: hash bcrypt siap dipaste ke SQL atau env.

import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Usage: npm run hash-password -- <password>");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log("Password :", password);
console.log("Hash     :", hash);

// Verifikasi cepat
const ok = bcrypt.compareSync(password, hash);
console.log("Verify   :", ok ? "OK ✓" : "FAIL ✗");
