const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} = require("@solana/web3.js");
const {
  getAssociatedTokenAddressSync,
  getAccount,
} = require("@solana/spl-token");
const fs = require("fs");

// --- CONFIG ---
const RPC_ENDPOINT = "https://rpc.gorbchain.xyz";
const WS_ENDPOINT = "wss://rpc.gorbchain.xyz/ws/";
const AMM_PROGRAM_ID = new PublicKey("8qhCTESZN9xDCHvtXFdCHfsgcctudbYdzdCFzUkTTMMe");
const SPL_TOKEN_PROGRAM_ID = new PublicKey("G22oYgZ6LnVcy7v8eSNi2xpNk1NcZiPD8CVKSTut7oZ6");
const ATA_PROGRAM_ID = new PublicKey("GoATGVNeSXerFerPqTJ8hcED1msPWHHLxao2vwBYqowm");

const USER_KEYPAIR_PATH = "/home/saurabh/.config/solana/id.json";
const userKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(USER_KEYPAIR_PATH, "utf-8")))
);

const connection = new Connection(RPC_ENDPOINT, {
  commitment: "confirmed",
  wsEndpoint: WS_ENDPOINT,
});

// Helper function to get token balance
async function getTokenBalance(tokenAccount) {
  try {
    const account = await getAccount(connection, tokenAccount, "confirmed", SPL_TOKEN_PROGRAM_ID);
    return Number(account.amount);
  } catch (error) {
    return 0;
  }
}

// Helper function to format token amounts
function formatTokenAmount(amount, decimals = 9) {
  return (amount / Math.pow(10, decimals)).toFixed(6);
}

/**
 * Step 27: Remove Liquidity from Pool P-Q
 * Function: removeLiquidityPQ()
 * Purpose: Removes liquidity from the Pool P-Q by burning LP tokens
 */
