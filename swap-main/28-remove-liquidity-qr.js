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
 * Step 28: Remove Liquidity from Pool Q-R
 * Function: removeLiquidityQR()
 * Purpose: Removes liquidity from the Pool Q-R by burning LP tokens
 */
async function removeLiquidityQR() {
  try {
    console.log("🚀 Step 28: Removing Liquidity from Pool Q-R...");
    
    // Load Pool Q-R info
    const poolInfo = JSON.parse(fs.readFileSync('pool-qr-info.json', 'utf-8'));
    const tokenQInfo = JSON.parse(fs.readFileSync('token-q-info.json', 'utf-8'));
    const tokenRInfo = JSON.parse(fs.readFileSync('token-r-info.json', 'utf-8'));
    
    const TOKEN_Q_MINT = new PublicKey(tokenQInfo.mint);
    const TOKEN_R_MINT = new PublicKey(tokenRInfo.mint);
    const POOL_PDA = new PublicKey(poolInfo.poolPDA);
    const VAULT_Q = new PublicKey(poolInfo.vaultQ);
    const VAULT_R = new PublicKey(poolInfo.vaultR);
    const LP_MINT = new PublicKey(poolInfo.lpMint);
    
    console.log(`Pool PDA: ${POOL_PDA.toString()}`);
    console.log(`Token Q: ${TOKEN_Q_MINT.toString()}`);
    console.log(`Token R: ${TOKEN_R_MINT.toString()}`);
    console.log(`Vault Q: ${VAULT_Q.toString()}`);
    console.log(`Vault R: ${VAULT_R.toString()}`);
    console.log(`LP Mint: ${LP_MINT.toString()}`);

    // User ATAs
    const userTokenQ = getAssociatedTokenAddressSync(TOKEN_Q_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userTokenR = getAssociatedTokenAddressSync(TOKEN_R_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userLP = getAssociatedTokenAddressSync(LP_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    
    console.log(`User Token Q ATA: ${userTokenQ.toString()}`);
    console.log(`User Token R ATA: ${userTokenR.toString()}`);
    console.log(`User LP ATA: ${userLP.toString()}`);

    // Check balances before removing liquidity
    console.log("\n📊 Balances BEFORE Removing Liquidity:");
    const balanceTokenQBefore = await getTokenBalance(userTokenQ);
    const balanceTokenRBefore = await getTokenBalance(userTokenR);
    const balanceLPBefore = await getTokenBalance(userLP);
    console.log(`Token Q: ${formatTokenAmount(balanceTokenQBefore)} (${balanceTokenQBefore} raw)`);
    console.log(`Token R: ${formatTokenAmount(balanceTokenRBefore)} (${balanceTokenRBefore} raw)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPBefore)} (${balanceLPBefore} raw)`);

    // Remove 50% of LP tokens (large removal)
    const lpToRemove = Math.floor(balanceLPBefore * 0.5); // Remove 50% of LP tokens
    
    console.log(`\n🏊 Removing Liquidity Parameters:`);
    console.log(`LP Tokens to Remove: ${formatTokenAmount(lpToRemove)} (${lpToRemove} raw)`);
    console.log(`Percentage: 50% of total LP tokens`);
    console.log(`Expected: Receive proportional amounts of Token Q and R`);

    // Prepare accounts for RemoveLiquidity
    const accounts = [
      { pubkey: POOL_PDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_Q_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_R_MINT, isSigner: false, isWritable: false },
      { pubkey: VAULT_Q, isSigner: false, isWritable: true },
      { pubkey: VAULT_R, isSigner: false, isWritable: true },
      { pubkey: LP_MINT, isSigner: false, isWritable: true },
      { pubkey: userLP, isSigner: false, isWritable: true },
      { pubkey: userTokenQ, isSigner: false, isWritable: true },
      { pubkey: userTokenR, isSigner: false, isWritable: true },
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
    
    console.log("✅ Liquidity removal from Pool Q-R successful!");
    console.log(`Transaction signature: ${sig}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${sig}`);
    
    // Check balances after removing liquidity
    console.log("\n📊 Balances AFTER Removing Liquidity:");
    const balanceTokenQAfter = await getTokenBalance(userTokenQ);
    const balanceTokenRAfter = await getTokenBalance(userTokenR);
    const balanceLPAfter = await getTokenBalance(userLP);
    console.log(`Token Q: ${formatTokenAmount(balanceTokenQAfter)} (${balanceTokenQAfter} raw)`);
    console.log(`Token R: ${formatTokenAmount(balanceTokenRAfter)} (${balanceTokenRAfter} raw)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPAfter)} (${balanceLPAfter} raw)`);

    // Calculate actual changes
    const tokenQChange = balanceTokenQAfter - balanceTokenQBefore;
    const tokenRChange = balanceTokenRAfter - balanceTokenRBefore;
    const lpChange = balanceLPAfter - balanceLPBefore;
    
    console.log("\n🏊 Liquidity Removal Results:");
    console.log(`Token Q Change: ${formatTokenAmount(tokenQChange)} (${tokenQChange > 0 ? '+' : ''}${tokenQChange} raw)`);
    console.log(`Token R Change: ${formatTokenAmount(tokenRChange)} (${tokenRChange > 0 ? '+' : ''}${tokenRChange} raw)`);
    console.log(`LP Tokens Removed: ${formatTokenAmount(-lpChange)} (${-lpChange} raw)`);
    
    // Calculate removal efficiency
    const expectedQ = Math.floor(lpToRemove * poolInfo.totalLiquidityQ / poolInfo.totalLPTokens);
    const expectedR = Math.floor(lpToRemove * poolInfo.totalLiquidityR / poolInfo.totalLPTokens);
    
    console.log(`\n📈 Removal Analysis:`);
    console.log(`Expected Token Q: ${formatTokenAmount(expectedQ)}`);
    console.log(`Actual Token Q: ${formatTokenAmount(tokenQChange)}`);
    console.log(`Expected Token R: ${formatTokenAmount(expectedR)}`);
    console.log(`Actual Token R: ${formatTokenAmount(tokenRChange)}`);
    console.log(`Q Efficiency: ${((tokenQChange / expectedQ) * 100).toFixed(2)}%`);
    console.log(`R Efficiency: ${((tokenRChange / expectedR) * 100).toFixed(2)}%`);
    
    // Update Pool Q-R info
    const updatedPoolInfo = {
      ...poolInfo,
      totalLiquidityQ: poolInfo.totalLiquidityQ - tokenQChange,
      totalLiquidityR: poolInfo.totalLiquidityR - tokenRChange,
      totalLPTokens: poolInfo.totalLPTokens + lpChange,
      liquidityRemovals: (poolInfo.liquidityRemovals || 0) + 1
    };
    
    fs.writeFileSync('pool-qr-info.json', JSON.stringify(updatedPoolInfo, null, 2));
    console.log("💾 Updated Pool Q-R info saved to pool-qr-info.json");
    
    // Save removal results
    const removalResults = {
      timestamp: new Date().toISOString(),
      transactionSignature: sig,
      pool: "Q-R",
      lpTokensRemoved: -lpChange,
      tokensReceived: {
        tokenQ: tokenQChange,
        tokenR: tokenRChange
      },
      expectedTokens: {
        tokenQ: expectedQ,
        tokenR: expectedR
      },
      efficiency: {
        tokenQ: (tokenQChange / expectedQ) * 100,
        tokenR: (tokenRChange / expectedR) * 100
      },
      balancesBefore: {
        tokenQ: balanceTokenQBefore,
        tokenR: balanceTokenRBefore,
        lp: balanceLPBefore
      },
      balancesAfter: {
        tokenQ: balanceTokenQAfter,
        tokenR: balanceTokenRAfter,
        lp: balanceLPAfter
      }
    };
    
    fs.writeFileSync('remove-liquidity-qr-results.json', JSON.stringify(removalResults, null, 2));
    console.log("💾 Liquidity removal results saved to remove-liquidity-qr-results.json");
    
    console.log(`\n💰 Pool Q-R Liquidity Removal Summary:`);
    console.log(`LP Tokens Removed: ${formatTokenAmount(-lpChange)}`);
    console.log(`Token Q Received: ${formatTokenAmount(tokenQChange)}`);
    console.log(`Token R Received: ${formatTokenAmount(tokenRChange)}`);
    console.log(`Remaining LP Tokens: ${formatTokenAmount(balanceLPAfter)}`);
    console.log(`Transaction: ${sig}`);
    
    return removalResults;
    
  } catch (error) {
    console.error("❌ Error removing liquidity from Pool Q-R:", error.message);
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
removeLiquidityQR().catch(console.error);
