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
  keystoreDir: KEYSTORE_DIR,
  group: "YOUR_GROUP",
  privateKeys: [
    "0xYOURKEY"
  ],
  password: "PASSWORD",
  keystoreInputs: [
    "0xYOUR_ADDRESS"
  ]
};

function assertNonEmpty(value, message) {
  if (!value || !String(value).trim()) {
    throw new Error(message);
  }
}

function normalizePrivateKey(privateKey) {
  assertNonEmpty(privateKey, "privateKeys 中存在空私钥");
  const normalized = String(privateKey).trim();
  const hexKey = normalized.startsWith("0x") ? normalized : `0x${normalized}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(hexKey)) {
    throw new Error("privateKeys 必须全部是 32 字节十六进制私钥，请先替换占位值");
  }
  return hexKey;
}

function normalizePrivateKeys(privateKeys) {
  if (!Array.isArray(privateKeys)) {
    throw new Error("privateKeys 必须是数组");
  }
  if (privateKeys.length === 0) {
    throw new Error("请先在 src/keystore.js 中填写 privateKeys 数组");
  }
  return privateKeys.map(normalizePrivateKey);
}

async function encryptPrivateKey(privateKey, password) {
  const normalizedPrivateKey = normalizePrivateKey(privateKey);
  assertNonEmpty(password, "请先在 src/keystore.js 中填写 password");
  const wallet = new Wallet(normalizedPrivateKey);
  return wallet.encrypt(String(password));
}

function normalizeAddress(address) {
  assertNonEmpty(address, "keystoreInputs 中存在空地址");
  const trimmed = String(address).trim().toLowerCase();
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

function normalizeKeystoreInputs(keystoreInputs) {
  if (!Array.isArray(keystoreInputs)) {
    throw new Error("keystoreInputs 必须是数组");
  }
  if (keystoreInputs.length === 0) {
    throw new Error("请先在 src/keystore.js 中填写 keystoreInputs 数组");
  }
  return keystoreInputs.map(normalizeAddress);
}

function normalizeGroup(group) {
  assertNonEmpty(group, "请先填写 group");
  const normalized = path.normalize(String(group).trim());
  if (
    normalized === "." ||
    path.isAbsolute(normalized) ||
    normalized === ".." ||
    normalized.startsWith(`..${path.sep}`) ||
    normalized.includes(`${path.sep}..${path.sep}`) ||
    normalized.endsWith(`${path.sep}..`)
  ) {
    throw new Error("group 必须是 keystoreDir 下的相对目录，不能使用绝对路径或 ..");
  }
  return normalized;
}

function getGroupDir(keystoreDir, group) {
  assertNonEmpty(keystoreDir, "请先填写 keystoreDir");
  return path.join(String(keystoreDir), normalizeGroup(group));
}

function ensureKeystoreDir(dirPath = KEYSTORE_DIR) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function findKeystorePathByAddress(keystoreDir, address, group) {
  const normalizedAddress = normalizeAddress(address);
  const groupDir = getGroupDir(keystoreDir, group);
  if (!fs.existsSync(groupDir)) {
    throw new Error(`keystore group 目录不存在: ${groupDir}`);
  }

  const files = fs.readdirSync(groupDir);
  const matched = files.find((fileName) => {
    if (!fileName.toLowerCase().endsWith(".json")) return false;
    const account = fileName.slice(0, -5).toLowerCase();
    return account === normalizedAddress;
  });

  if (!matched) {
    throw new Error(`未找到地址 ${normalizedAddress} 在 group ${normalizeGroup(group)} 中对应的 keystore 文件`);
  }

  return path.join(groupDir, matched);
}

function readKeystoreInput(keystoreInput, keystoreDir = KEYSTORE_DIR, group) {
  const filePath = findKeystorePathByAddress(keystoreDir, keystoreInput, group);
  return fs.readFileSync(filePath, "utf8");
}

async function decryptKeystore(keystoreInput, password, keystoreDir = KEYSTORE_DIR, group) {
  assertNonEmpty(password, "请先在 src/keystore.js 中填写 password");
  const json = readKeystoreInput(keystoreInput, keystoreDir, group);
  const wallet = await Wallet.fromEncryptedJson(json, String(password));
  return {
    address: wallet.address,
    privateKey: wallet.privateKey
  };
}

async function encryptPrivateKeysToKeystores({
  privateKeys,
  password,
  group,
  keystoreDir = KEYSTORE_DIR
}) {
  assertNonEmpty(password, "请先在 src/keystore.js 中填写 password");
  const normalizedPrivateKeys = normalizePrivateKeys(privateKeys);
  const groupDir = ensureKeystoreDir(getGroupDir(keystoreDir, group));
  const results = [];

  for (const privateKey of normalizedPrivateKeys) {
    const wallet = new Wallet(privateKey);
    const json = await wallet.encrypt(String(password));
    const outputPath = path.join(groupDir, `${wallet.address}.json`);
    fs.writeFileSync(outputPath, json, "utf8");
    results.push({
      address: wallet.address,
      outputPath,
      json
    });
  }

  return results;
}

async function decryptKeystores({
  keystoreInputs,
  password,
  group,
  keystoreDir = KEYSTORE_DIR
}) {
  assertNonEmpty(password, "请先在 src/keystore.js 中填写 password");
  const normalizedInputs = normalizeKeystoreInputs(keystoreInputs);
  const results = [];

  for (const keystoreInput of normalizedInputs) {
    results.push(await decryptKeystore(keystoreInput, password, keystoreDir, group));
  }

  return results;
}

async function runEncryptMode() {
  const results = await encryptPrivateKeysToKeystores({
    privateKeys: CONFIG.privateKeys,
    password: CONFIG.password,
    group: CONFIG.group,
    keystoreDir: CONFIG.keystoreDir
  });

  console.log("[加密完成]");
  console.log(`group: ${normalizeGroup(CONFIG.group)}`);
  for (const result of results) {
    console.log(`地址: ${result.address}`);
    console.log(`keystore 输出: ${result.outputPath}`);
  }
}

async function runDecryptMode() {
  const restoredWallets = await decryptKeystores({
    keystoreInputs: CONFIG.keystoreInputs,
    password: CONFIG.password,
    group: CONFIG.group,
    keystoreDir: CONFIG.keystoreDir
  });

  console.log("[解密完成]");
  console.log(`group: ${normalizeGroup(CONFIG.group)}`);
  for (const restored of restoredWallets) {
    console.log(`地址: ${restored.address}`);
    console.log(`私钥: ${restored.privateKey}`);
  }
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
  decryptKeystores,
  ensureKeystoreDir,
  encryptPrivateKey,
  encryptPrivateKeysToKeystores,
  findKeystorePathByAddress,
  getGroupDir,
  normalizeAddress,
  normalizeGroup,
  normalizeKeystoreInputs,
  normalizePrivateKey,
  normalizePrivateKeys,
  readKeystoreInput
};
