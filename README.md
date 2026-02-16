# ether-utils

基于 `ethers + yarn` 的 EVM 小工具，包含两个独立脚本文件：

1. `src/vanity.js`：生成指定开头、指定结尾、或同时指定开头结尾的 EVM 地址
2. `src/selector.js`：通过函数名数字自增，查找满足目标前缀的 function selector

## 安装依赖

```bash
yarn install
```

## 功能 1：地址靓号生成（`src/vanity.js`）

仅指定开头：

```bash
yarn vanity --starts-with abcd
```

仅指定结尾：

```bash
yarn vanity --ends-with 1234
```

同时指定开头和结尾：

```bash
yarn vanity --starts-with ab --ends-with cd --count 2
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
yarn selector "function transfer(address,address,uint256)" --start 0 --target-prefix 0x00000000
```

常用参数：

- 位置参数：函数声明字符串，例如 `"function transfer(address,address,uint256)"`（也支持不写 `function`）
- `--start` 起始编号，默认 `0`
- `--target-prefix` selector 前缀，默认 `0x00000000`
- `--max-tries` 最大尝试次数，默认 `1000000000`
- `--progress` 每多少次尝试输出一次进度，默认 `500000`

兼容旧写法（仍可用）：

```bash
yarn selector --name transfer --args address,address,uint256
```

## 说明

- 地址靓号和特殊 selector 都是概率问题，目标越苛刻，耗时越长。
- 请妥善保管输出的私钥和助记词，不要泄露。
