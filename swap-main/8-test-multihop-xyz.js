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
 * Step 8: Test Multihop Swap X→Y→Z
 * Function: testMultihopXYZ()
 * Purpose: Tests multihop swap from Token X to Token Z via Token Y
 */
async function testMultihopXYZ() {
  try {
    console.log("🚀 Step 8: Testing Multihop Swap X→Y→Z...");
    
    // Load all token and pool info from previous steps
    const tokenXInfo = JSON.parse(fs.readFileSync('token-x-info.json', 'utf-8'));
    const tokenYInfo = JSON.parse(fs.readFileSync('token-y-info.json', 'utf-8'));
    const tokenZInfo = JSON.parse(fs.readFileSync('token-z-info.json', 'utf-8'));
    const poolXYInfo = JSON.parse(fs.readFileSync('pool-xy-info.json', 'utf-8'));
    const poolYZInfo = JSON.parse(fs.readFileSync('pool-yz-info.json', 'utf-8'));
    
    const TOKEN_X_MINT = new PublicKey(tokenXInfo.mint);
    const TOKEN_Y_MINT = new PublicKey(tokenYInfo.mint);
    const TOKEN_Z_MINT = new PublicKey(tokenZInfo.mint);
    
    // Pool X-Y info
    const POOL_XY_PDA = new PublicKey(poolXYInfo.poolPDA);
    const LP_XY_MINT = new PublicKey(poolXYInfo.lpMint);
    const VAULT_XY_X = new PublicKey(poolXYInfo.vaultX);
    const VAULT_XY_Y = new PublicKey(poolXYInfo.vaultY);
    
    // Pool Y-Z info
    const POOL_YZ_PDA = new PublicKey(poolYZInfo.poolPDA);
    const LP_YZ_MINT = new PublicKey(poolYZInfo.lpMint);
    const VAULT_YZ_Y = new PublicKey(poolYZInfo.vaultY);
    const VAULT_YZ_Z = new PublicKey(poolYZInfo.vaultZ);
    
    console.log(`Token X: ${TOKEN_X_MINT.toString()}`);
    console.log(`Token Y: ${TOKEN_Y_MINT.toString()}`);
    console.log(`Token Z: ${TOKEN_Z_MINT.toString()}`);
    console.log(`Pool X-Y: ${POOL_XY_PDA.toString()}`);
    console.log(`Pool Y-Z: ${POOL_YZ_PDA.toString()}`);

    // User ATAs
    const userTokenX = getAssociatedTokenAddressSync(TOKEN_X_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userTokenY = getAssociatedTokenAddressSync(TOKEN_Y_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userTokenZ = getAssociatedTokenAddressSync(TOKEN_Z_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    console.log(`User Token X ATA: ${userTokenX.toString()}`);
    console.log(`User Token Y ATA: ${userTokenY.toString()}`);
    console.log(`User Token Z ATA: ${userTokenZ.toString()}`);

    // Check balances before multihop swap
    console.log("\n📊 Balances BEFORE Multihop Swap:");
    const balanceTokenXBefore = await getTokenBalance(userTokenX);
    const balanceTokenYBefore = await getTokenBalance(userTokenY);
    const balanceTokenZBefore = await getTokenBalance(userTokenZ);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXBefore)} (${balanceTokenXBefore} raw)`);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYBefore)} (${balanceTokenYBefore} raw)`);
    console.log(`Token Z: ${formatTokenAmount(balanceTokenZBefore)} (${balanceTokenZBefore} raw)`);

    // Multihop swap parameters - CUSTOMIZE THESE VALUES!
    const amountIn = 500_000_000; // 0.5 Token X (changed from 0.1)
    const minimumAmountOut = 0; // 0 Token Z (no slippage protection for testing)
    const tokenPath = [TOKEN_X_MINT, TOKEN_Y_MINT, TOKEN_Z_MINT];
    
    console.log(`\n🛣️  Multihop Swap Parameters:`);
    console.log(`Amount In: ${formatTokenAmount(amountIn)} Token X`);
    console.log(`Minimum Amount Out: ${formatTokenAmount(minimumAmountOut)} Token Z`);
    console.log(`Path: X → Y → Z`);
    console.log(`Token Path: [${tokenPath.map(t => t.toString()).join(', ')}]`);

    // Create intermediate Token Y account for the swap route
    const intermediateTokenY = getAssociatedTokenAddressSync(TOKEN_Y_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);

    // Prepare accounts for MultihopSwap
    const accounts = [
      // User and program accounts
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: userTokenX, isSigner: false, isWritable: true }, // Initial input
      
      // Hop 1: X → Y
      { pubkey: POOL_XY_PDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_X_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false },
      { pubkey: VAULT_XY_X, isSigner: false, isWritable: true },
      { pubkey: VAULT_XY_Y, isSigner: false, isWritable: true },
      { pubkey: intermediateTokenY, isSigner: false, isWritable: true }, // Intermediate Y
      { pubkey: intermediateTokenY, isSigner: false, isWritable: true }, // Output for hop 1
      
      // Hop 2: Y → Z  
      { pubkey: POOL_YZ_PDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_Z_MINT, isSigner: false, isWritable: false },
      { pubkey: VAULT_YZ_Y, isSigner: false, isWritable: true },
      { pubkey: VAULT_YZ_Z, isSigner: false, isWritable: true },
      { pubkey: intermediateTokenY, isSigner: false, isWritable: true }, // Input for hop 2  
      { pubkey: userTokenZ, isSigner: false, isWritable: true }, // Final output
    ];

    // Instruction data (Borsh: MultihopSwap { amount_in, minimum_amount_out })
    const data = Buffer.alloc(1 + 8 + 8); // discriminator + amount_in + minimum_amount_out
    data.writeUInt8(4, 0); // MultihopSwap discriminator
    data.writeBigUInt64LE(BigInt(amountIn), 1);
    data.writeBigUInt64LE(BigInt(minimumAmountOut), 9);
    
    console.log(`\n📝 Instruction data: ${data.toString('hex')}`);

    // Create transaction
    const tx = new Transaction();

    // Add MultihopSwap instruction
    console.log("📝 Adding MultihopSwap instruction...");
    
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
    
    console.log("✅ Multihop Swap transaction successful!");
    console.log(`Transaction signature: ${sig}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${sig}`);
    
    // Check balances after multihop swap
    console.log("\n📊 Balances AFTER Multihop Swap:");
    const balanceTokenXAfter = await getTokenBalance(userTokenX);
    const balanceTokenYAfter = await getTokenBalance(userTokenY);
    const balanceTokenZAfter = await getTokenBalance(userTokenZ);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXAfter)} (${balanceTokenXAfter} raw)`);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYAfter)} (${balanceTokenYAfter} raw)`);
    console.log(`Token Z: ${formatTokenAmount(balanceTokenZAfter)} (${balanceTokenZAfter} raw)`);

    // Calculate actual changes
    const tokenXChange = balanceTokenXAfter - balanceTokenXBefore;
    const tokenYChange = balanceTokenYAfter - balanceTokenYBefore;
    const tokenZChange = balanceTokenZAfter - balanceTokenZBefore;
    
    console.log("\n🛣️  Multihop Swap Results:");
    console.log(`Token X Change: ${formatTokenAmount(tokenXChange)} (${tokenXChange > 0 ? '+' : ''}${tokenXChange} raw)`);
    console.log(`Token Y Change: ${formatTokenAmount(tokenYChange)} (${tokenYChange > 0 ? '+' : ''}${tokenYChange} raw)`);
    console.log(`Token Z Change: ${formatTokenAmount(tokenZChange)} (${tokenZChange > 0 ? '+' : ''}${tokenZChange} raw)`);
    
    console.log(`\n💰 Multihop Swap Summary:`);
    console.log(`Tokens Swapped:`);
    console.log(`  - Token X Spent: ${formatTokenAmount(-tokenXChange)} (${-tokenXChange} raw)`);
    console.log(`  - Token Y Intermediate: ${formatTokenAmount(tokenYChange)} (${tokenYChange} raw)`);
    console.log(`  - Token Z Received: ${formatTokenAmount(tokenZChange)} (${tokenZChange} raw)`);
    console.log(`Effective Exchange Rate: 1 Token X = ${formatTokenAmount(tokenZChange / -tokenXChange)} Token Z`);
    
    // Save multihop swap results
    const multihopResults = {
      amountIn: amountIn,
      amountOut: tokenZChange,
      tokenXSpent: -tokenXChange,
      tokenYIntermediate: tokenYChange,
      tokenZReceived: tokenZChange,
      exchangeRate: tokenZChange / -tokenXChange,
      path: tokenPath.map(t => t.toString()),
      transactionSignature: sig
    };
    
    fs.writeFileSync('multihop-xyz-results.json', JSON.stringify(multihopResults, null, 2));
    console.log("💾 Multihop swap results saved to multihop-xyz-results.json");
    
    console.log(`\n🎉 Multihop Swap X→Y→Z Test Completed Successfully!`);
    console.log(`✅ Successfully swapped ${formatTokenAmount(-tokenXChange)} Token X for ${formatTokenAmount(tokenZChange)} Token Z`);
    console.log(`✅ Used Token Y as intermediate token`);
    console.log(`✅ All transactions completed in single atomic operation`);
    
    return multihopResults;
    
  } catch (error) {
    console.error("❌ Error in Multihop Swap:", error.message);
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
testMultihopXYZ().catch(console.error);
