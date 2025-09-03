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
 * Step 7: Add Liquidity to Pool Y-Z
 * Function: addLiquidityYZ()
 * Purpose: Adds additional liquidity to the existing Pool Y-Z
 */
async function addLiquidityYZ() {
  try {
    console.log("🚀 Step 7: Adding Liquidity to Pool Y-Z...");
    
    // Load Pool Y-Z info from previous step
    const poolInfo = JSON.parse(fs.readFileSync('pool-yz-info.json', 'utf-8'));
    
    const TOKEN_Y_MINT = new PublicKey(poolInfo.tokenY);
    const TOKEN_Z_MINT = new PublicKey(poolInfo.tokenZ);
    const LP_MINT = new PublicKey(poolInfo.lpMint);
    const POOL_PDA = new PublicKey(poolInfo.poolPDA);
    const VAULT_Y = new PublicKey(poolInfo.vaultY);
    const VAULT_Z = new PublicKey(poolInfo.vaultZ);
    
    console.log(`Token Y: ${TOKEN_Y_MINT.toString()}`);
    console.log(`Token Z: ${TOKEN_Z_MINT.toString()}`);
    console.log(`LP Mint: ${LP_MINT.toString()}`);
    console.log(`Pool PDA: ${POOL_PDA.toString()}`);
    console.log(`Vault Y: ${VAULT_Y.toString()}`);
    console.log(`Vault Z: ${VAULT_Z.toString()}`);

    // User ATAs
    const userTokenY = getAssociatedTokenAddressSync(TOKEN_Y_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userTokenZ = getAssociatedTokenAddressSync(TOKEN_Z_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userLP = getAssociatedTokenAddressSync(LP_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    console.log(`User Token Y ATA: ${userTokenY.toString()}`);
    console.log(`User Token Z ATA: ${userTokenZ.toString()}`);
    console.log(`User LP ATA: ${userLP.toString()}`);

    // Check balances before adding liquidity
    console.log("\n📊 Balances BEFORE Adding Liquidity:");
    const balanceTokenYBefore = await getTokenBalance(userTokenY);
    const balanceTokenZBefore = await getTokenBalance(userTokenZ);
    const balanceLPBefore = await getTokenBalance(userLP);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYBefore)} (${balanceTokenYBefore} raw)`);
    console.log(`Token Z: ${formatTokenAmount(balanceTokenZBefore)} (${balanceTokenZBefore} raw)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPBefore)} (${balanceLPBefore} raw)`);

    // Liquidity parameters
    const amountY = 500_000_000; // 0.5 tokens
    const amountZ = 500_000_000; // 0.5 tokens
    
    console.log(`\n💧 Liquidity Parameters:`);
    console.log(`Amount Y: ${formatTokenAmount(amountY)} Token Y`);
    console.log(`Amount Z: ${formatTokenAmount(amountZ)} Token Z`);
    console.log(`Ratio: 1:1`);

    // Prepare accounts for AddLiquidity
    const accounts = [
      { pubkey: POOL_PDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_Z_MINT, isSigner: false, isWritable: false },
      { pubkey: VAULT_Y, isSigner: false, isWritable: true },
      { pubkey: VAULT_Z, isSigner: false, isWritable: true },
      { pubkey: LP_MINT, isSigner: false, isWritable: true },
      { pubkey: userTokenY, isSigner: false, isWritable: true },
      { pubkey: userTokenZ, isSigner: false, isWritable: true },
      { pubkey: userLP, isSigner: false, isWritable: true },
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    // Instruction data (Borsh: AddLiquidity { amount_a, amount_b })
    const data = Buffer.alloc(1 + 8 + 8); // 1 byte discriminator + 2x u64
    data.writeUInt8(1, 0); // AddLiquidity discriminator
    data.writeBigUInt64LE(BigInt(amountY), 1);
    data.writeBigUInt64LE(BigInt(amountZ), 9);
    
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
    
    console.log("✅ AddLiquidity transaction successful!");
    console.log(`Transaction signature: ${sig}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${sig}`);
    
    // Check balances after adding liquidity
    console.log("\n📊 Balances AFTER Adding Liquidity:");
    const balanceTokenYAfter = await getTokenBalance(userTokenY);
    const balanceTokenZAfter = await getTokenBalance(userTokenZ);
    const balanceLPAfter = await getTokenBalance(userLP);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYAfter)} (${balanceTokenYAfter} raw)`);
    console.log(`Token Z: ${formatTokenAmount(balanceTokenZAfter)} (${balanceTokenZAfter} raw)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPAfter)} (${balanceLPAfter} raw)`);

    // Calculate actual changes
    const tokenYChange = balanceTokenYAfter - balanceTokenYBefore;
    const tokenZChange = balanceTokenZAfter - balanceTokenZBefore;
    const lpChange = balanceLPAfter - balanceLPBefore;
    
    console.log("\n💧 AddLiquidity Results:");
    console.log(`Token Y Change: ${formatTokenAmount(tokenYChange)} (${tokenYChange > 0 ? '+' : ''}${tokenYChange} raw)`);
    console.log(`Token Z Change: ${formatTokenAmount(tokenZChange)} (${tokenZChange > 0 ? '+' : ''}${tokenZChange} raw)`);
    console.log(`LP Tokens Received: ${formatTokenAmount(lpChange)} (${lpChange} raw)`);
    
    console.log(`\n💰 Liquidity Summary:`);
    console.log(`Liquidity Added:`);
    console.log(`  - Token Y: ${formatTokenAmount(-tokenYChange)} (${-tokenYChange} raw)`);
    console.log(`  - Token Z: ${formatTokenAmount(-tokenZChange)} (${-tokenZChange} raw)`);
    console.log(`LP Tokens Received: ${formatTokenAmount(lpChange)} (${lpChange} raw)`);
    console.log(`Total Value Added: ${formatTokenAmount(-tokenYChange + -tokenZChange)} tokens`);
    
    // Update pool info with new liquidity
    const updatedPoolInfo = {
      ...poolInfo,
      additionalLiquidityY: -tokenYChange,
      additionalLiquidityZ: -tokenZChange,
      totalLPTokens: balanceLPAfter
    };
    
    fs.writeFileSync('pool-yz-info.json', JSON.stringify(updatedPoolInfo, null, 2));
    console.log("💾 Updated Pool Y-Z info saved to pool-yz-info.json");
    
    return updatedPoolInfo;
    
  } catch (error) {
    console.error("❌ Error in AddLiquidity:", error.message);
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
addLiquidityYZ().catch(console.error);
