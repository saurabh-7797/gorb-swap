# 🚀 GORBAGANA-SWAP: Advanced Solana AMM with Multihop Functionality

A complete **Automated Market Maker (AMM)** implementation on Solana with advanced multihop swap capabilities, slippage protection, and comprehensive testing suite.

## 🌟 Features

### ✅ Core AMM Functionality
- **Liquidity Pools**: Create and manage token pairs
- **Add/Remove Liquidity**: Provide and withdraw liquidity with LP tokens
- **Single Token Swaps**: Direct token-to-token exchanges
- **Fee Management**: 0.3% trading fees with proper distribution

### 🔄 Advanced Multihop Swaps
- **Multi-Pool Routing**: Route trades through multiple pools (A→B→C)
- **Path Optimization**: Automatic best path selection
- **Atomic Transactions**: All-or-nothing execution
- **Slippage Protection**: Configurable minimum output amounts

### 🛡️ Security & Protection
- **Slippage Protection**: Prevent unfavorable trades
- **Input Validation**: Comprehensive parameter checking
- **Error Handling**: Clear error messages and recovery
- **Program Derived Addresses (PDAs)**: Secure account management

## 📁 Project Structure

```
swap-main/
├── src/
│   └── lib.rs                 # Main Solana program
├── target/
│   └── idl/
│       └── cargo_swap.json    # Generated IDL file
├── 1-create-token-x.js        # Token creation scripts
├── 2-create-token-y.js
├── 3-create-token-z.js
├── 4-init-pool-xy.js          # Pool initialization
├── 5-init-pool-yz.js
├── 6-add-liquidity-xy.js      # Liquidity management
├── 7-add-liquidity-yz.js
├── 8-test-multihop-xyz.js     # Multihop testing
├── 9-remove-liquidity-xy.js   # Liquidity removal
├── 10-remove-liquidity-yz.js
├── 11-large-swap-x-to-y.js    # Large volume testing
├── 12-massive-swap-y-to-z.js
├── 13-huge-multihop-x-to-z.js
├── 14-giant-liquidity-addition.js
└── Documentation files...
```

## 🚀 Quick Start

### Prerequisites
- **Solana CLI**: `solana --version`
- **Node.js**: `node --version`
- **Rust**: `rustc --version`
- **GorbChain RPC**: `https://rpc.gorbchain.xyz`

### 1. Build the Program
```bash
cd swap-main
cargo build-sbf
```

### 2. Deploy to GorbChain
```bash
solana program deploy target/deploy/cargo_swap.so
```

### 3. Run Test Scripts
```bash
# Create tokens
node 1-create-token-x.js
node 2-create-token-y.js
node 3-create-token-z.js

# Initialize pools
node 4-init-pool-xy.js
node 5-init-pool-yz.js

# Add liquidity
node 6-add-liquidity-xy.js
node 7-add-liquidity-yz.js

# Test multihop swap
node 8-test-multihop-xyz.js
```

## 🔧 Program Details

### Program ID
```
8qhCTESZN9xDCHvtXFdCHfsgcctudbYdzdCFzUkTTMMe
```

### Instructions
1. **InitPool** (0): Initialize a new liquidity pool
2. **AddLiquidity** (1): Add liquidity to existing pool
3. **RemoveLiquidity** (2): Remove liquidity from pool
4. **Swap** (3): Single token swap
5. **MultihopSwap** (4): Multihop swap with automatic path
6. **MultihopSwapWithPath** (5): Multihop swap with custom path

### Account Structure
```rust
pub struct Pool {
    pub token_a: Pubkey,        // First token mint
    pub token_b: Pubkey,        // Second token mint
    pub bump: u8,               // PDA bump seed
    pub reserve_a: u64,         // Token A reserves
    pub reserve_b: u64,         // Token B reserves
    pub total_lp_supply: u64,   // Total LP token supply
}
```

## 📊 Testing Results

### ✅ Successful Operations
- **Token Creation**: X, Y, Z tokens created successfully
- **Pool Initialization**: X-Y and Y-Z pools created
- **Liquidity Management**: Add/remove liquidity working
- **Single Swaps**: Direct token exchanges functional
- **Multihop Swaps**: A→B→C routing working perfectly
- **Large Volume**: Handles significant trade sizes
- **Slippage Protection**: Prevents unfavorable trades

### 🧪 Test Coverage
- **14+ Client Scripts**: Comprehensive testing suite
- **Multiple Scenarios**: Small, medium, large, and massive trades
- **Error Handling**: Proper error detection and reporting
- **Edge Cases**: Boundary condition testing

## 🔗 Frontend Integration

### IDL File
The program includes a generated IDL file at `target/idl/cargo_swap.json` for frontend integration.

### Key Integration Points
```javascript
// Program ID
const PROGRAM_ID = "8qhCTESZN9xDCHvtXFdCHfsgcctudbYdzdCFzUkTTMMe";

// Instruction discriminants
const INSTRUCTIONS = {
  INIT_POOL: 0,
  ADD_LIQUIDITY: 1,
  REMOVE_LIQUIDITY: 2,
  SWAP: 3,
  MULTIHOP_SWAP: 4,
  MULTIHOP_SWAP_WITH_PATH: 5
};
```

## 📚 Documentation

- **[API Reference](swap-main/API_REFERENCE.md)**: Complete API documentation
- **[Frontend Guide](swap-main/FRONTEND_INTEGRATION_GUIDE.md)**: Integration guide
- **[Developer Summary](swap-main/DEVELOPER_INTEGRATION_SUMMARY.md)**: Technical overview

## 🛠️ Development

### Building
```bash
cargo build-sbf
```

### Testing
```bash
# Run individual test scripts
node [script-name].js

# Or run the complete test suite
for i in {1..14}; do node $i-*.js; done
```

### IDL Generation
```bash
shank idl
```

## 🔒 Security Features

- **PDA-based Architecture**: Secure account derivation
- **Input Validation**: Comprehensive parameter checking
- **Slippage Protection**: Configurable minimum output
- **Atomic Transactions**: All-or-nothing execution
- **Error Handling**: Clear error messages and recovery

## 📈 Performance

- **Gas Efficient**: Optimized for minimal transaction costs
- **Fast Execution**: Native Solana program performance
- **Scalable**: Handles large volume trades
- **Reliable**: Comprehensive error handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For questions or support:
- **GitHub Issues**: Create an issue in this repository
- **Documentation**: Check the comprehensive docs in the `swap-main/` folder
- **Examples**: Review the test scripts for usage examples

---

**Built with ❤️ for the Solana ecosystem**
