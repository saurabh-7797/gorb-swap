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
 * Step 24: Add Large Liquidity to Pool P-Q
 * Function: addLiquidityPQ()
 * Purpose: Adds large amounts of liquidity to the existing Pool P-Q
 */
async function addLiquidityPQ() {
  try {
    console.log("🚀 Step 24: Adding Large Liquidity to Pool P-Q...");
    
    // Load Pool P-Q info from previous step
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

    // Check balances before adding liquidity
    console.log("\n📊 Balances BEFORE Adding Liquidity:");
    const balanceTokenPBefore = await getTokenBalance(userTokenP);
    const balanceTokenQBefore = await getTokenBalance(userTokenQ);
    const balanceLPBefore = await getTokenBalance(userLP);
    console.log(`Token P: ${formatTokenAmount(balanceTokenPBefore)} (${balanceTokenPBefore} raw)`);
    console.log(`Token Q: ${formatTokenAmount(balanceTokenQBefore)} (${balanceTokenQBefore} raw)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPBefore)} (${balanceLPBefore} raw)`);

    // Large liquidity amounts maintaining 2:3 ratio
    const amountP = 20_000_000_000; // 20 tokens (large amount)
    const amountQ = 30_000_000_000; // 30 tokens (large amount)
    
    console.log(`\n🏊 Adding Large Liquidity Parameters:`);
    console.log(`Token P Amount: ${formatTokenAmount(amountP)} Token P`);
    console.log(`Token Q Amount: ${formatTokenAmount(amountQ)} Token Q`);
    console.log(`Ratio: 2:3 (P:Q) - maintaining pool ratio`);

    // Prepare accounts for AddLiquidity
    const accounts = [
      { pubkey: POOL_PDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_P_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_Q_MINT, isSigner: false, isWritable: false },
      { pubkey: VAULT_P, isSigner: false, isWritable: true },
      { pubkey: VAULT_Q, isSigner: false, isWritable: true },
      { pubkey: LP_MINT, isSigner: false, isWritable: true },
      { pubkey: userTokenP, isSigner: false, isWritable: true },
      { pubkey: userTokenQ, isSigner: false, isWritable: true },
      { pubkey: userLP, isSigner: false, isWritable: true },
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    // Instruction data (Borsh: AddLiquidity { amount_a, amount_b })
    const data = Buffer.alloc(1 + 8 + 8); // 1 byte discriminator + 2x u64
    data.writeUInt8(1, 0); // AddLiquidity discriminator
    data.writeBigUInt64LE(BigInt(amountP), 1);
    data.writeBigUInt64LE(BigInt(amountQ), 9);
    
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
    
    console.log("✅ Large liquidity addition to Pool P-Q successful!");
    console.log(`Transaction signature: ${sig}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${sig}`);
    
    // Check balances after adding liquidity
    console.log("\n📊 Balances AFTER Adding Liquidity:");
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
    
    console.log("\n🏊 Large Liquidity Addition Results:");
    console.log(`Token P Change: ${formatTokenAmount(tokenPChange)} (${tokenPChange > 0 ? '+' : ''}${tokenPChange} raw)`);
    console.log(`Token Q Change: ${formatTokenAmount(tokenQChange)} (${tokenQChange > 0 ? '+' : ''}${tokenQChange} raw)`);
    console.log(`LP Tokens Received: ${formatTokenAmount(lpChange)} (${lpChange} raw)`);
    
    // Calculate expected LP tokens (geometric mean)
    const expectedLP = Math.sqrt(amountP * amountQ);
    console.log(`Expected LP Tokens: ${formatTokenAmount(expectedLP)}`);
    console.log(`Actual LP Tokens: ${formatTokenAmount(lpChange)}`);
    console.log(`Difference: ${formatTokenAmount(Math.abs(expectedLP - lpChange))}`);
    
    // Update Pool P-Q info
    const updatedPoolInfo = {
      ...poolInfo,
      totalLiquidityP: poolInfo.initialLiquidityP + (-tokenPChange),
      totalLiquidityQ: poolInfo.initialLiquidityQ + (-tokenQChange),
      totalLPTokens: poolInfo.lpTokensReceived + lpChange,
      liquidityAdditions: (poolInfo.liquidityAdditions || 0) + 1
    };
    
    fs.writeFileSync('pool-pq-info.json', JSON.stringify(updatedPoolInfo, null, 2));
    console.log("💾 Updated Pool P-Q info saved to pool-pq-info.json");
    
    console.log(`\n💰 Pool P-Q Large Liquidity Summary:`);
    console.log(`Pool Address: ${POOL_PDA.toString()}`);
    console.log(`Added Liquidity: ${formatTokenAmount(-tokenPChange)} Token P + ${formatTokenAmount(-tokenQChange)} Token Q`);
    console.log(`LP Tokens Received: ${formatTokenAmount(lpChange)}`);
    console.log(`Total Pool Liquidity: ${formatTokenAmount(updatedPoolInfo.totalLiquidityP)} Token P + ${formatTokenAmount(updatedPoolInfo.totalLiquidityQ)} Token Q`);
    
    return updatedPoolInfo;
    
  } catch (error) {
    console.error("❌ Error adding large liquidity to Pool P-Q:", error.message);
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
addLiquidityPQ().catch(console.error);
