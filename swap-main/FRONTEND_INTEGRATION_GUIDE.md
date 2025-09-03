# 🚀 AMM Contract Frontend Integration Guide

## 📋 **Overview**
This guide provides everything a frontend developer needs to integrate with the GorbChain AMM (Automated Market Maker) contract.

---

## 🔧 **Technical Requirements**

### **1. Dependencies**
```bash
npm install @solana/web3.js @solana/spl-token @solana/wallet-adapter-base @solana/wallet-adapter-react @solana/wallet-adapter-react-ui
```

### **2. Environment Setup**
```javascript
// .env file
REACT_APP_SOLANA_RPC_URL=https://rpc.gorbchain.xyz
REACT_APP_AMM_PROGRAM_ID=8qhCTESZN9xDCHvtXFdCHfsgcctudbYdzdCFzUkTTMMe
REACT_APP_GORBCHAIN_TOKEN_PROGRAM=G22oYgZ6LnVcy7v8eSNi2xpNk1NcZiPD8CVKSTut7oZ6
```

---

## 🎯 **Contract Information**

### **Program Details**
- **Program ID:** `8qhCTESZN9xDCHvtXFdCHfsgcctudbYdzdCFzUkTTMMe`
- **Network:** GorbChain
- **RPC URL:** `https://rpc.gorbchain.xyz`
- **Token Program:** `G22oYgZ6LnVcy7v8eSNi2xpNk1NcZiPD8CVKSTut7oZ6`

### **Available Instructions**
1. **InitPool** - Create new liquidity pool
2. **AddLiquidity** - Add liquidity to existing pool
3. **RemoveLiquidity** - Remove liquidity from pool
4. **Swap** - Single-hop token swap
5. **MultihopSwap** - Multi-hop token swap
6. **MultihopSwapWithPath** - Multi-hop with explicit path

---

## 📚 **Integration Code Examples**

### **1. Basic Setup**

```javascript
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

// Configuration
const RPC_URL = process.env.REACT_APP_SOLANA_RPC_URL;
const AMM_PROGRAM_ID = new PublicKey(process.env.REACT_APP_AMM_PROGRAM_ID);
const GORBCHAIN_TOKEN_PROGRAM = new PublicKey(process.env.REACT_APP_GORBCHAIN_TOKEN_PROGRAM);

// Connection
const connection = new Connection(RPC_URL, 'confirmed');
```

### **2. Instruction Discriminators**

```javascript
const INSTRUCTION_DISCRIMINATORS = {
    INIT_POOL: 0,
    ADD_LIQUIDITY: 1,
    REMOVE_LIQUIDITY: 2,
    SWAP: 3,
    MULTIHOP_SWAP: 4,
    MULTIHOP_SWAP_WITH_PATH: 5
};
```

### **3. Pool PDA Derivation**

```javascript
import { PublicKey } from '@solana/web3.js';

function derivePoolAddress(tokenA, tokenB, programId) {
    const [poolAddress, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), tokenA.toBuffer(), tokenB.toBuffer()],
        programId
    );
    return { poolAddress, bump };
}
```

### **4. InitPool Function**

