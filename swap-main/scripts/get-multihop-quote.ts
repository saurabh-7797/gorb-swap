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
 * TypeScript Script: Get Multihop Quote
 * Based on IDL: GetMultihopQuote (discriminant: 10)
 * Args: amount_in (u64), token_path (Vec<Pubkey>)
 */
async function getMultihopQuote(tokenPath: PublicKey[], amountIn: number, description: string) {
  try {
    console.log(`\n🚀 Getting multihop quote: ${description}...`);
    console.log(`Token Path: ${tokenPath.map(t => t.toString()).join(' → ')}`);
    console.log(`Amount In: ${amountIn} (${(amountIn / 1_000_000_000).toFixed(6)} tokens)`);

    // Create transaction
    const transaction = new Transaction();

    // Prepare accounts for GetMultihopQuote
    // We need to provide pool accounts for each hop
    const accounts: any[] = [];
    
    // For multihop paths, we need to provide pools in the correct order
    if (tokenPath.length === 3) {
      // Load pool info
      const poolXYInfo = JSON.parse(fs.readFileSync('pool-xy-info.json', 'utf-8'));
      const poolYZInfo = JSON.parse(fs.readFileSync('pool-yz-info.json', 'utf-8'));
      
      const POOL_XY_PDA = new PublicKey(poolXYInfo.poolPDA);
      const POOL_YZ_PDA = new PublicKey(poolYZInfo.poolPDA);
      
      // Determine the correct order based on the token path
      const tokenX = tokenPath[0].toString();
      const tokenY = tokenPath[1].toString();
      const tokenZ = tokenPath[2].toString();
      
      // Check if this is X → Y → Z or Z → Y → X
      if (tokenX === '57t7yKk4WJk7W4fnaarpFbC3bwGWApJ946T6tWyoCjtE') {
        // X → Y → Z: need X-Y pool, then Y-Z pool
        accounts.push(
          { pubkey: POOL_XY_PDA, isSigner: false, isWritable: false },
          { pubkey: POOL_YZ_PDA, isSigner: false, isWritable: false }
        );
      } else {
        // Z → Y → X: need Y-Z pool, then X-Y pool (reverse order)
        accounts.push(
          { pubkey: POOL_YZ_PDA, isSigner: false, isWritable: false },
          { pubkey: POOL_XY_PDA, isSigner: false, isWritable: false }
        );
      }
    }

    // Instruction data (Borsh: GetMultihopQuote { amount_in, token_path })
    const tokenPathBytes = Buffer.concat(tokenPath.map(pk => pk.toBuffer()));
    const data = Buffer.alloc(1 + 8 + 4 + tokenPathBytes.length); // discriminator + u64 + u32 + Vec<Pubkey>
    data.writeUInt8(10, 0); // GetMultihopQuote discriminator
    data.writeBigUInt64LE(BigInt(amountIn), 1); // amount_in
    data.writeUInt32LE(tokenPath.length, 9); // Vec length
    tokenPathBytes.copy(data, 13); // Vec data
    
    console.log(`📝 Instruction data: ${data.toString('hex')}`);

    // Add GetMultihopQuote instruction
    console.log(`📝 Adding GetMultihopQuote instruction...`);
    transaction.add({
      keys: accounts,
      programId: AMM_PROGRAM_ID,
      data,
    });

    // Send transaction
    console.log(`📝 Sending GetMultihopQuote transaction...`);
    const signature = await connection.sendTransaction(transaction, [userKeypair], {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    console.log(`✅ GetMultihopQuote transaction sent!`);
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
        console.log(`\n📊 Multihop Quote Response for ${description}:`);
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
      tokenPath: tokenPath.map(t => t.toString()),
      amountIn,
      transactionSignature: signature,
    };

  } catch (error) {
    console.error(`❌ Error getting multihop quote for ${description}:`, error);
    throw error;
  }
}

/**
 * Main function to get multihop quotes for different paths
 */
async function getAllMultihopQuotes() {
  try {
    console.log("🚀 TypeScript Script: Getting Multihop Quotes...");
    
    // Load token info from existing files
    const tokenXInfo = JSON.parse(fs.readFileSync('token-x-info.json', 'utf-8'));
    const tokenYInfo = JSON.parse(fs.readFileSync('token-y-info.json', 'utf-8'));
    const tokenZInfo = JSON.parse(fs.readFileSync('token-z-info.json', 'utf-8'));
    
    const TOKEN_X_MINT = new PublicKey(tokenXInfo.mint);
    const TOKEN_Y_MINT = new PublicKey(tokenYInfo.mint);
    const TOKEN_Z_MINT = new PublicKey(tokenZInfo.mint);
    
    console.log(`Testing multihop quotes with our tokens:`);
    console.log(`- Token X: ${TOKEN_X_MINT.toString()}`);
    console.log(`- Token Y: ${TOKEN_Y_MINT.toString()}`);
    console.log(`- Token Z: ${TOKEN_Z_MINT.toString()}`);

    // Test different multihop scenarios
    const results = [];
    const amountIn = 100_000_000; // 0.1 tokens
    
    // Test 1: X → Y → Z (2 hops)
    const pathXYZ = [TOKEN_X_MINT, TOKEN_Y_MINT, TOKEN_Z_MINT];
    const multihopXYZResult = await getMultihopQuote(
      pathXYZ, 
      amountIn, 
      "Token X → Token Y → Token Z (2 hops)"
    );
    results.push(multihopXYZResult);
    
    // Wait between requests
    console.log("\n⏳ Waiting 3 seconds before next request...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 2: Z → Y → X (2 hops, reverse direction)
    const pathZYX = [TOKEN_Z_MINT, TOKEN_Y_MINT, TOKEN_X_MINT];
    const multihopZYXResult = await getMultihopQuote(
      pathZYX, 
      amountIn, 
      "Token Z → Token Y → Token X (2 hops, reverse)"
    );
    results.push(multihopZYXResult);

    // Save all results
    const allResults = {
      timestamp: new Date().toISOString(),
      quotes: results,
    };

    fs.writeFileSync("get-multihop-quote-results.json", JSON.stringify(allResults, null, 2));
    console.log("\n💾 GetMultihopQuote results saved to get-multihop-quote-results.json");

    return allResults;

  } catch (error) {
    console.error("❌ Error getting multihop quotes:", error);
    throw error;
  }
}

// Run the function
getAllMultihopQuotes().catch(console.error);
