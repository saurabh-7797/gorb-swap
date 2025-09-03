# 🚀 AMM Contract Integration Summary for Frontend Developers

## 📋 **What You Need to Know**

### **🎯 Contract Overview**
- **Type:** Automated Market Maker (AMM) on GorbChain
- **Program ID:** `8qhCTESZN9xDCHvtXFdCHfsgcctudbYdzdCFzUkTTMMe`
- **Network:** GorbChain (Custom Solana fork)
- **RPC:** `https://rpc.gorbchain.xyz`

---

## 🔧 **Technical Requirements**

### **1. Dependencies**
```bash
npm install @solana/web3.js @solana/spl-token
```

### **2. Environment Variables**
```env
REACT_APP_SOLANA_RPC_URL=https://rpc.gorbchain.xyz
REACT_APP_AMM_PROGRAM_ID=8qhCTESZN9xDCHvtXFdCHfsgcctudbYdzdCFzUkTTMMe
REACT_APP_GORBCHAIN_TOKEN_PROGRAM=G22oYgZ6LnVcy7v8eSNi2xpNk1NcZiPD8CVKSTut7oZ6
```

---

## 🎯 **Available Functions**

| Function | Purpose | Input Parameters | Return Type |
|----------|---------|------------------|-------------|
| **InitPool** | Create new liquidity pool | `amountA: u64, amountB: u64` | `ProgramResult` |
| **AddLiquidity** | Add liquidity to pool | `amountA: u64, amountB: u64` | `ProgramResult` |
| **RemoveLiquidity** | Remove liquidity from pool | `lpAmount: u64` | `ProgramResult` |
| **Swap** | Single token swap | `amountIn: u64, directionAtoB: bool` | `ProgramResult` |
| **MultihopSwap** | Multi-hop token swap | `amountIn: u64, minAmountOut: u64` | `ProgramResult` |
| **MultihopSwapWithPath** | Multi-hop with explicit path | `amountIn: u64, minAmountOut: u64, tokenPath: Vec<Pubkey>` | `ProgramResult` |

---

## 📊 **Key Data Structures**

### **Pool State (89 bytes)**
```rust
struct Pool {
    tokenA: Pubkey,        // 32 bytes
    tokenB: Pubkey,        // 32 bytes
    bump: u8,              // 1 byte
    reserveA: u64,         // 8 bytes
    reserveB: u64,         // 8 bytes
    totalLpSupply: u64,    // 8 bytes
}
```

### **Instruction Discriminators**
```javascript
const DISCRIMINATORS = {
    INIT_POOL: 0,
    ADD_LIQUIDITY: 1,
    REMOVE_LIQUIDITY: 2,
    SWAP: 3,
    MULTIHOP_SWAP: 4,
    MULTIHOP_SWAP_WITH_PATH: 5
};
```

---

## 🚀 **Quick Integration Steps**

### **1. Basic Setup**
```javascript
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://rpc.gorbchain.xyz', 'confirmed');
const AMM_PROGRAM_ID = new PublicKey('8qhCTESZN9xDCHvtXFdCHfsgcctudbYdzdCFzUkTTMMe');
```

### **2. Pool Address Derivation**
```javascript
function derivePoolAddress(tokenA, tokenB) {
    const [poolAddress, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), tokenA.toBuffer(), tokenB.toBuffer()],
        AMM_PROGRAM_ID
    );
    return { poolAddress, bump };
}
```

### **3. Swap Calculation**
```javascript
function calculateSwapOutput(amountIn, reserveIn, reserveOut) {
    const amountInWithFee = BigInt(amountIn) * BigInt(997); // 0.3% fee
    const numerator = amountInWithFee * BigInt(reserveOut);
    const denominator = BigInt(reserveIn) * BigInt(1000) + amountInWithFee;
    return Number(numerator / denominator);
}
```

---

## 💰 **Economic Model**

### **LP Token Formula**
- **Initial:** `sqrt(amountA * amountB)`
- **Additional:** `(amountA * totalSupply) / reserveA`

### **Swap Fee**
- **Rate:** 0.3% (997/1000)
- **Formula:** `(amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)`

### **Slippage Protection**
- Use `minimumAmountOut` parameter in multihop functions
- Transaction fails if output < minimum

---

## 🔍 **Account Requirements**

### **InitPool (13 accounts)**
1. Pool PDA (created)
2. Token A mint
3. Token B mint
4. Vault A (created)
5. Vault B (created)
6. LP mint
7. User wallet
8. User Token A account
9. User Token B account
10. User LP account
11. Token program
12. System program
13. Rent sysvar

### **Swap (9 accounts)**
1. Pool PDA
2. Token A mint
3. Token B mint
4. Vault A
5. Vault B
6. User input account
7. User output account
8. User wallet
9. Token program

---

## ⚠️ **Important Considerations**

### **1. Account Creation**
- Pool and vault accounts are created automatically
- User must have associated token accounts
- LP mint address must be provided

### **2. Error Codes**
- `0x4` - Owner does not match
- `0x2` - Invalid mint
- `0x1` - Invalid instruction data

### **3. Network Specifics**
- Use `confirmed` commitment
- Implement retry logic for timeouts
- Transaction fee: 0.000005 SOL

---

## 🎨 **Example Usage**

### **Simple Swap**
```javascript
// 1. Get pool state
const pool = await getPoolState(connection, poolAddress);

// 2. Calculate output
const output = calculateSwapOutput(amountIn, pool.reserveA, pool.reserveB);

// 3. Execute swap
const signature = await swap(connection, wallet, poolAddress, tokenA, tokenB, amountIn, true);
```

### **Multihop Swap**
```javascript
// A → B → C swap
const pools = [
    { address: poolAB, vaultA: vaultAB_A, vaultB: vaultAB_B },
    { address: poolBC, vaultA: vaultBC_B, vaultB: vaultBC_C }
];

const signature = await multihopSwap(connection, wallet, pools, amountIn, minimumOut);
```

---

## 📚 **Complete Integration Guide**

For detailed implementation examples, see: `FRONTEND_INTEGRATION_GUIDE.md`

**Includes:**
- Complete code examples
- React hooks
- Error handling
- Account management
- Transaction building

---

## 🆘 **Support Information**

### **What to Provide for Support:**
1. Frontend framework (React, Vue, etc.)
2. Wallet adapter being used
3. Error messages with transaction signatures
4. Network conditions

### **Common Issues:**
- **"Owner does not match"** → Check token account ownership
- **"Invalid mint"** → Verify token mint addresses
- **"Insufficient funds"** → Check user token balances
- **Network timeouts** → Implement retry logic

---

## 🚀 **Ready to Integrate?**

1. ✅ Install dependencies
2. ✅ Set up environment variables
3. ✅ Configure wallet connection
4. ✅ Implement basic swap
5. ✅ Add liquidity management
6. ✅ Test with small amounts
7. ✅ Deploy to production

**Your AMM is ready for frontend integration! 🎉**
