/**
 * Entry point for cPanel's Node.js Selector (Phusion Passenger).
 *
 * Passenger starts one file and expects it to listen. `next build` with
 * output:"standalone" emits its own server at .next/standalone/server.js
 * together with the minimal node_modules it needs, so this file's only job is
 * to set the working directory and hand over.
 *
 * PORT is supplied by Passenger. Do not hardcode it.
 */
const path = require("path");
const fs = require("fs");

const standalone = path.join(__dirname, ".next", "standalone", "server.js");

if (!fs.existsSync(standalone)) {
  console.error(
    "\n[netatrack] .next/standalone/server.js is missing.\n" +
      "Run a standalone build first:\n" +
      "  BUILD_STANDALONE=true npm run build\n" +
      "then copy .next/static and public into .next/standalone/ (npm run cpanel:prepare).\n"
  );
  process.exit(1);
}

process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.chdir(path.join(__dirname, ".next", "standalone"));
require(standalone);