```javascript
async function initPool(
    connection,
    wallet,
    tokenA,
    tokenB,
    amountA,
    amountB
) {
    const { poolAddress, bump } = derivePoolAddress(tokenA, tokenB, AMM_PROGRAM_ID);
    
    // Derive vault addresses (these should be pre-calculated)
    const vaultA = new PublicKey("VAULT_A_ADDRESS"); // Get from your backend
    const vaultB = new PublicKey("VAULT_B_ADDRESS"); // Get from your backend
    
    // Get user token accounts
    const userTokenAAccount = await getAssociatedTokenAddress(tokenA, wallet.publicKey);
    const userTokenBAccount = await getAssociatedTokenAddress(tokenB, wallet.publicKey);
    const userLPAccount = await getAssociatedTokenAddress(lpMint, wallet.publicKey);
    
    // Create instruction data
    const instructionData = Buffer.alloc(17);
    instructionData.writeUInt8(INSTRUCTION_DISCRIMINATORS.INIT_POOL, 0);
    instructionData.writeBigUInt64LE(BigInt(amountA), 1);
    instructionData.writeBigUInt64LE(BigInt(amountB), 9);
    
    // Create transaction
    const transaction = new Transaction();
    
    // Add InitPool instruction
    transaction.add(new TransactionInstruction({
        keys: [
            { pubkey: poolAddress, isSigner: false, isWritable: true },
            { pubkey: tokenA, isSigner: false, isWritable: false },
            { pubkey: tokenB, isSigner: false, isWritable: false },
            { pubkey: vaultA, isSigner: false, isWritable: true },
            { pubkey: vaultB, isSigner: false, isWritable: true },
            { pubkey: lpMint, isSigner: false, isWritable: true },
            { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: userTokenAAccount, isSigner: false, isWritable: true },
            { pubkey: userTokenBAccount, isSigner: false, isWritable: true },
            { pubkey: userLPAccount, isSigner: false, isWritable: true },
            { pubkey: GORBCHAIN_TOKEN_PROGRAM, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
        ],
        programId: AMM_PROGRAM_ID,
        data: instructionData
    }));
    
    // Send transaction
    const signature = await wallet.sendTransaction(transaction, connection);
    await connection.confirmTransaction(signature);
    
    return { signature, poolAddress };
}
```

### **5. AddLiquidity Function**

```javascript
async function addLiquidity(
    connection,
    wallet,
    poolAddress,
    tokenA,
    tokenB,
    amountA,
    amountB
) {
    // Get vault addresses from pool state
    const vaultA = new PublicKey("VAULT_A_ADDRESS");
    const vaultB = new PublicKey("VAULT_B_ADDRESS");
    
    // Get user accounts
    const userTokenAAccount = await getAssociatedTokenAddress(tokenA, wallet.publicKey);
    const userTokenBAccount = await getAssociatedTokenAddress(tokenB, wallet.publicKey);
    const userLPAccount = await getAssociatedTokenAddress(lpMint, wallet.publicKey);
    
    // Create instruction data
    const instructionData = Buffer.alloc(17);
    instructionData.writeUInt8(INSTRUCTION_DISCRIMINATORS.ADD_LIQUIDITY, 0);
    instructionData.writeBigUInt64LE(BigInt(amountA), 1);
    instructionData.writeBigUInt64LE(BigInt(amountB), 9);
    
    const transaction = new Transaction();
    transaction.add(new TransactionInstruction({
        keys: [
            { pubkey: poolAddress, isSigner: false, isWritable: true },
            { pubkey: tokenA, isSigner: false, isWritable: false },
            { pubkey: tokenB, isSigner: false, isWritable: false },
            { pubkey: vaultA, isSigner: false, isWritable: true },
            { pubkey: vaultB, isSigner: false, isWritable: true },
            { pubkey: lpMint, isSigner: false, isWritable: true },
            { pubkey: userTokenAAccount, isSigner: false, isWritable: true },
            { pubkey: userTokenBAccount, isSigner: false, isWritable: true },
            { pubkey: userLPAccount, isSigner: false, isWritable: true },
            { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: GORBCHAIN_TOKEN_PROGRAM, isSigner: false, isWritable: false }
        ],
        programId: AMM_PROGRAM_ID,
        data: instructionData
    }));
    
    const signature = await wallet.sendTransaction(transaction, connection);
    await connection.confirmTransaction(signature);
    
    return signature;
}
```

### **6. Swap Function**

