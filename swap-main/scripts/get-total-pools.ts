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
 * TypeScript Script: Get Total Pools
 * Based on IDL: GetTotalPools (discriminant: 7)
 * Args: None
 */
async function getTotalPools() {
  try {
    console.log("🚀 TypeScript Script: Getting Total Pools...");

    // Create transaction
    const transaction = new Transaction();

    // Prepare accounts for GetTotalPools (no accounts needed)
    const accounts: any[] = [];

    // Instruction data (Borsh: GetTotalPools - no args)
    const data = Buffer.alloc(1); // 1 byte discriminator only
    data.writeUInt8(7, 0); // GetTotalPools discriminator
    
    console.log(`📝 Instruction data: ${data.toString('hex')}`);

    // Add GetTotalPools instruction
    console.log("📝 Adding GetTotalPools instruction...");
    transaction.add({
      keys: accounts,
      programId: AMM_PROGRAM_ID,
      data,
    });

    // Send transaction
    console.log("📝 Sending GetTotalPools transaction...");
    const signature = await connection.sendTransaction(transaction, [userKeypair], {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    console.log(`✅ GetTotalPools transaction sent!`);
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
        console.log(`\n📊 GetTotalPools Response:`);
        transactionDetails.meta.logMessages.forEach(log => {
          if (log.includes("Program log:")) {
            console.log(`  ${log}`);
          }
        });
      } else {
        console.log(`⚠️  Could not retrieve transaction logs`);
      }
    } catch (logError) {
      console.log(`⚠️  Could not retrieve transaction logs:`, (logError as Error).message);
    }

    // Save result
    const result = {
      function: "GetTotalPools",
      transactionSignature: signature,
      timestamp: new Date().toISOString(),
      note: "This function currently logs a message. In production, it would return the actual total pool count."
    };

    fs.writeFileSync("get-total-pools-result.json", JSON.stringify(result, null, 2));
    console.log("\n💾 GetTotalPools result saved to get-total-pools-result.json");

    return result;

  } catch (error) {
    console.error("❌ Error calling GetTotalPools:", error);
    throw error;
  }
}

// Run the function
getTotalPools().catch(console.error);
