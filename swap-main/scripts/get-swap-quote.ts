import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as fs from "fs";

// --- CONFIG ---
const RPC_ENDPOINT = "https://rpc.gorbchain.xyz";
const WS_ENDPOINT = "wss://rpc.gorbchain.xyz/ws/";
const AMM_PROGRAM_ID = new PublicKey("aBfrRgukSYDMgdyQ8y1XNEk4w5u7Ugtz5fPHFnkStJX");

const USER_KEYPAIR_PATH = "/home/saurabh/.config/solana/id.json";
const userKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(USER_KEYPAIR_PATH, "utf-8")))
);

const connection = new Connection(RPC_ENDPOINT, {
  commitment: "confirmed",
  wsEndpoint: WS_ENDPOINT,
});

/**
 * TypeScript Script: Get Swap Quote
 * Based on IDL: GetSwapQuote (discriminant: 9)
 * Args: amount_in (u64), token_in (Pubkey)
 */
async function getSwapQuote(poolPDA: PublicKey, tokenIn: PublicKey, amountIn: number, description: string) {
  try {
    console.log(`\n🚀 Getting swap quote: ${description}...`);
    console.log(`Pool PDA: ${poolPDA.toString()}`);
    console.log(`Token In: ${tokenIn.toString()}`);
    console.log(`Amount In: ${amountIn} (${(amountIn / 1_000_000_000).toFixed(6)} tokens)`);

    // Create transaction
    const transaction = new Transaction();

    // Prepare accounts for GetSwapQuote
    const accounts = [
      { pubkey: poolPDA, isSigner: false, isWritable: false },
    ];

    // Instruction data (Borsh: GetSwapQuote { amount_in, token_in })
    const data = Buffer.alloc(1 + 8 + 32); // 1 byte discriminator + 8 bytes u64 + 32 bytes Pubkey
    data.writeUInt8(9, 0); // GetSwapQuote discriminator
    data.writeBigUInt64LE(BigInt(amountIn), 1); // amount_in
    tokenIn.toBuffer().copy(data, 9); // token_in (32 bytes)
    
    console.log(`📝 Instruction data: ${data.toString('hex')}`);

    // Add GetSwapQuote instruction
    console.log(`📝 Adding GetSwapQuote instruction...`);
    transaction.add({
      keys: accounts,
      programId: AMM_PROGRAM_ID,
      data,
    });

    // Send transaction
    console.log(`📝 Sending GetSwapQuote transaction...`);
    const signature = await connection.sendTransaction(transaction, [userKeypair], {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    console.log(`✅ GetSwapQuote transaction sent!`);
    console.log(`Transaction signature: ${signature}`);

    // Wait a bit for transaction to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get transaction logs to see the response
    try {
      const transactionDetails = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (transactionDetails && transactionDetails.meta && transactionDetails.meta.logMessages) {
        console.log(`\n📊 Swap Quote Response for ${description}:`);
        transactionDetails.meta.logMessages.forEach(log => {
          if (log.includes("Program log:")) {
            console.log(`  ${log}`);
          }
        });
      } else {
        console.log(`⚠️  Could not retrieve transaction logs for ${description}`);
      }
    } catch (logError) {
      console.log(`⚠️  Could not retrieve transaction logs for ${description}:`, (logError as Error).message);
    }

    return {
      description,
      poolPDA: poolPDA.toString(),
      tokenIn: tokenIn.toString(),
      amountIn,
      transactionSignature: signature,
    };

  } catch (error) {
    console.error(`❌ Error getting swap quote for ${description}:`, error);
    throw error;
  }
}

/**
 * Main function to get swap quotes for different scenarios
 */
async function getAllSwapQuotes() {
  try {
    console.log("🚀 TypeScript Script: Getting Swap Quotes...");
    
    // Load token and pool info from existing files
    const tokenXInfo = JSON.parse(fs.readFileSync('token-x-info.json', 'utf-8'));
    const tokenYInfo = JSON.parse(fs.readFileSync('token-y-info.json', 'utf-8'));
    const tokenZInfo = JSON.parse(fs.readFileSync('token-z-info.json', 'utf-8'));
    const poolXYInfo = JSON.parse(fs.readFileSync('pool-xy-info.json', 'utf-8'));
    const poolYZInfo = JSON.parse(fs.readFileSync('pool-yz-info.json', 'utf-8'));
    const nativeSOLPoolInfo = JSON.parse(fs.readFileSync('native-sol-pool-info.json', 'utf-8'));
    
    const TOKEN_X_MINT = new PublicKey(tokenXInfo.mint);
    const TOKEN_Y_MINT = new PublicKey(tokenYInfo.mint);
    const TOKEN_Z_MINT = new PublicKey(tokenZInfo.mint);
    const POOL_XY_PDA = new PublicKey(poolXYInfo.poolPDA);
    const POOL_YZ_PDA = new PublicKey(poolYZInfo.poolPDA);
    const NATIVE_SOL_POOL_PDA = new PublicKey(nativeSOLPoolInfo.poolPDA);
    
    console.log(`Testing swap quotes with our pools:`);
    console.log(`- X-Y Pool: ${POOL_XY_PDA.toString()}`);
    console.log(`- Y-Z Pool: ${POOL_YZ_PDA.toString()}`);
    console.log(`- Native SOL Pool: ${NATIVE_SOL_POOL_PDA.toString()}`);

    // Test different swap scenarios
    const results = [];
    
    // Test 1: Swap Token X to Token Y in X-Y Pool
    const amountIn = 100_000_000; // 0.1 tokens
    const swapXYResult = await getSwapQuote(
      POOL_XY_PDA, 
      TOKEN_X_MINT, 
      amountIn, 
      "Token X → Token Y (X-Y Pool)"
    );
    results.push(swapXYResult);
    
    // Wait between requests
    console.log("\n⏳ Waiting 3 seconds before next request...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 2: Swap Token Y to Token Z in Y-Z Pool
    const swapYZResult = await getSwapQuote(
      POOL_YZ_PDA, 
      TOKEN_Y_MINT, 
      amountIn, 
      "Token Y → Token Z (Y-Z Pool)"
    );
    results.push(swapYZResult);
    
    // Wait between requests
    console.log("\n⏳ Waiting 3 seconds before next request...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 3: Swap Token X to SOL in Native SOL Pool
    const swapXSOLResult = await getSwapQuote(
      NATIVE_SOL_POOL_PDA, 
      TOKEN_X_MINT, 
      amountIn, 
      "Token X → SOL (Native SOL Pool)"
    );
    results.push(swapXSOLResult);

    // Save all results
    const allResults = {
      timestamp: new Date().toISOString(),
      quotes: results,
    };

    fs.writeFileSync("get-swap-quote-results.json", JSON.stringify(allResults, null, 2));
    console.log("\n💾 GetSwapQuote results saved to get-swap-quote-results.json");

    return allResults;

  } catch (error) {
    console.error("❌ Error getting swap quotes:", error);
    throw error;
  }
}

// Run the function
getAllSwapQuotes().catch(console.error);
