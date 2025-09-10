import {
  Connection,
  PublicKey,
  AccountInfo,
} from "@solana/web3.js";
import * as fs from "fs";

// --- CONFIG ---
const RPC_ENDPOINT = "https://rpc.gorbchain.xyz";
const WS_ENDPOINT = "wss://rpc.gorbchain.xyz/ws/";
const AMM_PROGRAM_ID = new PublicKey("aBfrRgukSYDMgdyQ8y1XNEk4w5u7Ugtz5fPHFnkStJX");

const connection = new Connection(RPC_ENDPOINT, {
  commitment: "confirmed",
  wsEndpoint: WS_ENDPOINT,
});

/**
 * Direct Pool Info Query (No Transaction Required)
 * This reads pool data directly from the blockchain without creating transactions
 */
async function getPoolInfoDirect(poolPDA: PublicKey, poolName: string) {
  try {
    console.log(`\n🔍 Direct Pool Query: ${poolName}...`);
    console.log(`Pool PDA: ${poolPDA.toString()}`);

    // Get account info directly (no transaction needed)
    const accountInfo = await connection.getAccountInfo(poolPDA);
    
    if (!accountInfo) {
      console.log(`❌ Pool account not found: ${poolName}`);
      return null;
    }

    console.log(`✅ Pool account found!`);
    console.log(`Account Data Length: ${accountInfo.data.length} bytes`);
    console.log(`Account Owner: ${accountInfo.owner.toString()}`);
    console.log(`Account Lamports: ${accountInfo.lamports}`);
    console.log(`Account Executable: ${accountInfo.executable}`);
    console.log(`Account Rent Epoch: ${accountInfo.rentEpoch}`);

    // Parse the pool data (this would need to match your Rust struct)
    // For now, let's just show the raw data
    const data = accountInfo.data;
    console.log(`\n📊 Raw Pool Data (first 64 bytes):`);
    console.log(`Hex: ${data.slice(0, 64).toString('hex')}`);
    
    // Try to parse as Pool struct (simplified)
    if (data.length >= 32) {
      // This is a simplified parser - you'd need to implement proper Borsh deserialization
      const tokenA = new PublicKey(data.slice(0, 32));
      const tokenB = new PublicKey(data.slice(32, 64));
      
      console.log(`\n🔍 Parsed Pool Data:`);
      console.log(`Token A: ${tokenA.toString()}`);
      console.log(`Token B: ${tokenB.toString()}`);
      
      if (data.length >= 96) {
        const reserveA = data.readBigUInt64LE(64);
        const reserveB = data.readBigUInt64LE(72);
        
        console.log(`Reserve A: ${reserveA.toString()}`);
        console.log(`Reserve B: ${reserveB.toString()}`);
        
        if (reserveB > 0) {
          const ratio = Number(reserveA) / Number(reserveB);
          console.log(`Ratio A/B: ${ratio.toFixed(6)}`);
        }
      }
    }

    return {
      poolName,
      poolPDA: poolPDA.toString(),
      accountInfo: {
        dataLength: accountInfo.data.length,
        owner: accountInfo.owner.toString(),
        lamports: accountInfo.lamports,
        executable: accountInfo.executable,
        rentEpoch: accountInfo.rentEpoch,
      },
      rawData: data.slice(0, 64).toString('hex'),
    };

  } catch (error) {
    console.error(`❌ Error querying pool ${poolName}:`, error);
    return null;
  }
}

/**
 * Main function to query all pools directly
 */
async function getAllPoolInfoDirect() {
  try {
    console.log("🚀 Direct Pool Queries (No Transactions Required)...");
    
    // Load pool info from existing files
    const poolXYInfo = JSON.parse(fs.readFileSync('pool-xy-info.json', 'utf-8'));
    const poolYZInfo = JSON.parse(fs.readFileSync('pool-yz-info.json', 'utf-8'));
    
    const POOL_XY_PDA = new PublicKey(poolXYInfo.poolPDA);
    const POOL_YZ_PDA = new PublicKey(poolYZInfo.poolPDA);
    
    console.log(`Querying pools directly from blockchain...`);

    // Query available pools in parallel (no transactions needed!)
    const results = await Promise.all([
      getPoolInfoDirect(POOL_XY_PDA, "X-Y Pool"),
      getPoolInfoDirect(POOL_YZ_PDA, "Y-Z Pool"),
    ]);

    // Filter out null results
    const validResults = results.filter(result => result !== null);

    // Save results
    const allResults = {
      timestamp: new Date().toISOString(),
      queryType: "Direct Account Query (No Transaction)",
      pools: validResults,
    };

    fs.writeFileSync("get-pool-info-direct-results.json", JSON.stringify(allResults, null, 2));
    console.log("\n💾 Direct pool query results saved to get-pool-info-direct-results.json");

    return allResults;

  } catch (error) {
    console.error("❌ Error querying pools directly:", error);
    throw error;
  }
}

// Run the function
getAllPoolInfoDirect().catch(console.error);
