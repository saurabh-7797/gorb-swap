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
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return 0;
}

// Helper function to format token amounts
function formatTokenAmount(amount, decimals = 9) {
  return (amount / Math.pow(10, decimals)).toFixed(6);
}

/**
 * Large Swap X to Y
 * Function: largeSwapXToY()
 * Purpose: Performs a large swap from Token X to Token Y (5.0 tokens)
 */
async function largeSwapXToY() {
  try {
    console.log("🚀 Large Swap: X → Y (5.0 tokens)...");
    
    // Load Pool X-Y info
    const poolInfo = JSON.parse(fs.readFileSync('pool-xy-info.json', 'utf-8'));
    
    const TOKEN_X_MINT = new PublicKey(poolInfo.tokenX);
    const TOKEN_Y_MINT = new PublicKey(poolInfo.tokenY);
    const POOL_PDA = new PublicKey(poolInfo.poolPDA);
    const VAULT_X = new PublicKey(poolInfo.vaultX);
    const VAULT_Y = new PublicKey(poolInfo.vaultY);
    
    console.log(`Token X: ${TOKEN_X_MINT.toString()}`);
    console.log(`Token Y: ${TOKEN_Y_MINT.toString()}`);
    console.log(`Pool PDA: ${POOL_PDA.toString()}`);

    // User ATAs
    const userTokenX = getAssociatedTokenAddressSync(TOKEN_X_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userTokenY = getAssociatedTokenAddressSync(TOKEN_Y_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    console.log(`User Token X ATA: ${userTokenX.toString()}`);
    console.log(`User Token Y ATA: ${userTokenY.toString()}`);

    // Check balances before swap
    console.log("\n📊 Balances BEFORE Large Swap:");
    const balanceTokenXBefore = await getTokenBalance(userTokenX);
    const balanceTokenYBefore = await getTokenBalance(userTokenY);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXBefore)} (${balanceTokenXBefore} raw)`);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYBefore)} (${balanceTokenYBefore} raw)`);

    // Large swap parameters
    const amountIn = 5_000_000_000; // 5.0 tokens
    const directionAToB = true; // X to Y
    
    console.log(`\n🔄 Large Swap Parameters:`);
    console.log(`Amount In: ${formatTokenAmount(amountIn)} Token X`);
    console.log(`Direction: X → Y`);
    console.log(`Expected Fee: ~0.3%`);

    // Prepare accounts for Swap
    const accounts = [
      { pubkey: POOL_PDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_X_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false },
      { pubkey: VAULT_X, isSigner: false, isWritable: true },
      { pubkey: VAULT_Y, isSigner: false, isWritable: true },
      { pubkey: userTokenX, isSigner: false, isWritable: true },
      { pubkey: userTokenY, isSigner: false, isWritable: true },
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    // Instruction data (Borsh: Swap { amount_in, direction_a_to_b })
    const data = Buffer.alloc(1 + 8 + 1); // discriminator + u64 + bool
    data.writeUInt8(3, 0); // Swap discriminator
    data.writeBigUInt64LE(BigInt(amountIn), 1);
    data.writeUInt8(directionAToB ? 1 : 0, 9);
    
    console.log(`\n📝 Instruction data: ${data.toString('hex')}`);

    // Create transaction
    const tx = new Transaction();

    // Add Swap instruction
    console.log("📝 Adding Large Swap instruction...");
    
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
    
    console.log("✅ Large Swap transaction successful!");
    console.log(`Transaction signature: ${sig}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${sig}`);
    
    // Check balances after swap
    console.log("\n📊 Balances AFTER Large Swap:");
    const balanceTokenXAfter = await getTokenBalance(userTokenX);
    const balanceTokenYAfter = await getTokenBalance(userTokenY);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXAfter)} (${balanceTokenXAfter} raw)`);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYAfter)} (${balanceTokenYAfter} raw)`);

    // Calculate actual changes
    const tokenXChange = balanceTokenXAfter - balanceTokenXBefore;
    const tokenYChange = balanceTokenYAfter - balanceTokenYBefore;
    
    console.log("\n🔄 Large Swap Results:");
    console.log(`Token X Change: ${formatTokenAmount(tokenXChange)} (${tokenXChange > 0 ? '+' : ''}${tokenXChange} raw)`);
    console.log(`Token Y Change: ${formatTokenAmount(tokenYChange)} (${tokenYChange > 0 ? '+' : ''}${tokenYChange} raw)`);
    
    console.log(`\n💰 Large Swap Summary:`);
    console.log(`Tokens Swapped:`);
    console.log(`  - Token X Spent: ${formatTokenAmount(-tokenXChange)} (${-tokenXChange} raw)`);
    console.log(`  - Token Y Received: ${formatTokenAmount(tokenYChange)} (${tokenYChange} raw)`);
    console.log(`Effective Exchange Rate: 1 Token X = ${formatTokenAmount(tokenYChange / -tokenXChange)} Token Y`);
    
    // Save large swap results
    const swapResults = {
      swapType: "Large Swap X to Y",
      amountIn: amountIn,
      amountOut: tokenYChange,
      tokenXSpent: -tokenXChange,
      tokenYReceived: tokenYChange,
      exchangeRate: tokenYChange / -tokenXChange,
      transactionSignature: sig
    };
    
    fs.writeFileSync('large-swap-x-to-y-results.json', JSON.stringify(swapResults, null, 2));
    console.log("💾 Large swap results saved to large-swap-x-to-y-results.json");
    
    return swapResults;
    
  } catch (error) {
    console.error("❌ Error in Large Swap:", error.message);
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
largeSwapXToY().catch(console.error);


