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
 * Step 26: Test Multihop Swap P->Q->R
 * Function: testMultihopPQR()
 * Purpose: Tests large multihop swap from Token P to Token R via Token Q
 */
async function testMultihopPQR() {
  try {
    console.log("🚀 Step 26: Testing Large Multihop Swap P->Q->R...");
    
    // Load pool and token info
    const poolPQInfo = JSON.parse(fs.readFileSync('pool-pq-info.json', 'utf-8'));
    const poolQRInfo = JSON.parse(fs.readFileSync('pool-qr-info.json', 'utf-8'));
    const tokenPInfo = JSON.parse(fs.readFileSync('token-p-info.json', 'utf-8'));
    const tokenQInfo = JSON.parse(fs.readFileSync('token-q-info.json', 'utf-8'));
    const tokenRInfo = JSON.parse(fs.readFileSync('token-r-info.json', 'utf-8'));
    
    const TOKEN_P_MINT = new PublicKey(tokenPInfo.mint);
    const TOKEN_Q_MINT = new PublicKey(tokenQInfo.mint);
    const TOKEN_R_MINT = new PublicKey(tokenRInfo.mint);
    
    // Pool P-Q
    const POOL_PQ_PDA = new PublicKey(poolPQInfo.poolPDA);
    const VAULT_PQ_P = new PublicKey(poolPQInfo.vaultP);
    const VAULT_PQ_Q = new PublicKey(poolPQInfo.vaultQ);
    
    // Pool Q-R
    const POOL_QR_PDA = new PublicKey(poolQRInfo.poolPDA);
    const VAULT_QR_Q = new PublicKey(poolQRInfo.vaultQ);
    const VAULT_QR_R = new PublicKey(poolQRInfo.vaultR);
    
    console.log(`Token P: ${TOKEN_P_MINT.toString()}`);
    console.log(`Token Q: ${TOKEN_Q_MINT.toString()}`);
    console.log(`Token R: ${TOKEN_R_MINT.toString()}`);
    console.log(`Pool P-Q: ${POOL_PQ_PDA.toString()}`);
    console.log(`Pool Q-R: ${POOL_QR_PDA.toString()}`);

    // User ATAs
    const userTokenP = getAssociatedTokenAddressSync(TOKEN_P_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userTokenQ = getAssociatedTokenAddressSync(TOKEN_Q_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userTokenR = getAssociatedTokenAddressSync(TOKEN_R_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    
    console.log(`User Token P ATA: ${userTokenP.toString()}`);
    console.log(`User Token Q ATA: ${userTokenQ.toString()}`);
    console.log(`User Token R ATA: ${userTokenR.toString()}`);

    // Check balances before swap
    console.log("\n📊 Balances BEFORE Multihop Swap:");
    const balanceTokenPBefore = await getTokenBalance(userTokenP);
    const balanceTokenQBefore = await getTokenBalance(userTokenQ);
    const balanceTokenRBefore = await getTokenBalance(userTokenR);
    console.log(`Token P: ${formatTokenAmount(balanceTokenPBefore)} (${balanceTokenPBefore} raw)`);
    console.log(`Token Q: ${formatTokenAmount(balanceTokenQBefore)} (${balanceTokenQBefore} raw)`);
    console.log(`Token R: ${formatTokenAmount(balanceTokenRBefore)} (${balanceTokenRBefore} raw)`);

    // Large swap amount
    const swapAmountP = 5_000_000_000; // 5 tokens (large amount)
    
    console.log(`\n🔄 Multihop Swap Parameters:`);
    console.log(`Swap Amount: ${formatTokenAmount(swapAmountP)} Token P`);
    console.log(`Route: P -> Q -> R`);
    console.log(`Expected: P decreases, Q stays same (intermediate), R increases`);

    // Create transaction for multihop swap
    const tx = new Transaction();
    
    // First swap: P -> Q (Pool P-Q)
    console.log("📝 Adding first swap instruction (P -> Q)...");
    const swapPQAccounts = [
      { pubkey: POOL_PQ_PDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_P_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_Q_MINT, isSigner: false, isWritable: false },
      { pubkey: VAULT_PQ_P, isSigner: false, isWritable: true },
      { pubkey: VAULT_PQ_Q, isSigner: false, isWritable: true },
      { pubkey: userTokenP, isSigner: false, isWritable: true }, // user_in
      { pubkey: userTokenQ, isSigner: false, isWritable: true }, // user_out
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    const swapPQData = Buffer.alloc(1 + 8 + 1); // 1 byte discriminator + u64 + bool
    swapPQData.writeUInt8(3, 0); // Swap discriminator
    swapPQData.writeBigUInt64LE(BigInt(swapAmountP), 1);
    swapPQData.writeUInt8(1, 9); // direction P to Q (true)
    
    tx.add({
      keys: swapPQAccounts,
      programId: AMM_PROGRAM_ID,
      data: swapPQData,
    });

    // Second swap: Q -> R (Pool Q-R)
    console.log("📝 Adding second swap instruction (Q -> R)...");
    const swapQRAccounts = [
      { pubkey: POOL_QR_PDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_Q_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_R_MINT, isSigner: false, isWritable: false },
      { pubkey: VAULT_QR_Q, isSigner: false, isWritable: true },
      { pubkey: VAULT_QR_R, isSigner: false, isWritable: true },
      { pubkey: userTokenQ, isSigner: false, isWritable: true }, // user_in
      { pubkey: userTokenR, isSigner: false, isWritable: true }, // user_out
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    // For the second swap, we need to calculate how much Q we got from the first swap
    // This is a simplified approach - in practice, you'd want to calculate the exact amount
    const estimatedQAmount = Math.floor(swapAmountP * 1.5); // Rough estimate based on 2:3 ratio
    
    const swapQRData = Buffer.alloc(1 + 8 + 1); // 1 byte discriminator + u64 + bool
    swapQRData.writeUInt8(3, 0); // Swap discriminator
    swapQRData.writeBigUInt64LE(BigInt(estimatedQAmount), 1);
    swapQRData.writeUInt8(1, 9); // direction Q to R (true)
    
    tx.add({
      keys: swapQRAccounts,
      programId: AMM_PROGRAM_ID,
      data: swapQRData,
    });

    // Send transaction
    console.log("📤 Sending multihop swap transaction...");
    const sig = await sendAndConfirmTransaction(connection, tx, [userKeypair], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    
    console.log("✅ Large multihop swap P->Q->R successful!");
    console.log(`Transaction signature: ${sig}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${sig}`);
    
    // Check balances after swap
    console.log("\n📊 Balances AFTER Multihop Swap:");
    const balanceTokenPAfter = await getTokenBalance(userTokenP);
    const balanceTokenQAfter = await getTokenBalance(userTokenQ);
    const balanceTokenRAfter = await getTokenBalance(userTokenR);
    console.log(`Token P: ${formatTokenAmount(balanceTokenPAfter)} (${balanceTokenPAfter} raw)`);
    console.log(`Token Q: ${formatTokenAmount(balanceTokenQAfter)} (${balanceTokenQAfter} raw)`);
    console.log(`Token R: ${formatTokenAmount(balanceTokenRAfter)} (${balanceTokenRAfter} raw)`);

    // Calculate actual changes
    const tokenPChange = balanceTokenPAfter - balanceTokenPBefore;
    const tokenQChange = balanceTokenQAfter - balanceTokenQBefore;
    const tokenRChange = balanceTokenRAfter - balanceTokenRBefore;
    
    console.log("\n🔄 Multihop Swap Results:");
    console.log(`Token P Change: ${formatTokenAmount(tokenPChange)} (${tokenPChange > 0 ? '+' : ''}${tokenPChange} raw)`);
    console.log(`Token Q Change: ${formatTokenAmount(tokenQChange)} (${tokenQChange > 0 ? '+' : ''}${tokenQChange} raw)`);
    console.log(`Token R Change: ${formatTokenAmount(tokenRChange)} (${tokenRChange > 0 ? '+' : ''}${tokenRChange} raw)`);
    
    // Calculate swap efficiency
    const totalInput = Math.abs(tokenPChange);
    const totalOutput = tokenRChange;
    const efficiency = totalOutput / totalInput;
    
    console.log(`\n📈 Swap Analysis:`);
    console.log(`Total Input: ${formatTokenAmount(totalInput)} Token P`);
    console.log(`Total Output: ${formatTokenAmount(totalOutput)} Token R`);
    console.log(`Swap Efficiency: ${(efficiency * 100).toFixed(2)}%`);
    console.log(`Effective Rate: 1 P = ${(efficiency).toFixed(6)} R`);
    
    // Save swap results
    const swapResults = {
      timestamp: new Date().toISOString(),
      transactionSignature: sig,
      inputToken: "P",
      outputToken: "R",
      route: "P->Q->R",
      inputAmount: totalInput,
      outputAmount: totalOutput,
      efficiency: efficiency,
      effectiveRate: efficiency,
      poolPQ: POOL_PQ_PDA.toString(),
      poolQR: POOL_QR_PDA.toString(),
      balancesBefore: {
        tokenP: balanceTokenPBefore,
        tokenQ: balanceTokenQBefore,
        tokenR: balanceTokenRBefore
      },
      balancesAfter: {
        tokenP: balanceTokenPAfter,
        tokenQ: balanceTokenQAfter,
        tokenR: balanceTokenRAfter
      }
    };
    
    fs.writeFileSync('multihop-pqr-results.json', JSON.stringify(swapResults, null, 2));
    console.log("💾 Multihop swap results saved to multihop-pqr-results.json");
    
    console.log(`\n💰 Multihop Swap Summary:`);
    console.log(`Route: P -> Q -> R`);
    console.log(`Input: ${formatTokenAmount(totalInput)} Token P`);
    console.log(`Output: ${formatTokenAmount(totalOutput)} Token R`);
    console.log(`Efficiency: ${(efficiency * 100).toFixed(2)}%`);
    console.log(`Transaction: ${sig}`);
    
    return swapResults;
    
  } catch (error) {
    console.error("❌ Error in multihop swap P->Q->R:", error.message);
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
testMultihopPQR().catch(console.error);