```javascript
async function swap(
    connection,
    wallet,
    poolAddress,
    tokenA,
    tokenB,
    amountIn,
    directionAtoB
) {
    const vaultA = new PublicKey("VAULT_A_ADDRESS");
    const vaultB = new PublicKey("VAULT_B_ADDRESS");
    
    const userInAccount = directionAtoB 
        ? await getAssociatedTokenAddress(tokenA, wallet.publicKey)
        : await getAssociatedTokenAddress(tokenB, wallet.publicKey);
    
    const userOutAccount = directionAtoB 
        ? await getAssociatedTokenAddress(tokenB, wallet.publicKey)
        : await getAssociatedTokenAddress(tokenA, wallet.publicKey);
    
    // Create instruction data
    const instructionData = Buffer.alloc(9);
    instructionData.writeUInt8(INSTRUCTION_DISCRIMINATORS.SWAP, 0);
    instructionData.writeBigUInt64LE(BigInt(amountIn), 1);
    instructionData.writeUInt8(directionAtoB ? 1 : 0, 9);
    
    const transaction = new Transaction();
    transaction.add(new TransactionInstruction({
        keys: [
            { pubkey: poolAddress, isSigner: false, isWritable: true },
            { pubkey: tokenA, isSigner: false, isWritable: false },
            { pubkey: tokenB, isSigner: false, isWritable: false },
            { pubkey: vaultA, isSigner: false, isWritable: true },
            { pubkey: vaultB, isSigner: false, isWritable: true },
            { pubkey: userInAccount, isSigner: false, isWritable: true },
            { pubkey: userOutAccount, isSigner: false, isWritable: true },
            { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: GORBCHAIN_TOKEN_PROGRAM, isSigner: false, isWritable: false }
        ],
        programId: AMM_PROGRAM_ID,
        data: instructionData
    }));
    
    const signature = await wallet.sendTransaction(transaction, connection);
    await connection.confirmTransaction(signature);
    
    return signature;
}
```

### **7. MultihopSwap Function**

```javascript
async function multihopSwap(
    connection,
    wallet,
    pools, // Array of pool addresses
    amountIn,
    minimumAmountOut
) {
    // Create instruction data
    const instructionData = Buffer.alloc(17);
    instructionData.writeUInt8(INSTRUCTION_DISCRIMINATORS.MULTIHOP_SWAP, 0);
    instructionData.writeBigUInt64LE(BigInt(amountIn), 1);
    instructionData.writeBigUInt64LE(BigInt(minimumAmountOut), 9);
    
    // Build accounts array
    const accounts = [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: GORBCHAIN_TOKEN_PROGRAM, isSigner: false, isWritable: false }
    ];
    
    // Add user input account
    accounts.push({
        pubkey: userInputAccount,
        isSigner: false,
        isWritable: true
    });
    
    // Add accounts for each hop (7 accounts per hop)
    for (const pool of pools) {
        accounts.push(
            { pubkey: pool.address, isSigner: false, isWritable: true },
            { pubkey: pool.tokenA, isSigner: false, isWritable: false },
            { pubkey: pool.tokenB, isSigner: false, isWritable: false },
            { pubkey: pool.vaultA, isSigner: false, isWritable: true },
            { pubkey: pool.vaultB, isSigner: false, isWritable: true },
            { pubkey: pool.intermediateAccount, isSigner: false, isWritable: true },
            { pubkey: pool.outputAccount, isSigner: false, isWritable: true }
        );
    }
    
    const transaction = new Transaction();
    transaction.add(new TransactionInstruction({
        keys: accounts,
        programId: AMM_PROGRAM_ID,
        data: instructionData
    }));
    
    const signature = await wallet.sendTransaction(transaction, connection);
    await connection.confirmTransaction(signature);
    
    return signature;
}
```

---

## 📊 **Pool State Reading**

```javascript
async function getPoolState(connection, poolAddress) {
    const accountInfo = await connection.getAccountInfo(poolAddress);
    if (!accountInfo) {
        throw new Error('Pool not found');
    }
    
    const data = accountInfo.data;
    
    // Parse pool state (89 bytes total)
    const pool = {
        tokenA: new PublicKey(data.slice(0, 32)),
        tokenB: new PublicKey(data.slice(32, 64)),
        bump: data[64],
        reserveA: data.readBigUInt64LE(65),
        reserveB: data.readBigUInt64LE(73),
        totalLpSupply: data.readBigUInt64LE(81)
    };
    
    return pool;
}
```

