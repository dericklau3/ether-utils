#!/usr/bin/env node

const { Wallet } = require("ethers");

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;

    const eqIndex = token.indexOf("=");
    if (eqIndex > -1) {
      const key = token.slice(2, eqIndex);
      result[key] = token.slice(eqIndex + 1);
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      result[key] = next;
      i += 1;
    } else {
      result[key] = true;
    }
  }
  return result;
}

function normalizeHex(input) {
  return (input || "").toLowerCase().replace(/^0x/, "");
}

function matchVanity(address, start, end) {
  const body = normalizeHex(address);
  if (start && !body.startsWith(start)) return false;
  if (end && !body.endsWith(end)) return false;
  return true;
}

function printUsage() {
  console.log(`
用法:
  yarn vanity --starts-with abcd
  yarn vanity --ends-with 1234
  yarn vanity --starts-with ab --ends-with cd --count 2
`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const start = normalizeHex(args["starts-with"]);
  const end = normalizeHex(args["ends-with"]);
  const count = Number(args.count || 1);
  const progressStep = Number(args.progress || 10000);

  try {
    if (args.help || args["--help"]) {
      printUsage();
      return;
    }
    if (!start && !end) {
      throw new Error("请至少提供 --starts-with 或 --ends-with");
    }
    if (!Number.isInteger(count) || count <= 0) {
      throw new Error("--count 必须是正整数");
    }
    if (!Number.isInteger(progressStep) || progressStep <= 0) {
      throw new Error("--progress 必须是正整数");
    }

    let attempts = 0;
    let found = 0;
    const startedAt = Date.now();

    while (found < count) {
      attempts += 1;
      const wallet = Wallet.createRandom();

      if (!matchVanity(wallet.address, start, end)) {
        if (attempts % progressStep === 0) {
          console.log(
            `[进度] 尝试=${attempts}, 命中=${found}, 耗时=${(
              (Date.now() - startedAt) /
              1000
            ).toFixed(1)}s`
          );
        }
        continue;
      }

      found += 1;
      console.log(`\n[命中 ${found}/${count}]`);
      console.log(`地址: ${wallet.address}`);
      console.log(`私钥: ${wallet.privateKey}`);
      console.log(`助记词: ${wallet.mnemonic ? wallet.mnemonic.phrase : "(none)"}`);
      console.log(`总尝试次数: ${attempts}`);
    }
  } catch (error) {
    console.error(`[错误] ${error.message}`);
    process.exitCode = 1;
  }
}

main();
