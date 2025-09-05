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
 * Step 25: Add Large Liquidity to Pool Q-R
 * Function: addLiquidityQR()
 * Purpose: Adds large amounts of liquidity to the existing Pool Q-R
 */
async function addLiquidityQR() {
  try {
    console.log("🚀 Step 25: Adding Large Liquidity to Pool Q-R...");
    
    // Load Pool Q-R info from previous step
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

    // Check balances before adding liquidity
    console.log("\n📊 Balances BEFORE Adding Liquidity:");
    const balanceTokenQBefore = await getTokenBalance(userTokenQ);
    const balanceTokenRBefore = await getTokenBalance(userTokenR);
    const balanceLPBefore = await getTokenBalance(userLP);
    console.log(`Token Q: ${formatTokenAmount(balanceTokenQBefore)} (${balanceTokenQBefore} raw)`);
    console.log(`Token R: ${formatTokenAmount(balanceTokenRBefore)} (${balanceTokenRBefore} raw)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPBefore)} (${balanceLPBefore} raw)`);

    // Large liquidity amounts maintaining 3:5 ratio
    const amountQ = 30_000_000_000; // 30 tokens (large amount)
    const amountR = 50_000_000_000; // 50 tokens (large amount)
    
    console.log(`\n🏊 Adding Large Liquidity Parameters:`);
    console.log(`Token Q Amount: ${formatTokenAmount(amountQ)} Token Q`);
    console.log(`Token R Amount: ${formatTokenAmount(amountR)} Token R`);
    console.log(`Ratio: 3:5 (Q:R) - maintaining pool ratio`);

    // Prepare accounts for AddLiquidity
    const accounts = [
      { pubkey: POOL_PDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_Q_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_R_MINT, isSigner: false, isWritable: false },
      { pubkey: VAULT_Q, isSigner: false, isWritable: true },
      { pubkey: VAULT_R, isSigner: false, isWritable: true },
      { pubkey: LP_MINT, isSigner: false, isWritable: true },
      { pubkey: userTokenQ, isSigner: false, isWritable: true },
      { pubkey: userTokenR, isSigner: false, isWritable: true },
      { pubkey: userLP, isSigner: false, isWritable: true },
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    // Instruction data (Borsh: AddLiquidity { amount_a, amount_b })
    const data = Buffer.alloc(1 + 8 + 8); // 1 byte discriminator + 2x u64
    data.writeUInt8(1, 0); // AddLiquidity discriminator
    data.writeBigUInt64LE(BigInt(amountQ), 1);
    data.writeBigUInt64LE(BigInt(amountR), 9);
    
    console.log(`\n📝 Instruction data: ${data.toString('hex')}`);

    // Create transaction
    const tx = new Transaction();
    
    // Add AddLiquidity instruction
    console.log("📝 Adding AddLiquidity instruction...");
    
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
    
    console.log("✅ Large liquidity addition to Pool Q-R successful!");
    console.log(`Transaction signature: ${sig}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${sig}`);
    
    // Check balances after adding liquidity
    console.log("\n📊 Balances AFTER Adding Liquidity:");
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
    
    console.log("\n🏊 Large Liquidity Addition Results:");
    console.log(`Token Q Change: ${formatTokenAmount(tokenQChange)} (${tokenQChange > 0 ? '+' : ''}${tokenQChange} raw)`);
    console.log(`Token R Change: ${formatTokenAmount(tokenRChange)} (${tokenRChange > 0 ? '+' : ''}${tokenRChange} raw)`);
    console.log(`LP Tokens Received: ${formatTokenAmount(lpChange)} (${lpChange} raw)`);
    
    // Calculate expected LP tokens (geometric mean)
    const expectedLP = Math.sqrt(amountQ * amountR);
    console.log(`Expected LP Tokens: ${formatTokenAmount(expectedLP)}`);
    console.log(`Actual LP Tokens: ${formatTokenAmount(lpChange)}`);
    console.log(`Difference: ${formatTokenAmount(Math.abs(expectedLP - lpChange))}`);
    
    // Update Pool Q-R info
    const updatedPoolInfo = {
      ...poolInfo,
      totalLiquidityQ: poolInfo.initialLiquidityQ + (-tokenQChange),
      totalLiquidityR: poolInfo.initialLiquidityR + (-tokenRChange),
      totalLPTokens: poolInfo.lpTokensReceived + lpChange,
      liquidityAdditions: (poolInfo.liquidityAdditions || 0) + 1
    };
    
    fs.writeFileSync('pool-qr-info.json', JSON.stringify(updatedPoolInfo, null, 2));
    console.log("💾 Updated Pool Q-R info saved to pool-qr-info.json");
    
    console.log(`\n💰 Pool Q-R Large Liquidity Summary:`);
    console.log(`Pool Address: ${POOL_PDA.toString()}`);
    console.log(`Added Liquidity: ${formatTokenAmount(-tokenQChange)} Token Q + ${formatTokenAmount(-tokenRChange)} Token R`);
    console.log(`LP Tokens Received: ${formatTokenAmount(lpChange)}`);
    console.log(`Total Pool Liquidity: ${formatTokenAmount(updatedPoolInfo.totalLiquidityQ)} Token Q + ${formatTokenAmount(updatedPoolInfo.totalLiquidityR)} Token R`);
    
    return updatedPoolInfo;
    
  } catch (error) {
    console.error("❌ Error adding large liquidity to Pool Q-R:", error.message);
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
addLiquidityQR().catch(console.error);