async function removeLiquidityPQ() {
  try {
    console.log("🚀 Step 27: Removing Liquidity from Pool P-Q...");
    
    // Load Pool P-Q info
    const poolInfo = JSON.parse(fs.readFileSync('pool-pq-info.json', 'utf-8'));
    const tokenPInfo = JSON.parse(fs.readFileSync('token-p-info.json', 'utf-8'));
    const tokenQInfo = JSON.parse(fs.readFileSync('token-q-info.json', 'utf-8'));
    
    const TOKEN_P_MINT = new PublicKey(tokenPInfo.mint);
    const TOKEN_Q_MINT = new PublicKey(tokenQInfo.mint);
    const POOL_PDA = new PublicKey(poolInfo.poolPDA);
    const VAULT_P = new PublicKey(poolInfo.vaultP);
    const VAULT_Q = new PublicKey(poolInfo.vaultQ);
    const LP_MINT = new PublicKey(poolInfo.lpMint);
    
    console.log(`Pool PDA: ${POOL_PDA.toString()}`);
    console.log(`Token P: ${TOKEN_P_MINT.toString()}`);
    console.log(`Token Q: ${TOKEN_Q_MINT.toString()}`);
    console.log(`Vault P: ${VAULT_P.toString()}`);
    console.log(`Vault Q: ${VAULT_Q.toString()}`);
    console.log(`LP Mint: ${LP_MINT.toString()}`);

    // User ATAs
    const userTokenP = getAssociatedTokenAddressSync(TOKEN_P_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userTokenQ = getAssociatedTokenAddressSync(TOKEN_Q_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userLP = getAssociatedTokenAddressSync(LP_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    
    console.log(`User Token P ATA: ${userTokenP.toString()}`);
    console.log(`User Token Q ATA: ${userTokenQ.toString()}`);
    console.log(`User LP ATA: ${userLP.toString()}`);

    // Check balances before removing liquidity
    console.log("\n📊 Balances BEFORE Removing Liquidity:");
    const balanceTokenPBefore = await getTokenBalance(userTokenP);
    const balanceTokenQBefore = await getTokenBalance(userTokenQ);
    const balanceLPBefore = await getTokenBalance(userLP);
    console.log(`Token P: ${formatTokenAmount(balanceTokenPBefore)} (${balanceTokenPBefore} raw)`);
    console.log(`Token Q: ${formatTokenAmount(balanceTokenQBefore)} (${balanceTokenQBefore} raw)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPBefore)} (${balanceLPBefore} raw)`);

    // Remove 50% of LP tokens (large removal)
    const lpToRemove = Math.floor(balanceLPBefore * 0.5); // Remove 50% of LP tokens
    
    console.log(`\n🏊 Removing Liquidity Parameters:`);
    console.log(`LP Tokens to Remove: ${formatTokenAmount(lpToRemove)} (${lpToRemove} raw)`);
    console.log(`Percentage: 50% of total LP tokens`);
    console.log(`Expected: Receive proportional amounts of Token P and Q`);

    // Prepare accounts for RemoveLiquidity
    const accounts = [
      { pubkey: POOL_PDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_P_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_Q_MINT, isSigner: false, isWritable: false },
      { pubkey: VAULT_P, isSigner: false, isWritable: true },
      { pubkey: VAULT_Q, isSigner: false, isWritable: true },
      { pubkey: LP_MINT, isSigner: false, isWritable: true },
      { pubkey: userLP, isSigner: false, isWritable: true },
      { pubkey: userTokenP, isSigner: false, isWritable: true },
      { pubkey: userTokenQ, isSigner: false, isWritable: true },
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    // Instruction data (Borsh: RemoveLiquidity { lp_amount })
    const data = Buffer.alloc(1 + 8); // 1 byte discriminator + u64
    data.writeUInt8(2, 0); // RemoveLiquidity discriminator
    data.writeBigUInt64LE(BigInt(lpToRemove), 1);
    
    console.log(`\n📝 Instruction data: ${data.toString('hex')}`);

    // Create transaction
    const tx = new Transaction();
    
    // Add RemoveLiquidity instruction
    console.log("📝 Adding RemoveLiquidity instruction...");
    
    tx.add({
      keys: accounts,
      programId: AMM_PROGRAM_ID,
      data,
    });

    // Send transaction
    console.log("📤 Sending transaction...");
    const sig = await sendAndConfirmTransaction(connection, tx, [userKeypair], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    
    console.log("✅ Liquidity removal from Pool P-Q successful!");
    console.log(`Transaction signature: ${sig}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${sig}`);
    
    // Check balances after removing liquidity
    console.log("\n📊 Balances AFTER Removing Liquidity:");
    const balanceTokenPAfter = await getTokenBalance(userTokenP);
    const balanceTokenQAfter = await getTokenBalance(userTokenQ);
    const balanceLPAfter = await getTokenBalance(userLP);
    console.log(`Token P: ${formatTokenAmount(balanceTokenPAfter)} (${balanceTokenPAfter} raw)`);
    console.log(`Token Q: ${formatTokenAmount(balanceTokenQAfter)} (${balanceTokenQAfter} raw)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPAfter)} (${balanceLPAfter} raw)`);

    // Calculate actual changes
    const tokenPChange = balanceTokenPAfter - balanceTokenPBefore;
    const tokenQChange = balanceTokenQAfter - balanceTokenQBefore;
    const lpChange = balanceLPAfter - balanceLPBefore;
    
    console.log("\n🏊 Liquidity Removal Results:");
    console.log(`Token P Change: ${formatTokenAmount(tokenPChange)} (${tokenPChange > 0 ? '+' : ''}${tokenPChange} raw)`);
    console.log(`Token Q Change: ${formatTokenAmount(tokenQChange)} (${tokenQChange > 0 ? '+' : ''}${tokenQChange} raw)`);
    console.log(`LP Tokens Removed: ${formatTokenAmount(-lpChange)} (${-lpChange} raw)`);
    
    // Calculate removal efficiency
    const expectedP = Math.floor(lpToRemove * poolInfo.totalLiquidityP / poolInfo.totalLPTokens);
    const expectedQ = Math.floor(lpToRemove * poolInfo.totalLiquidityQ / poolInfo.totalLPTokens);
    
    console.log(`\n📈 Removal Analysis:`);
    console.log(`Expected Token P: ${formatTokenAmount(expectedP)}`);
    console.log(`Actual Token P: ${formatTokenAmount(tokenPChange)}`);
    console.log(`Expected Token Q: ${formatTokenAmount(expectedQ)}`);
    console.log(`Actual Token Q: ${formatTokenAmount(tokenQChange)}`);
    console.log(`P Efficiency: ${((tokenPChange / expectedP) * 100).toFixed(2)}%`);
    console.log(`Q Efficiency: ${((tokenQChange / expectedQ) * 100).toFixed(2)}%`);
    
    // Update Pool P-Q info
    const updatedPoolInfo = {
      ...poolInfo,
      totalLiquidityP: poolInfo.totalLiquidityP - tokenPChange,
      totalLiquidityQ: poolInfo.totalLiquidityQ - tokenQChange,
      totalLPTokens: poolInfo.totalLPTokens + lpChange,
      liquidityRemovals: (poolInfo.liquidityRemovals || 0) + 1
    };
    
    fs.writeFileSync('pool-pq-info.json', JSON.stringify(updatedPoolInfo, null, 2));
    console.log("💾 Updated Pool P-Q info saved to pool-pq-info.json");
    
    // Save removal results
    const removalResults = {
      timestamp: new Date().toISOString(),
      transactionSignature: sig,
      pool: "P-Q",
      lpTokensRemoved: -lpChange,
      tokensReceived: {
        tokenP: tokenPChange,
        tokenQ: tokenQChange
      },
      expectedTokens: {
        tokenP: expectedP,
        tokenQ: expectedQ
      },
      efficiency: {
        tokenP: (tokenPChange / expectedP) * 100,
        tokenQ: (tokenQChange / expectedQ) * 100
      },
      balancesBefore: {
        tokenP: balanceTokenPBefore,
        tokenQ: balanceTokenQBefore,
        lp: balanceLPBefore
      },
      balancesAfter: {
        tokenP: balanceTokenPAfter,
        tokenQ: balanceTokenQAfter,
        lp: balanceLPAfter
      }
    };
    
    fs.writeFileSync('remove-liquidity-pq-results.json', JSON.stringify(removalResults, null, 2));
    console.log("💾 Liquidity removal results saved to remove-liquidity-pq-results.json");
    
    console.log(`\n💰 Pool P-Q Liquidity Removal Summary:`);
    console.log(`LP Tokens Removed: ${formatTokenAmount(-lpChange)}`);
    console.log(`Token P Received: ${formatTokenAmount(tokenPChange)}`);
    console.log(`Token Q Received: ${formatTokenAmount(tokenQChange)}`);
    console.log(`Remaining LP Tokens: ${formatTokenAmount(balanceLPAfter)}`);
    console.log(`Transaction: ${sig}`);
    
    return removalResults;
    
  } catch (error) {
    console.error("❌ Error removing liquidity from Pool P-Q:", error.message);
    if (error.logs) {
      console.error("Transaction logs:");
      error.logs.forEach((log, index) => {
        console.error(`  ${index + 1}: ${log}`);
      });
    }
    throw error;
  }
}

// Execute the function
removeLiquidityPQ().catch(console.error);