---

## 💰 **Swap Calculation**

```javascript
function calculateSwapOutput(amountIn, reserveIn, reserveOut) {
    if (amountIn === 0 || reserveIn === 0 || reserveOut === 0) {
        return 0;
    }
    
    // 0.3% fee (997/1000)
    const amountInWithFee = BigInt(amountIn) * BigInt(997);
    const numerator = amountInWithFee * BigInt(reserveOut);
    const denominator = BigInt(reserveIn) * BigInt(1000) + amountInWithFee;
    
    return Number(numerator / denominator);
}
```

---

## 🔍 **Token Balance Checking**

```javascript
async function getTokenBalance(connection, tokenAccount) {
    try {
        const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
        return accountInfo.value.amount;
    } catch (error) {
        console.error('Error fetching token balance:', error);
        return '0';
    }
}
```

---

## 🎨 **React Hook Example**

```javascript
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export function useAMM() {
    const { publicKey, sendTransaction } = useWallet();
    const [connection] = useState(new Connection(RPC_URL, 'confirmed'));
    
    const initPool = async (tokenA, tokenB, amountA, amountB) => {
        if (!publicKey) throw new Error('Wallet not connected');
        
        const { signature, poolAddress } = await initPool(
            connection,
            { publicKey, sendTransaction },
            tokenA,
            tokenB,
            amountA,
            amountB
        );
        
        return { signature, poolAddress };
    };
    
    const addLiquidity = async (poolAddress, tokenA, tokenB, amountA, amountB) => {
        if (!publicKey) throw new Error('Wallet not connected');
        
        return await addLiquidity(
            connection,
            { publicKey, sendTransaction },
            poolAddress,
            tokenA,
            tokenB,
            amountA,
            amountB
        );
    };
    
    const swap = async (poolAddress, tokenA, tokenB, amountIn, directionAtoB) => {
        if (!publicKey) throw new Error('Wallet not connected');
        
        return await swap(
            connection,
            { publicKey, sendTransaction },
            poolAddress,
            tokenA,
            tokenB,
            amountIn,
            directionAtoB
        );
    };
    
    return {
        initPool,
        addLiquidity,
        swap,
        connection
    };
}
```

---

## ⚠️ **Important Notes**

### **1. Account Creation**
- Pool and vault accounts are created automatically by the program
- User must have associated token accounts for all tokens
- LP mint address must be provided (not created by program)

### **2. Error Handling**
```javascript
try {
    const signature = await swap(/* params */);
    console.log('Transaction successful:', signature);
} catch (error) {
    if (error.message.includes('0x4')) {
        console.error('Owner does not match');
    } else if (error.message.includes('0x2')) {
        console.error('Invalid mint');
    } else {
        console.error('Transaction failed:', error.message);
    }
}
```

### **3. Network Considerations**
- Use `confirmed` commitment for better reliability
- Implement retry logic for network timeouts
- Consider transaction fees (0.000005 SOL per transaction)

### **4. Security**
- Always validate user inputs
- Check token account ownership
- Verify pool addresses before transactions
- Implement slippage protection

---

## 🚀 **Quick Start Checklist**

- [ ] Install required dependencies
- [ ] Set up environment variables
- [ ] Configure wallet adapter
- [ ] Implement basic swap functionality
- [ ] Add liquidity management
- [ ] Implement multihop swaps
- [ ] Add error handling
- [ ] Test with small amounts
- [ ] Deploy to production

---

## 📞 **Support**

For integration support, provide:
1. Your frontend framework (React, Vue, Angular, etc.)
2. Wallet adapter being used
3. Specific error messages
4. Transaction signatures for failed transactions

**Happy integrating! 🎉**
