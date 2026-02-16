#!/usr/bin/env node

const { keccak256, toUtf8Bytes } = require("ethers");

function parseArgs(argv) {
  const result = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      result._.push(token);
      continue;
    }

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

function parseFunctionDeclaration(input) {
  const text = (input || "").trim();
  const normalized = text.replace(/^function\s+/, "");
  const matched = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/);
  if (!matched) return null;
  return {
    name: matched[1],
    argsList: matched[2].replace(/\s+/g, "")
  };
}

function buildSignature(name, argsList, index) {
  return `${name}_${index}(${argsList})`;
}

function selectorOf(signature) {
  return keccak256(toUtf8Bytes(signature)).slice(0, 10);
}

function printUsage() {
  console.log(`
用法:
  yarn selector "function transfer(address,address,uint256)" --start 0 --target-prefix 0x00000000
  yarn selector "transfer(address,address,uint256)" --start 0 --target-prefix 0x00000000
`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const fnDecl = args.function || args.f || args._[0];
  const parsedFnDecl = parseFunctionDeclaration(fnDecl || "");
  const name = parsedFnDecl ? parsedFnDecl.name : args.name;
  const argsList = parsedFnDecl ? parsedFnDecl.argsList : args.args || "";
  const start = Number(args.start || 0);
  const targetPrefix = (args["target-prefix"] || "0x00000000").toLowerCase();
  const maxTries = Number(args["max-tries"] || 1000000000);
  const progressStep = Number(args.progress || 500000);

  try {
    if (args.help || args["--help"]) {
      printUsage();
      return;
    }
    if (!name) {
      throw new Error("请传入函数声明，例如：\"function transfer(address,address,uint256)\"");
    }
    if (!Number.isInteger(start) || start < 0) throw new Error("--start 必须 >= 0");
    if (!targetPrefix.startsWith("0x")) {
      throw new Error("--target-prefix 必须以 0x 开头");
    }
    if (!Number.isInteger(maxTries) || maxTries <= 0) {
      throw new Error("--max-tries 必须是正整数");
    }
    if (!Number.isInteger(progressStep) || progressStep <= 0) {
      throw new Error("--progress 必须是正整数");
    }

    const startedAt = Date.now();
    for (let i = 0; i < maxTries; i += 1) {
      const n = start + i;
      const signature = buildSignature(name, argsList, n);
      const selector = selectorOf(signature);

      if (selector.startsWith(targetPrefix)) {
        console.log("[找到结果]");
        console.log(`原始函数: ${name}(${argsList})`);
        console.log(`函数签名: ${signature}`);
        console.log(`selector: ${selector}`);
        console.log(`编号: ${n}`);
        console.log(`尝试次数: ${i + 1}`);
        console.log(`耗时: ${((Date.now() - startedAt) / 1000).toFixed(2)}s`);
        return;
      }

      if ((i + 1) % progressStep === 0) {
        console.log(
          `[进度] 已尝试=${i + 1}, 当前=${signature}, selector=${selector}, 耗时=${(
            (Date.now() - startedAt) /
            1000
          ).toFixed(1)}s`
        );
      }
    }

    console.log("[未找到]");
    console.log(`在 ${maxTries} 次尝试内未命中，起始编号为 ${start}`);
  } catch (error) {
    console.error(`[错误] ${error.message}`);
    process.exitCode = 1;
  }
}

main();
