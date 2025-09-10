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
 * TypeScript Script: Get Pool Info
 * Based on IDL: GetPoolInfo (discriminant: 6)
 * Args: None
 */
async function getPoolInfo(poolPDA: PublicKey, poolName: string) {
  try {
    console.log(`\n🚀 Getting Pool Info for ${poolName}...`);
    console.log(`Pool PDA: ${poolPDA.toString()}`);

    // Create transaction
    const transaction = new Transaction();

    // Prepare accounts for GetPoolInfo
    const accounts = [
      { pubkey: poolPDA, isSigner: false, isWritable: false },
    ];

    // Instruction data (Borsh: GetPoolInfo - no args)
    const data = Buffer.alloc(1); // 1 byte discriminator only
    data.writeUInt8(6, 0); // GetPoolInfo discriminator
    
    console.log(`📝 Instruction data: ${data.toString('hex')}`);

    // Add GetPoolInfo instruction
    console.log(`📝 Adding GetPoolInfo instruction for ${poolName}...`);
    transaction.add({
      keys: accounts,
      programId: AMM_PROGRAM_ID,
      data,
    });

    // Send transaction
    console.log(`📝 Sending GetPoolInfo transaction for ${poolName}...`);
    const signature = await connection.sendTransaction(transaction, [userKeypair], {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    console.log(`✅ GetPoolInfo transaction sent for ${poolName}!`);
    console.log(`Transaction signature: ${signature}`);

    // Wait a bit for transaction to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get transaction logs to see the pool info
    try {
      const transactionDetails = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (transactionDetails && transactionDetails.meta && transactionDetails.meta.logMessages) {
        console.log(`\n📊 Pool Info for ${poolName}:`);
        transactionDetails.meta.logMessages.forEach(log => {
          if (log.includes("Pool Info:") || log.includes("Native SOL Pool Info:") || 
              log.includes("Token A:") || log.includes("Token B:") || 
              log.includes("Reserve A:") || log.includes("Reserve B:") ||
              log.includes("Total LP Supply:") || log.includes("Bump:") ||
              log.includes("Ratio") || log.includes("Pool Value")) {
            console.log(`  ${log}`);
          }
        });
      } else {
        console.log(`⚠️  Could not retrieve transaction logs for ${poolName}`);
      }
    } catch (logError) {
      console.log(`⚠️  Could not retrieve transaction logs for ${poolName}:`, (logError as Error).message);
    }

    return {
      poolName,
      poolPDA: poolPDA.toString(),
      transactionSignature: signature,
    };

  } catch (error) {
    console.error(`❌ Error getting pool info for ${poolName}:`, error);
    throw error;
  }
}

/**
 * Main function to get info for all pools
 */
async function getAllPoolInfo() {
  try {
    console.log("🚀 TypeScript Script: Getting Pool Info for All Pools...");
    
    // Load pool info from existing files
    const poolXYInfo = JSON.parse(fs.readFileSync('pool-xy-info.json', 'utf-8'));
    const poolYZInfo = JSON.parse(fs.readFileSync('pool-yz-info.json', 'utf-8'));
    const nativeSOLPoolInfo = JSON.parse(fs.readFileSync('native-sol-pool-info.json', 'utf-8'));
    
    const POOL_XY_PDA = new PublicKey(poolXYInfo.poolPDA);
    const POOL_YZ_PDA = new PublicKey(poolYZInfo.poolPDA);
    const NATIVE_SOL_POOL_PDA = new PublicKey(nativeSOLPoolInfo.poolPDA);
    
    console.log(`Found ${3} pools to query:`);
    console.log(`- X-Y Pool: ${POOL_XY_PDA.toString()}`);
    console.log(`- Y-Z Pool: ${POOL_YZ_PDA.toString()}`);
    console.log(`- Native SOL Pool: ${NATIVE_SOL_POOL_PDA.toString()}`);

    // Get info for each pool
    const results = [];
    
    // Get X-Y Pool Info
    const xyResult = await getPoolInfo(POOL_XY_PDA, "X-Y Pool");
    results.push(xyResult);
    
    // Wait between requests
    console.log("\n⏳ Waiting 3 seconds before next request...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get Y-Z Pool Info
    const yzResult = await getPoolInfo(POOL_YZ_PDA, "Y-Z Pool");
    results.push(yzResult);
    
    // Wait between requests
    console.log("\n⏳ Waiting 3 seconds before next request...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get Native SOL Pool Info
    const nativeSOLResult = await getPoolInfo(NATIVE_SOL_POOL_PDA, "Native SOL Pool");
    results.push(nativeSOLResult);

    // Save all pool info results
    const allPoolInfo = {
      timestamp: new Date().toISOString(),
      pools: results,
    };

    fs.writeFileSync("all-pool-info-results.json", JSON.stringify(allPoolInfo, null, 2));
    console.log("\n💾 All pool info results saved to all-pool-info-results.json");

    return allPoolInfo;

  } catch (error) {
    console.error("❌ Error getting all pool info:", error);
    throw error;
  }
}

// Run the function
getAllPoolInfo().catch(console.error);
