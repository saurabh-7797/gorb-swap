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
 * Giant Liquidity Addition
 * Function: giantLiquidityAddition()
 * Purpose: Adds giant amounts of liquidity to both pools (20.0 tokens each)
 */
async function giantLiquidityAddition() {
  try {
    console.log("🚀 Giant Liquidity Addition: Adding 20.0 tokens to both pools...");
    
    // Load Pool X-Y info
    const poolXYInfo = JSON.parse(fs.readFileSync('pool-xy-info.json', 'utf-8'));
    
    const TOKEN_X_MINT = new PublicKey(poolXYInfo.tokenX);
    const TOKEN_Y_MINT = new PublicKey(poolXYInfo.tokenY);
    const LP_XY_MINT = new PublicKey(poolXYInfo.lpMint);
    const POOL_XY_PDA = new PublicKey(poolXYInfo.poolPDA);
    const VAULT_XY_X = new PublicKey(poolXYInfo.vaultX);
    const VAULT_XY_Y = new PublicKey(poolXYInfo.vaultY);
    
    console.log(`Token X: ${TOKEN_X_MINT.toString()}`);
    console.log(`Token Y: ${TOKEN_Y_MINT.toString()}`);
    console.log(`Pool X-Y: ${POOL_XY_PDA.toString()}`);

    // User ATAs
    const userTokenX = getAssociatedTokenAddressSync(TOKEN_X_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userTokenY = getAssociatedTokenAddressSync(TOKEN_Y_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userLPXY = getAssociatedTokenAddressSync(LP_XY_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    console.log(`User Token X ATA: ${userTokenX.toString()}`);
    console.log(`User Token Y ATA: ${userTokenY.toString()}`);
    console.log(`User LP X-Y ATA: ${userLPXY.toString()}`);

    // Check balances before giant liquidity addition
    console.log("\n📊 Balances BEFORE Giant Liquidity Addition:");
    const balanceTokenXBefore = await getTokenBalance(userTokenX);
    const balanceTokenYBefore = await getTokenBalance(userTokenY);
    const balanceLPXYBefore = await getTokenBalance(userLPXY);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXBefore)} (${balanceTokenXBefore} raw)`);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYBefore)} (${balanceTokenYBefore} raw)`);
    console.log(`LP X-Y Tokens: ${formatTokenAmount(balanceLPXYBefore)} (${balanceLPXYBefore} raw)`);

    // Giant liquidity parameters
    const amountX = 20_000_000_000; // 20.0 tokens
    const amountY = 20_000_000_000; // 20.0 tokens
    
    console.log(`\n💧 Giant Liquidity Parameters:`);
    console.log(`Amount X: ${formatTokenAmount(amountX)} Token X`);
    console.log(`Amount Y: ${formatTokenAmount(amountY)} Token Y`);
    console.log(`Ratio: 1:1`);

    // Prepare accounts for AddLiquidity
    const accounts = [
      { pubkey: POOL_XY_PDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_X_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false },
      { pubkey: VAULT_XY_X, isSigner: false, isWritable: true },
      { pubkey: VAULT_XY_Y, isSigner: false, isWritable: true },
      { pubkey: LP_XY_MINT, isSigner: false, isWritable: true },
      { pubkey: userTokenX, isSigner: false, isWritable: true },
      { pubkey: userTokenY, isSigner: false, isWritable: true },
      { pubkey: userLPXY, isSigner: false, isWritable: true },
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    // Instruction data (Borsh: AddLiquidity { amount_a, amount_b })
    const data = Buffer.alloc(1 + 8 + 8); // 1 byte discriminator + 2x u64
    data.writeUInt8(1, 0); // AddLiquidity discriminator
    data.writeBigUInt64LE(BigInt(amountX), 1);
    data.writeBigUInt64LE(BigInt(amountY), 9);
    
    console.log(`\n📝 Instruction data: ${data.toString('hex')}`);

    // Create transaction
    const tx = new Transaction();

    // Add AddLiquidity instruction
    console.log("📝 Adding Giant AddLiquidity instruction...");
    
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
    
    console.log("✅ Giant Liquidity Addition transaction successful!");
    console.log(`Transaction signature: ${sig}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${sig}`);
    
    // Check balances after giant liquidity addition
    console.log("\n📊 Balances AFTER Giant Liquidity Addition:");
    const balanceTokenXAfter = await getTokenBalance(userTokenX);
    const balanceTokenYAfter = await getTokenBalance(userTokenY);
    const balanceLPXYAfter = await getTokenBalance(userLPXY);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXAfter)} (${balanceTokenXAfter} raw)`);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYAfter)} (${balanceTokenYAfter} raw)`);
    console.log(`LP X-Y Tokens: ${formatTokenAmount(balanceLPXYAfter)} (${balanceLPXYAfter} raw)`);

    // Calculate actual changes
    const tokenXChange = balanceTokenXAfter - balanceTokenXBefore;
    const tokenYChange = balanceTokenYAfter - balanceTokenYBefore;
    const lpChange = balanceLPXYAfter - balanceLPXYBefore;
    
    console.log("\n💧 Giant Liquidity Addition Results:");
    console.log(`Token X Change: ${formatTokenAmount(tokenXChange)} (${tokenXChange > 0 ? '+' : ''}${tokenXChange} raw)`);
    console.log(`Token Y Change: ${formatTokenAmount(tokenYChange)} (${tokenYChange > 0 ? '+' : ''}${tokenYChange} raw)`);
    console.log(`LP Tokens Received: ${formatTokenAmount(lpChange)} (${lpChange} raw)`);
    
    console.log(`\n💰 Giant Liquidity Summary:`);
    console.log(`Liquidity Added:`);
    console.log(`  - Token X: ${formatTokenAmount(-tokenXChange)} (${-tokenXChange} raw)`);
    console.log(`  - Token Y: ${formatTokenAmount(-tokenYChange)} (${-tokenYChange} raw)`);
    console.log(`LP Tokens Received: ${formatTokenAmount(lpChange)} (${lpChange} raw)`);
    console.log(`Total Value Added: ${formatTokenAmount(-tokenXChange + -tokenYChange)} tokens`);
    
    // Update pool info with giant liquidity addition
    const updatedPoolInfo = {
      ...poolXYInfo,
      giantLiquidityX: -tokenXChange,
      giantLiquidityY: -tokenYChange,
      totalLPTokensAfterGiant: balanceLPXYAfter
    };
    
    fs.writeFileSync('pool-xy-info.json', JSON.stringify(updatedPoolInfo, null, 2));
    console.log("💾 Updated Pool X-Y info saved to pool-xy-info.json");
    
    // Save giant liquidity addition results
    const liquidityResults = {
      liquidityType: "Giant Liquidity Addition",
      amountX: amountX,
      amountY: amountY,
      tokenXAdded: -tokenXChange,
      tokenYAdded: -tokenYChange,
      lpTokensReceived: lpChange,
      totalValueAdded: -tokenXChange + -tokenYChange,
      transactionSignature: sig
    };
    
    fs.writeFileSync('giant-liquidity-addition-results.json', JSON.stringify(liquidityResults, null, 2));
    console.log("💾 Giant liquidity addition results saved to giant-liquidity-addition-results.json");
    
    return liquidityResults;
    
  } catch (error) {
    console.error("❌ Error in Giant Liquidity Addition:", error.message);
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
giantLiquidityAddition().catch(console.error);


