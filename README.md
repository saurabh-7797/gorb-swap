# Gorb Swap Contract

A complete Automated Market Maker (AMM) implementation on Solana with native SOL support, multihop swaps, and comprehensive testing suite.

## 🚀 Features

- **Native SOL Integration**: Direct SOL trading without wrapping
- **Multihop Swaps**: Atomic multi-leg swaps in single transactions
- **Liquidity Pools**: Create, add, and remove liquidity
- **Token Swaps**: Bidirectional token trading
- **Comprehensive Testing**: 50+ TypeScript scripts for all operations
- **Pool Queries**: Real-time pool information and swap quotes

## 📋 Prerequisites

- Node.js >= 16.0.0
- Rust (latest stable)
- Solana CLI tools
- Git

## 🛠️ Installation

1. **Clone the repository:**
```bash
git clone https://github.com/saurabh-7797/gorb-swap.git
cd gorb-swap
git checkout gorb-swap-contract-main
```

2. **Install dependencies:**
```bash
npm install
```

3. **Build the Solana program:**
```bash
npm run build
```

4. **Deploy the program:**
```bash
npm run deploy
```

## 🎯 Quick Start

### 1. Create Tokens
```bash
# Create Token X, Y, and Z
npm run create:tokenx
npm run create:tokeny
npm run create:tokenz
```

### 2. Initialize Pools
```bash
# Create X-Y pool
npm run init:pool-xy

# Create Y-Z pool
npm run init:pool-yz

# Create Native SOL pool
npm run init:pool-native
```

### 3. Add Liquidity
```bash
# Add liquidity to X-Y pool
npm run add:liquidity-xy

# Add liquidity to Native SOL pool
npm run add:liquidity-native
```

### 4. Perform Swaps
```bash
# Swap X to Y
npm run swap:x-to-y

# Swap Y to X
npm run swap:y-to-x

# Swap Native SOL to Token
npm run swap:native-to-token

# Swap Token to Native SOL
npm run swap:token-to-native
```

### 5. Multihop Swaps
```bash
# X → Y → Z multihop
npm run multihop:x-y-z

# Z → Y → X multihop
npm run multihop:z-y-x
```

### 6. Query Pool Information
```bash
# Get pool info
npm run get:pool-info

# Get total pools count
npm run get:total-pools

# Get swap quotes
npm run get:swap-quote

# Get multihop quotes
npm run get:multihop-quote

# Direct account queries (no transactions)
npm run query:direct
```

## 📁 Project Structure

```
gorb-swap/
├── swap-main/                 # Solana program (Rust)
│   ├── src/
│   │   └── lib.rs            # Main AMM program
│   ├── scripts/              # Testing scripts (TypeScript)
│   │   ├── 1-tokenx.ts       # Create Token X
│   │   ├── 2-tokeny.ts       # Create Token Y
│   │   ├── 3-tokenz.ts       # Create Token Z
│   │   ├── init-pool-*.ts    # Pool initialization
│   │   ├── add-liquidity-*.ts # Add liquidity
│   │   ├── swap-*.ts         # Token swaps
│   │   ├── multihop-*.ts     # Multihop swaps
│   │   └── get-*.ts          # Query functions
│   └── Cargo.toml
├── package.json              # Node.js dependencies
├── tsconfig.json             # TypeScript configuration
└── README.md
```

## 🔧 Available Scripts

### Token Management
- `npm run create:tokenx` - Create Token X
- `npm run create:tokeny` - Create Token Y
- `npm run create:tokenz` - Create Token Z

### Pool Management
- `npm run init:pool-xy` - Initialize X-Y pool
- `npm run init:pool-yz` - Initialize Y-Z pool
- `npm run init:pool-native` - Initialize Native SOL pool

### Liquidity Management
- `npm run add:liquidity-xy` - Add liquidity to X-Y pool
- `npm run add:liquidity-native` - Add liquidity to Native SOL pool
- `npm run remove:liquidity-xy` - Remove liquidity from X-Y pool
- `npm run remove:liquidity-native` - Remove liquidity from Native SOL pool

### Trading
- `npm run swap:x-to-y` - Swap X to Y
- `npm run swap:y-to-x` - Swap Y to X
- `npm run swap:native-to-token` - Swap SOL to Token
- `npm run swap:token-to-native` - Swap Token to SOL

### Multihop Trading
- `npm run multihop:x-y-z` - X → Y → Z multihop
- `npm run multihop:z-y-x` - Z → Y → X multihop

### Queries
- `npm run get:pool-info` - Get pool information
- `npm run get:total-pools` - Get total pools count
- `npm run get:swap-quote` - Get swap quotes
- `npm run get:multihop-quote` - Get multihop quotes
- `npm run query:direct` - Direct account queries (no transactions)

### Testing
- `npm run test` - Run all tests
- `npm run test:tokens` - Test token creation
- `npm run test:pools` - Test pool initialization
- `npm run test:swaps` - Test swap operations

## 🔑 Configuration

### Environment Variables
Create a `.env` file in the root directory:
```env
RPC_ENDPOINT=https://rpc.gorbchain.xyz
WS_ENDPOINT=wss://rpc.gorbchain.xyz/ws/
AMM_PROGRAM_ID=your_program_id_here
USER_KEYPAIR_PATH=/path/to/your/keypair.json
```

### Keypair Setup
1. Generate a keypair: `solana-keygen new`
2. Fund the account: `solana airdrop 2 <your_public_key>`
3. Update the keypair path in scripts

## 🏗️ Architecture

### Solana Program (Rust)
- **Pool Management**: Create and manage liquidity pools
- **Native SOL Support**: Direct SOL trading without wrapping
- **Multihop Swaps**: Atomic multi-leg swaps
- **Constant Product AMM**: x * y = k formula
- **Fee Management**: 0.3% trading fees

### TypeScript Scripts
- **Token Creation**: SPL token minting
- **Pool Operations**: Initialize, add/remove liquidity
- **Trading**: Bidirectional swaps
- **Queries**: Pool info, quotes, and analytics
- **Testing**: Comprehensive test suite

## 🧪 Testing

Run the complete test suite:
```bash
npm run test
```

This will:
1. Create all tokens (X, Y, Z)
2. Initialize all pools
3. Add liquidity to pools
4. Test all swap operations
5. Test multihop swaps
6. Query pool information

## 📊 Key Features

### Native SOL Integration
- Direct SOL trading without wrapping to WSOL
- Native lamport handling
- System program integration

### Multihop Swaps
- Single transaction atomic swaps
- Path optimization
- Slippage protection
- Exchange rate calculations

### Pool Management
- Constant product market maker
- Liquidity provider tokens
- Fee collection
- Reserve management

## 🚨 Important Notes

- **Testnet Only**: This is for testing purposes
- **Keypair Security**: Keep your keypair secure
- **Gas Fees**: Each transaction costs SOL
- **Pool Liquidity**: Ensure sufficient liquidity for swaps

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/saurabh-7797/gorb-swap/issues)
- **Discussions**: [GitHub Discussions](https://github.com/saurabh-7797/gorb-swap/discussions)

## 🔗 Links

- **Repository**: https://github.com/saurabh-7797/gorb-swap
- **Branch**: `gorb-swap-contract-main`
- **Solana Docs**: https://docs.solana.com/
- **SPL Token Docs**: https://spl.solana.com/token