# ether-utils

基于 `ethers + bun` 的 EVM 小工具，包含三个独立脚本文件：

1. `src/vanity.js`：生成指定开头、指定结尾、或同时指定开头结尾的 EVM 地址
2. `src/selector.js`：通过函数名数字自增，查找满足目标前缀的 function selector
3. `src/keystore.js`：使用文件内配置完成私钥与 keystore JSON 的互转

## 安装依赖

```bash
bun install
```

## 功能 1：地址靓号生成（`src/vanity.js`）

仅指定开头：

```bash
bun run vanity --starts-with abcd
```

仅指定结尾：

```bash
bun run vanity --ends-with 1234
```

同时指定开头和结尾：

```bash
bun run vanity --starts-with ab --ends-with cd --count 2
```

常用参数：

- `--starts-with` 地址开头（可带或不带 `0x`）
- `--ends-with` 地址结尾（可带或不带 `0x`）
- `--count` 需要命中的数量，默认 `1`
- `--progress` 每多少次尝试输出一次进度，默认 `10000`

## 功能 2：自增函数名挖 selector（`src/selector.js`）

会按以下形式持续尝试：

- `transfer_0(address,address,uint256)`
- `transfer_1(address,address,uint256)`
- `transfer_2(address,address,uint256)`
- ...

查找 selector 以 `0x00000000` 开头的结果：

```bash
bun run selector "function transfer(address,address,uint256)" --start 0 --target-prefix 0x00000000
```

常用参数：

- 位置参数：函数声明字符串，例如 `"function transfer(address,address,uint256)"`（也支持不写 `function`）
- `--start` 起始编号，默认 `0`
- `--target-prefix` selector 前缀，默认 `0x00000000`
- `--max-tries` 最大尝试次数，默认 `1000000000`
- `--progress` 每多少次尝试输出一次进度，默认 `500000`

兼容旧写法（仍可用）：

```bash
bun run selector --name transfer --args address,address,uint256
```

## 功能 3：私钥与 keystore 互转（`src/keystore.js`）

这个脚本不走命令行参数，而是直接修改文件顶部的 `CONFIG`：

```js
const MODES = {
  ENCRYPT: "encrypt",
  DECRYPT: "decrypt"
};

const CONFIG = {
  mode: MODES.ENCRYPT,
  privateKey: "0xYOUR_PRIVATE_KEY",
  password: "YOUR_KEYSTORE_PASSWORD",
  keystoreInput: "0xYOUR_ADDRESS"
};
```

私钥转 keystore：

1. 把 `mode` 设为 `MODES.ENCRYPT`
2. 填好 `privateKey` 和 `password`
3. 运行：

```bash
bun run keystore
```

脚本会自动：

- 创建项目根目录下的 `keystores/`
- 输出到 `keystores/<钱包地址>.json`

keystore 转私钥：

1. 把 `mode` 设为 `MODES.DECRYPT`
2. 填好 `password`
3. 把 `keystoreInput` 设为钱包地址
4. 运行：

```bash
bun run keystore
```

脚本会在 `keystores/` 目录下自动按地址查找对应文件，比较时不区分大小写。

## 说明

- 地址靓号和特殊 selector 都是概率问题，目标越苛刻，耗时越长。
- 请妥善保管输出的私钥和助记词，不要泄露。
- `src/keystore.js` 默认是占位配置，使用前请先把私钥、密码和 keystore 内容改成你自己的值。
