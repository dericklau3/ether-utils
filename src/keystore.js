#!/usr/bin/env bun

const fs = require("fs");
const path = require("path");
const { Wallet } = require("ethers");

const MODES = {
  ENCRYPT: "encrypt",
  DECRYPT: "decrypt"
};

const KEYSTORE_DIR = path.join(process.cwd(), "keystores");

const CONFIG = {
  mode: MODES.ENCRYPT,
  privateKey: "0xYOUR_PRIVATEKEY",
  password: "YOUR_PASSWORD",
  keystoreInput: "0xYOUR_ADDRESS"
};

function assertNonEmpty(value, message) {
  if (!value || !String(value).trim()) {
    throw new Error(message);
  }
}

function normalizePrivateKey(privateKey) {
  assertNonEmpty(privateKey, "请先在 src/keystore.js 中填写 privateKey");
  const normalized = String(privateKey).trim();
  const hexKey = normalized.startsWith("0x") ? normalized : `0x${normalized}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(hexKey)) {
    throw new Error("privateKey 必须是 32 字节十六进制私钥，请先替换占位值");
  }
  return hexKey;
}

async function encryptPrivateKey(privateKey, password) {
  const normalizedPrivateKey = normalizePrivateKey(privateKey);
  assertNonEmpty(password, "请先在 src/keystore.js 中填写 password");
  const wallet = new Wallet(normalizedPrivateKey);
  return wallet.encrypt(String(password));
}

function normalizeAddress(address) {
  assertNonEmpty(address, "请先在 src/keystore.js 中填写 keystoreInput 地址");
  const trimmed = String(address).trim().toLowerCase();
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

function ensureKeystoreDir(dirPath = KEYSTORE_DIR) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function findKeystorePathByAddress(dirPath, address) {
  const normalizedAddress = normalizeAddress(address);
  if (!fs.existsSync(dirPath)) {
    throw new Error(`keystores 目录不存在: ${dirPath}`);
  }

  const files = fs.readdirSync(dirPath);
  const matched = files.find((fileName) => {
    if (!fileName.toLowerCase().endsWith(".json")) return false;
    const account = fileName.slice(0, -5).toLowerCase();
    return account === normalizedAddress;
  });

  if (!matched) {
    throw new Error(`未找到地址 ${normalizedAddress} 对应的 keystore 文件`);
  }

  return path.join(dirPath, matched);
}

function readKeystoreInput(keystoreInput, dirPath = KEYSTORE_DIR) {
  const filePath = findKeystorePathByAddress(dirPath, keystoreInput);
  return fs.readFileSync(filePath, "utf8");
}

async function decryptKeystore(keystoreInput, password, dirPath = KEYSTORE_DIR) {
  assertNonEmpty(password, "请先在 src/keystore.js 中填写 password");
  const json = readKeystoreInput(keystoreInput, dirPath);
  const wallet = await Wallet.fromEncryptedJson(json, String(password));
  return {
    address: wallet.address,
    privateKey: wallet.privateKey
  };
}

async function runEncryptMode() {
  const json = await encryptPrivateKey(CONFIG.privateKey, CONFIG.password);
  const wallet = new Wallet(normalizePrivateKey(CONFIG.privateKey));
  const dirPath = ensureKeystoreDir();
  const outputPath = path.join(dirPath, `${wallet.address}.json`);
  fs.writeFileSync(outputPath, json, "utf8");

  console.log("[加密完成]");
  console.log(`地址: ${wallet.address}`);
  console.log(`keystore 输出: ${outputPath}`);
  console.log("keystore 内容:");
  console.log(json);
}

async function runDecryptMode() {
  const restored = await decryptKeystore(CONFIG.keystoreInput, CONFIG.password);

  console.log("[解密完成]");
  console.log(`地址: ${restored.address}`);
  console.log(`私钥: ${restored.privateKey}`);
}

async function main() {
  try {
    if (CONFIG.mode === MODES.ENCRYPT) {
      await runEncryptMode();
      return;
    }
    if (CONFIG.mode === MODES.DECRYPT) {
      await runDecryptMode();
      return;
    }

    throw new Error(
      `mode 仅支持 MODES.ENCRYPT (${MODES.ENCRYPT}) 或 MODES.DECRYPT (${MODES.DECRYPT})`
    );
  } catch (error) {
    console.error(`[错误] ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  CONFIG,
  KEYSTORE_DIR,
  MODES,
  decryptKeystore,
  ensureKeystoreDir,
  encryptPrivateKey,
  findKeystorePathByAddress,
  normalizeAddress,
  normalizePrivateKey,
  readKeystoreInput
};
