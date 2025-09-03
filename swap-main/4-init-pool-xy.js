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
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
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

// Helper function to get token balance
async function getTokenBalance(tokenAccount) {
  try {
    const account = await getAccount(connection, tokenAccount, "confirmed", SPL_TOKEN_PROGRAM_ID);
    return Number(account.amount);
  } catch (error) {
    return 0;
  }
}

// Helper function to format token amounts
function formatTokenAmount(amount, decimals = 9) {
  return (amount / Math.pow(10, decimals)).toFixed(6);
}

/**
 * Step 4: Initialize Pool X-Y
 * Function: initPoolXY()
 * Purpose: Creates a new liquidity pool between Token X and Token Y
 */
async function initPoolXY() {
  try {
    console.log("🚀 Step 4: Initializing Pool X-Y...");
    
    // Load Token X and Y info from previous steps
    const tokenXInfo = JSON.parse(fs.readFileSync('token-x-info.json', 'utf-8'));
    const tokenYInfo = JSON.parse(fs.readFileSync('token-y-info.json', 'utf-8'));
    
    const TOKEN_X_MINT = new PublicKey(tokenXInfo.mint);
    const TOKEN_Y_MINT = new PublicKey(tokenYInfo.mint);
    const LP_MINT = Keypair.generate();
    
    console.log(`Token X: ${TOKEN_X_MINT.toString()}`);
    console.log(`Token Y: ${TOKEN_Y_MINT.toString()}`);
    console.log(`LP Mint: ${LP_MINT.publicKey.toString()}`);

    // 1. Derive pool PDA
    const [poolPDA, poolBump] = await PublicKey.findProgramAddress(
      [Buffer.from("pool"), TOKEN_X_MINT.toBuffer(), TOKEN_Y_MINT.toBuffer()],
      AMM_PROGRAM_ID
    );
    console.log(`Pool PDA: ${poolPDA.toString()}`);

    // 2. Create vault accounts as regular accounts (not PDAs)
    const vaultX = Keypair.generate();
    const vaultY = Keypair.generate();
    console.log(`Vault X: ${vaultX.publicKey.toString()}`);
    console.log(`Vault Y: ${vaultY.publicKey.toString()}`);

    // 3. User ATAs
    const userTokenX = getAssociatedTokenAddressSync(TOKEN_X_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userTokenY = getAssociatedTokenAddressSync(TOKEN_Y_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userLP = getAssociatedTokenAddressSync(LP_MINT.publicKey, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    console.log(`User Token X ATA: ${userTokenX.toString()}`);
    console.log(`User Token Y ATA: ${userTokenY.toString()}`);
    console.log(`User LP ATA: ${userLP.toString()}`);

    // 4. Check balances before pool initialization
    console.log("\n📊 Balances BEFORE Pool Initialization:");
    const balanceTokenXBefore = await getTokenBalance(userTokenX);
    const balanceTokenYBefore = await getTokenBalance(userTokenY);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXBefore)} (${balanceTokenXBefore} raw)`);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYBefore)} (${balanceTokenYBefore} raw)`);

    // 5. Pool initialization parameters
    const amountX = 1_000_000_000; // 1 token
    const amountY = 1_000_000_000; // 1 token
    
    console.log(`\n🏊 Pool Initialization Parameters:`);
    console.log(`Initial Token X: ${formatTokenAmount(amountX)} Token X`);
    console.log(`Initial Token Y: ${formatTokenAmount(amountY)} Token Y`);
    console.log(`Initial Ratio: 1:1`);
    console.log(`Expected LP Tokens: ${formatTokenAmount(Math.sqrt(amountX * amountY))} LP tokens`);

    // 6. Prepare accounts for InitPool
    const accounts = [
      { pubkey: poolPDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_X_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false },
      { pubkey: vaultX.publicKey, isSigner: true, isWritable: true },
      { pubkey: vaultY.publicKey, isSigner: true, isWritable: true },
      { pubkey: LP_MINT.publicKey, isSigner: false, isWritable: true },
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: userTokenX, isSigner: false, isWritable: true },
      { pubkey: userTokenY, isSigner: false, isWritable: true },
      { pubkey: userLP, isSigner: false, isWritable: true },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];

    // 7. Instruction data (Borsh: InitPool { amount_a, amount_b })
    const data = Buffer.alloc(1 + 8 + 8); // 1 byte discriminator + 2x u64
    data.writeUInt8(0, 0); // InitPool discriminator
    data.writeBigUInt64LE(BigInt(amountX), 1);
    data.writeBigUInt64LE(BigInt(amountY), 9);
    
    console.log(`\n📝 Instruction data: ${data.toString('hex')}`);

    // 8. Create transaction
    const tx = new Transaction();

    // Create LP mint account
    console.log("📝 Creating LP mint account...");
    tx.add(SystemProgram.createAccount({
      fromPubkey: userKeypair.publicKey,
      newAccountPubkey: LP_MINT.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(82),
      space: 82,
      programId: SPL_TOKEN_PROGRAM_ID,
    }));

    // Initialize LP mint
    console.log("📝 Initializing LP mint...");
    tx.add(
      createInitializeMintInstruction(
        LP_MINT.publicKey,
        9, // decimals
        poolPDA, // mint authority (pool PDA)
        poolPDA, // freeze authority (pool PDA)
        SPL_TOKEN_PROGRAM_ID
      )
    );

    // Create user LP ATA if needed
    const userLPAccount = await connection.getAccountInfo(userLP);
    if (!userLPAccount) {
      console.log("📝 Creating user LP ATA...");
      tx.add(createAssociatedTokenAccountInstruction(
        userKeypair.publicKey,
        userLP,
        userKeypair.publicKey,
        LP_MINT.publicKey,
        SPL_TOKEN_PROGRAM_ID,
        ATA_PROGRAM_ID
      ));
    } else {
      console.log("✅ User LP ATA already exists");
    }

    // Add InitPool instruction
    console.log("📝 Adding InitPool instruction...");
    
    tx.add({
      keys: accounts,
      programId: AMM_PROGRAM_ID,
      data,
    });

    // Send transaction
    console.log("📤 Sending transaction...");
    const sig = await sendAndConfirmTransaction(connection, tx, [userKeypair, vaultX, vaultY, LP_MINT], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    
    console.log("✅ Pool X-Y initialization successful!");
    console.log(`Transaction signature: ${sig}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${sig}`);
    
    // 9. Check balances after pool initialization
    console.log("\n📊 Balances AFTER Pool Initialization:");
    const balanceTokenXAfter = await getTokenBalance(userTokenX);
    const balanceTokenYAfter = await getTokenBalance(userTokenY);
    const balanceLPAfter = await getTokenBalance(userLP);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXAfter)} (${balanceTokenXAfter} raw)`);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYAfter)} (${balanceTokenYAfter} raw)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPAfter)} (${balanceLPAfter} raw)`);

    // 10. Calculate actual changes
    const tokenXChange = balanceTokenXAfter - balanceTokenXBefore;
    const tokenYChange = balanceTokenYAfter - balanceTokenYBefore;
    
    console.log("\n🏊 Pool X-Y Initialization Results:");
    console.log(`Token X Change: ${formatTokenAmount(tokenXChange)} (${tokenXChange > 0 ? '+' : ''}${tokenXChange} raw)`);
    console.log(`Token Y Change: ${formatTokenAmount(tokenYChange)} (${tokenYChange > 0 ? '+' : ''}${tokenYChange} raw)`);
    console.log(`LP Tokens Received: ${formatTokenAmount(balanceLPAfter)} (${balanceLPAfter} raw)`);
    
    // Save Pool X-Y info for next steps
    const poolInfo = {
      poolPDA: poolPDA.toString(),
      lpMint: LP_MINT.publicKey.toString(),
      vaultX: vaultX.publicKey.toString(),
      vaultY: vaultY.publicKey.toString(),
      tokenX: TOKEN_X_MINT.toString(),
      tokenY: TOKEN_Y_MINT.toString(),
      userLP: userLP.toString(),
      initialLiquidityX: -tokenXChange,
      initialLiquidityY: -tokenYChange,
      lpTokensReceived: balanceLPAfter
    };
    
    fs.writeFileSync('pool-xy-info.json', JSON.stringify(poolInfo, null, 2));
    console.log("💾 Pool X-Y info saved to pool-xy-info.json");
    
    console.log(`\n💰 Pool X-Y Summary:`);
    console.log(`Pool Address: ${poolPDA.toString()}`);
    console.log(`LP Mint: ${LP_MINT.publicKey.toString()}`);
    console.log(`Vault X: ${vaultX.publicKey.toString()}`);
    console.log(`Vault Y: ${vaultY.publicKey.toString()}`);
    console.log(`Initial Liquidity: ${formatTokenAmount(-tokenXChange)} Token X + ${formatTokenAmount(-tokenYChange)} Token Y`);
    
    return poolInfo;
    
  } catch (error) {
    console.error("❌ Error in Pool X-Y Initialization:", error.message);
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
initPoolXY().catch(console.error);
