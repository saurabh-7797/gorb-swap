const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  SYSVAR_RENT_PUBKEY,
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

// Helper function to get token balance with retry
async function getTokenBalance(tokenAccount, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const account = await getAccount(connection, tokenAccount, "confirmed", SPL_TOKEN_PROGRAM_ID);
      return Number(account.amount);
    } catch (error) {
      if (i === retries - 1) {
        console.log(`⚠️  Could not fetch balance for ${tokenAccount.toString()}, assuming 0`);
        return 0;
      }
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
    }
  }
  return 0;
}

// Helper function to format token amounts
function formatTokenAmount(amount, decimals = 9) {
  return (amount / Math.pow(10, decimals)).toFixed(6);
}

/**
 * Step 9: Remove Liquidity from Pool X-Y
 * Function: removeLiquidityXY()
 * Purpose: Removes liquidity from the existing Pool X-Y by burning LP tokens
 */
async function removeLiquidityXY() {
  try {
    console.log("🚀 Step 9: Removing Liquidity from Pool X-Y...");
    
    // Load Pool X-Y info from previous step
    const poolInfo = JSON.parse(fs.readFileSync('pool-xy-info.json', 'utf-8'));
    
    const TOKEN_X_MINT = new PublicKey(poolInfo.tokenX);
    const TOKEN_Y_MINT = new PublicKey(poolInfo.tokenY);
    const LP_MINT = new PublicKey(poolInfo.lpMint);
    const POOL_PDA = new PublicKey(poolInfo.poolPDA);
    const VAULT_X = new PublicKey(poolInfo.vaultX);
    const VAULT_Y = new PublicKey(poolInfo.vaultY);
    
    console.log(`Token X: ${TOKEN_X_MINT.toString()}`);
    console.log(`Token Y: ${TOKEN_Y_MINT.toString()}`);
    console.log(`LP Mint: ${LP_MINT.toString()}`);
    console.log(`Pool PDA: ${POOL_PDA.toString()}`);
    console.log(`Vault X: ${VAULT_X.toString()}`);
    console.log(`Vault Y: ${VAULT_Y.toString()}`);

    // User ATAs
    const userTokenX = getAssociatedTokenAddressSync(TOKEN_X_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userTokenY = getAssociatedTokenAddressSync(TOKEN_Y_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userLP = getAssociatedTokenAddressSync(LP_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    console.log(`User Token X ATA: ${userTokenX.toString()}`);
    console.log(`User Token Y ATA: ${userTokenY.toString()}`);
    console.log(`User LP ATA: ${userLP.toString()}`);

    // Check balances before removing liquidity
    console.log("\n📊 Balances BEFORE Removing Liquidity:");
    const balanceTokenXBefore = await getTokenBalance(userTokenX);
    const balanceTokenYBefore = await getTokenBalance(userTokenY);
    const balanceLPBefore = await getTokenBalance(userLP);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXBefore)} (${balanceTokenXBefore} raw)`);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYBefore)} (${balanceTokenYBefore} raw)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPBefore)} (${balanceLPBefore} raw)`);

    // Liquidity removal parameters
    const lpAmount = 500_000_000; // 0.5 LP tokens (half of what we have)
    
    console.log(`\n💧 Liquidity Removal Parameters:`);
    console.log(`LP Amount to Burn: ${formatTokenAmount(lpAmount)} LP tokens`);

    // Prepare accounts for RemoveLiquidity
    const accounts = [
      { pubkey: POOL_PDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_X_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false },
      { pubkey: VAULT_X, isSigner: false, isWritable: true },
      { pubkey: VAULT_Y, isSigner: false, isWritable: true },
      { pubkey: LP_MINT, isSigner: false, isWritable: true },
      { pubkey: userLP, isSigner: false, isWritable: true },
      { pubkey: userTokenX, isSigner: false, isWritable: true },
      { pubkey: userTokenY, isSigner: false, isWritable: true },
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    // Instruction data (Borsh: RemoveLiquidity { lp_amount })
    const data = Buffer.alloc(1 + 8); // 1 byte discriminator + u64
    data.writeUInt8(2, 0); // RemoveLiquidity discriminator
    data.writeBigUInt64LE(BigInt(lpAmount), 1);
    
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
    
    console.log("✅ RemoveLiquidity transaction successful!");
    console.log(`Transaction signature: ${sig}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${sig}`);
    
    // Check balances after removing liquidity
    console.log("\n📊 Balances AFTER Removing Liquidity:");
    const balanceTokenXAfter = await getTokenBalance(userTokenX);
    const balanceTokenYAfter = await getTokenBalance(userTokenY);
    const balanceLPAfter = await getTokenBalance(userLP);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXAfter)} (${balanceTokenXAfter} raw)`);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYAfter)} (${balanceTokenYAfter} raw)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPAfter)} (${balanceLPAfter} raw)`);

    // Calculate actual changes
    const tokenXChange = balanceTokenXAfter - balanceTokenXBefore;
    const tokenYChange = balanceTokenYAfter - balanceTokenYBefore;
    const lpChange = balanceLPAfter - balanceLPBefore;
    
    console.log("\n💧 RemoveLiquidity Results:");
    console.log(`Token X Change: ${formatTokenAmount(tokenXChange)} (${tokenXChange > 0 ? '+' : ''}${tokenXChange} raw)`);
    console.log(`Token Y Change: ${formatTokenAmount(tokenYChange)} (${tokenYChange > 0 ? '+' : ''}${tokenYChange} raw)`);
    console.log(`LP Tokens Burned: ${formatTokenAmount(-lpChange)} (${-lpChange} raw)`);
    
    console.log(`\n💰 Liquidity Removal Summary:`);
    console.log(`Liquidity Removed:`);
    console.log(`  - Token X Received: ${formatTokenAmount(tokenXChange)} (${tokenXChange} raw)`);
    console.log(`  - Token Y Received: ${formatTokenAmount(tokenYChange)} (${tokenYChange} raw)`);
    console.log(`LP Tokens Burned: ${formatTokenAmount(-lpChange)} (${-lpChange} raw)`);
    console.log(`Total Value Recovered: ${formatTokenAmount(tokenXChange + tokenYChange)} tokens`);
    
    // Update pool info with liquidity removal
    const updatedPoolInfo = {
      ...poolInfo,
      removedLiquidityX: tokenXChange,
      removedLiquidityY: tokenYChange,
      lpTokensBurned: -lpChange,
      remainingLPTokens: balanceLPAfter
    };
    
    fs.writeFileSync('pool-xy-info.json', JSON.stringify(updatedPoolInfo, null, 2));
    console.log("💾 Updated Pool X-Y info saved to pool-xy-info.json");
    
    return updatedPoolInfo;
    
  } catch (error) {
    console.error("❌ Error in RemoveLiquidity:", error.message);
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
removeLiquidityXY().catch(console.error);
