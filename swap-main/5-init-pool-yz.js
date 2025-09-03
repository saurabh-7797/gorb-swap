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
 * Step 5: Initialize Pool Y-Z
 * Function: initPoolYZ()
 * Purpose: Creates a new liquidity pool between Token Y and Token Z
 */
async function initPoolYZ() {
  try {
    console.log("🚀 Step 5: Initializing Pool Y-Z...");
    
    // Load Token Y and Z info from previous steps
    const tokenYInfo = JSON.parse(fs.readFileSync('token-y-info.json', 'utf-8'));
    const tokenZInfo = JSON.parse(fs.readFileSync('token-z-info.json', 'utf-8'));
    
    const TOKEN_Y_MINT = new PublicKey(tokenYInfo.mint);
    const TOKEN_Z_MINT = new PublicKey(tokenZInfo.mint);
    const LP_MINT = Keypair.generate();
    
    console.log(`Token Y: ${TOKEN_Y_MINT.toString()}`);
    console.log(`Token Z: ${TOKEN_Z_MINT.toString()}`);
    console.log(`LP Mint: ${LP_MINT.publicKey.toString()}`);

    // 1. Derive pool PDA
    const [poolPDA, poolBump] = await PublicKey.findProgramAddress(
      [Buffer.from("pool"), TOKEN_Y_MINT.toBuffer(), TOKEN_Z_MINT.toBuffer()],
      AMM_PROGRAM_ID
    );
    console.log(`Pool PDA: ${poolPDA.toString()}`);

    // 2. Create vault accounts as regular accounts (not PDAs)
    const vaultY = Keypair.generate();
    const vaultZ = Keypair.generate();
    console.log(`Vault Y: ${vaultY.publicKey.toString()}`);
    console.log(`Vault Z: ${vaultZ.publicKey.toString()}`);

    // 3. User ATAs
    const userTokenY = getAssociatedTokenAddressSync(TOKEN_Y_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userTokenZ = getAssociatedTokenAddressSync(TOKEN_Z_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userLP = getAssociatedTokenAddressSync(LP_MINT.publicKey, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    console.log(`User Token Y ATA: ${userTokenY.toString()}`);
    console.log(`User Token Z ATA: ${userTokenZ.toString()}`);
    console.log(`User LP ATA: ${userLP.toString()}`);

    // 4. Check balances before pool initialization
    console.log("\n📊 Balances BEFORE Pool Initialization:");
    const balanceTokenYBefore = await getTokenBalance(userTokenY);
    const balanceTokenZBefore = await getTokenBalance(userTokenZ);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYBefore)} (${balanceTokenYBefore} raw)`);
    console.log(`Token Z: ${formatTokenAmount(balanceTokenZBefore)} (${balanceTokenZBefore} raw)`);

    // 5. Pool initialization parameters
    const amountY = 1_000_000_000; // 1 token
    const amountZ = 1_000_000_000; // 1 token
    
    console.log(`\n🏊 Pool Initialization Parameters:`);
    console.log(`Initial Token Y: ${formatTokenAmount(amountY)} Token Y`);
    console.log(`Initial Token Z: ${formatTokenAmount(amountZ)} Token Z`);
    console.log(`Initial Ratio: 1:1`);
    console.log(`Expected LP Tokens: ${formatTokenAmount(Math.sqrt(amountY * amountZ))} LP tokens`);

    // 6. Prepare accounts for InitPool
    const accounts = [
      { pubkey: poolPDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_Z_MINT, isSigner: false, isWritable: false },
      { pubkey: vaultY.publicKey, isSigner: true, isWritable: true },
      { pubkey: vaultZ.publicKey, isSigner: true, isWritable: true },
      { pubkey: LP_MINT.publicKey, isSigner: false, isWritable: true },
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: userTokenY, isSigner: false, isWritable: true },
      { pubkey: userTokenZ, isSigner: false, isWritable: true },
      { pubkey: userLP, isSigner: false, isWritable: true },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];

    // 7. Instruction data (Borsh: InitPool { amount_a, amount_b })
    const data = Buffer.alloc(1 + 8 + 8); // 1 byte discriminator + 2x u64
    data.writeUInt8(0, 0); // InitPool discriminator
    data.writeBigUInt64LE(BigInt(amountY), 1);
    data.writeBigUInt64LE(BigInt(amountZ), 9);
    
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
    const sig = await sendAndConfirmTransaction(connection, tx, [userKeypair, vaultY, vaultZ, LP_MINT], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    
    console.log("✅ Pool Y-Z initialization successful!");
    console.log(`Transaction signature: ${sig}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${sig}`);
    
    // 9. Check balances after pool initialization
    console.log("\n📊 Balances AFTER Pool Initialization:");
    const balanceTokenYAfter = await getTokenBalance(userTokenY);
    const balanceTokenZAfter = await getTokenBalance(userTokenZ);
    const balanceLPAfter = await getTokenBalance(userLP);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYAfter)} (${balanceTokenYAfter} raw)`);
    console.log(`Token Z: ${formatTokenAmount(balanceTokenZAfter)} (${balanceTokenZAfter} raw)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPAfter)} (${balanceLPAfter} raw)`);

    // 10. Calculate actual changes
    const tokenYChange = balanceTokenYAfter - balanceTokenYBefore;
    const tokenZChange = balanceTokenZAfter - balanceTokenZBefore;
    
    console.log("\n🏊 Pool Y-Z Initialization Results:");
    console.log(`Token Y Change: ${formatTokenAmount(tokenYChange)} (${tokenYChange > 0 ? '+' : ''}${tokenYChange} raw)`);
    console.log(`Token Z Change: ${formatTokenAmount(tokenZChange)} (${tokenZChange > 0 ? '+' : ''}${tokenZChange} raw)`);
    console.log(`LP Tokens Received: ${formatTokenAmount(balanceLPAfter)} (${balanceLPAfter} raw)`);
    
    // Save Pool Y-Z info for next steps
    const poolInfo = {
      poolPDA: poolPDA.toString(),
      lpMint: LP_MINT.publicKey.toString(),
      vaultY: vaultY.publicKey.toString(),
      vaultZ: vaultZ.publicKey.toString(),
      tokenY: TOKEN_Y_MINT.toString(),
      tokenZ: TOKEN_Z_MINT.toString(),
      userLP: userLP.toString(),
      initialLiquidityY: -tokenYChange,
      initialLiquidityZ: -tokenZChange,
      lpTokensReceived: balanceLPAfter
    };
    
    fs.writeFileSync('pool-yz-info.json', JSON.stringify(poolInfo, null, 2));
    console.log("💾 Pool Y-Z info saved to pool-yz-info.json");
    
    console.log(`\n💰 Pool Y-Z Summary:`);
    console.log(`Pool Address: ${poolPDA.toString()}`);
    console.log(`LP Mint: ${LP_MINT.publicKey.toString()}`);
    console.log(`Vault Y: ${vaultY.publicKey.toString()}`);
    console.log(`Vault Z: ${vaultZ.publicKey.toString()}`);
    console.log(`Initial Liquidity: ${formatTokenAmount(-tokenYChange)} Token Y + ${formatTokenAmount(-tokenZChange)} Token Z`);
    
    return poolInfo;
    
  } catch (error) {
    console.error("❌ Error in Pool Y-Z Initialization:", error.message);
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
initPoolYZ().catch(console.error);
