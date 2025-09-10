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
 * TypeScript Script: Find Pools by Token Address
 * Based on IDL: FindPoolsByToken (discriminant: 8)
 * Args: token_address (Pubkey)
 */
async function findPoolsByToken(tokenAddress: PublicKey, tokenName: string) {
  try {
    console.log(`\n🚀 Finding pools for ${tokenName}...`);
    console.log(`Token Address: ${tokenAddress.toString()}`);

    // Create transaction
    const transaction = new Transaction();

    // Prepare accounts for FindPoolsByToken (no accounts needed)
    const accounts: any[] = [];

    // Instruction data (Borsh: FindPoolsByToken { token_address })
    const data = Buffer.alloc(1 + 32); // 1 byte discriminator + 32 bytes for Pubkey
    data.writeUInt8(8, 0); // FindPoolsByToken discriminator
    tokenAddress.toBuffer().copy(data, 1); // Copy the 32-byte pubkey
    
    console.log(`📝 Instruction data: ${data.toString('hex')}`);

    // Add FindPoolsByToken instruction
    console.log(`📝 Adding FindPoolsByToken instruction for ${tokenName}...`);
    transaction.add({
      keys: accounts,
      programId: AMM_PROGRAM_ID,
      data,
    });

    // Send transaction
    console.log(`📝 Sending FindPoolsByToken transaction for ${tokenName}...`);
    const signature = await connection.sendTransaction(transaction, [userKeypair], {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    console.log(`✅ FindPoolsByToken transaction sent for ${tokenName}!`);
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
        console.log(`\n📊 FindPoolsByToken Response for ${tokenName}:`);
        transactionDetails.meta.logMessages.forEach(log => {
          if (log.includes("Program log:")) {
            console.log(`  ${log}`);
          }
        });
      } else {
        console.log(`⚠️  Could not retrieve transaction logs for ${tokenName}`);
      }
    } catch (logError) {
      console.log(`⚠️  Could not retrieve transaction logs for ${tokenName}:`, (logError as Error).message);
    }

    return {
      tokenName,
      tokenAddress: tokenAddress.toString(),
      transactionSignature: signature,
    };

  } catch (error) {
    console.error(`❌ Error finding pools for ${tokenName}:`, error);
    throw error;
  }
}

/**
 * Main function to find pools for all our tokens
 */
async function findAllPoolsByToken() {
  try {
    console.log("🚀 TypeScript Script: Finding Pools by Token Address...");
    
    // Load token info from existing files
    const tokenXInfo = JSON.parse(fs.readFileSync('token-x-info.json', 'utf-8'));
    const tokenYInfo = JSON.parse(fs.readFileSync('token-y-info.json', 'utf-8'));
    const tokenZInfo = JSON.parse(fs.readFileSync('token-z-info.json', 'utf-8'));
    
    const TOKEN_X_MINT = new PublicKey(tokenXInfo.mint);
    const TOKEN_Y_MINT = new PublicKey(tokenYInfo.mint);
    const TOKEN_Z_MINT = new PublicKey(tokenZInfo.mint);
    
    console.log(`Testing with our tokens:`);
    console.log(`- Token X: ${TOKEN_X_MINT.toString()}`);
    console.log(`- Token Y: ${TOKEN_Y_MINT.toString()}`);
    console.log(`- Token Z: ${TOKEN_Z_MINT.toString()}`);

    // Find pools for each token
    const results = [];
    
    // Find pools for Token X
    const tokenXResult = await findPoolsByToken(TOKEN_X_MINT, "Token X");
    results.push(tokenXResult);
    
    // Wait between requests
    console.log("\n⏳ Waiting 3 seconds before next request...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Find pools for Token Y
    const tokenYResult = await findPoolsByToken(TOKEN_Y_MINT, "Token Y");
    results.push(tokenYResult);
    
    // Wait between requests
    console.log("\n⏳ Waiting 3 seconds before next request...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Find pools for Token Z
    const tokenZResult = await findPoolsByToken(TOKEN_Z_MINT, "Token Z");
    results.push(tokenZResult);

    // Save all results
    const allResults = {
      timestamp: new Date().toISOString(),
      searches: results,
    };

    fs.writeFileSync("find-pools-by-token-results.json", JSON.stringify(allResults, null, 2));
    console.log("\n💾 FindPoolsByToken results saved to find-pools-by-token-results.json");

    return allResults;

  } catch (error) {
    console.error("❌ Error finding pools by token:", error);
    throw error;
  }
}

// Run the function
findAllPoolsByToken().catch(console.error);
