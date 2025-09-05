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
 * Step 22: Initialize Pool P-Q
 * Function: initPoolPQ()
 * Purpose: Creates a new liquidity pool between Token P and Token Q with different ratio
 */
async function initPoolPQ() {
  try {
    console.log("🚀 Step 22: Initializing Pool P-Q...");
    
    // Load Token P and Q info from previous steps
    const tokenPInfo = JSON.parse(fs.readFileSync('token-p-info.json', 'utf-8'));
    const tokenQInfo = JSON.parse(fs.readFileSync('token-q-info.json', 'utf-8'));
    
    const TOKEN_P_MINT = new PublicKey(tokenPInfo.mint);
    const TOKEN_Q_MINT = new PublicKey(tokenQInfo.mint);
    const LP_MINT = Keypair.generate();
    
    console.log(`Token P: ${TOKEN_P_MINT.toString()}`);
    console.log(`Token Q: ${TOKEN_Q_MINT.toString()}`);
    console.log(`LP Mint: ${LP_MINT.publicKey.toString()}`);

    // 1. Derive pool PDA
    const [poolPDA, poolBump] = await PublicKey.findProgramAddress(
      [Buffer.from("pool"), TOKEN_P_MINT.toBuffer(), TOKEN_Q_MINT.toBuffer()],
      AMM_PROGRAM_ID
    );
    console.log(`Pool PDA: ${poolPDA.toString()}`);

    // 2. Create vault accounts as regular accounts (not PDAs)
    const vaultP = Keypair.generate();
    const vaultQ = Keypair.generate();
    console.log(`Vault P: ${vaultP.publicKey.toString()}`);
    console.log(`Vault Q: ${vaultQ.publicKey.toString()}`);

    // 3. User ATAs
    const userTokenP = getAssociatedTokenAddressSync(TOKEN_P_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userTokenQ = getAssociatedTokenAddressSync(TOKEN_Q_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userLP = getAssociatedTokenAddressSync(LP_MINT.publicKey, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    console.log(`User Token P ATA: ${userTokenP.toString()}`);
    console.log(`User Token Q ATA: ${userTokenQ.toString()}`);
    console.log(`User LP ATA: ${userLP.toString()}`);

    // 4. Check balances before pool initialization
    console.log("\n📊 Balances BEFORE Pool Initialization:");
    const balanceTokenPBefore = await getTokenBalance(userTokenP);
    const balanceTokenQBefore = await getTokenBalance(userTokenQ);
    console.log(`Token P: ${formatTokenAmount(balanceTokenPBefore)} (${balanceTokenPBefore} raw)`);
    console.log(`Token Q: ${formatTokenAmount(balanceTokenQBefore)} (${balanceTokenQBefore} raw)`);

    // 5. Pool initialization parameters with different ratio (2:3)
    const amountP = 2_000_000_000; // 2 tokens
    const amountQ = 3_000_000_000; // 3 tokens
    
    console.log(`\n🏊 Pool Initialization Parameters:`);
    console.log(`Initial Token P: ${formatTokenAmount(amountP)} Token P`);
    console.log(`Initial Token Q: ${formatTokenAmount(amountQ)} Token Q`);
    console.log(`Initial Ratio: 2:3 (P:Q)`);
    console.log(`Expected LP Tokens: ${formatTokenAmount(Math.sqrt(amountP * amountQ))} LP tokens`);

    // 6. Prepare accounts for InitPool
    const accounts = [
      { pubkey: poolPDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_P_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_Q_MINT, isSigner: false, isWritable: false },
      { pubkey: vaultP.publicKey, isSigner: true, isWritable: true },
      { pubkey: vaultQ.publicKey, isSigner: true, isWritable: true },
      { pubkey: LP_MINT.publicKey, isSigner: false, isWritable: true },
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: userTokenP, isSigner: false, isWritable: true },
      { pubkey: userTokenQ, isSigner: false, isWritable: true },
      { pubkey: userLP, isSigner: false, isWritable: true },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];

    // 7. Instruction data (Borsh: InitPool { amount_a, amount_b })
    const data = Buffer.alloc(1 + 8 + 8); // 1 byte discriminator + 2x u64
    data.writeUInt8(0, 0); // InitPool discriminator
    data.writeBigUInt64LE(BigInt(amountP), 1);
    data.writeBigUInt64LE(BigInt(amountQ), 9);
    
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
    const sig = await sendAndConfirmTransaction(connection, tx, [userKeypair, vaultP, vaultQ, LP_MINT], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    
    console.log("✅ Pool P-Q initialization successful!");
    console.log(`Transaction signature: ${sig}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${sig}`);
    
    // 9. Check balances after pool initialization
    console.log("\n📊 Balances AFTER Pool Initialization:");
    const balanceTokenPAfter = await getTokenBalance(userTokenP);
    const balanceTokenQAfter = await getTokenBalance(userTokenQ);
    const balanceLPAfter = await getTokenBalance(userLP);
    console.log(`Token P: ${formatTokenAmount(balanceTokenPAfter)} (${balanceTokenPAfter} raw)`);
    console.log(`Token Q: ${formatTokenAmount(balanceTokenQAfter)} (${balanceTokenQAfter} raw)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPAfter)} (${balanceLPAfter} raw)`);

    // 10. Calculate actual changes
    const tokenPChange = balanceTokenPAfter - balanceTokenPBefore;
    const tokenQChange = balanceTokenQAfter - balanceTokenQBefore;
    
    console.log("\n🏊 Pool P-Q Initialization Results:");
    console.log(`Token P Change: ${formatTokenAmount(tokenPChange)} (${tokenPChange > 0 ? '+' : ''}${tokenPChange} raw)`);
    console.log(`Token Q Change: ${formatTokenAmount(tokenQChange)} (${tokenQChange > 0 ? '+' : ''}${tokenQChange} raw)`);
    console.log(`LP Tokens Received: ${formatTokenAmount(balanceLPAfter)} (${balanceLPAfter} raw)`);
    
    // Save Pool P-Q info for next steps
    const poolInfo = {
      poolPDA: poolPDA.toString(),
      lpMint: LP_MINT.publicKey.toString(),
      vaultP: vaultP.publicKey.toString(),
      vaultQ: vaultQ.publicKey.toString(),
      tokenP: TOKEN_P_MINT.toString(),
      tokenQ: TOKEN_Q_MINT.toString(),
      userLP: userLP.toString(),
      initialLiquidityP: -tokenPChange,
      initialLiquidityQ: -tokenQChange,
      lpTokensReceived: balanceLPAfter,
      ratio: "2:3"
    };
    
    fs.writeFileSync('pool-pq-info.json', JSON.stringify(poolInfo, null, 2));
    console.log("💾 Pool P-Q info saved to pool-pq-info.json");
    
    console.log(`\n💰 Pool P-Q Summary:`);
    console.log(`Pool Address: ${poolPDA.toString()}`);
    console.log(`LP Mint: ${LP_MINT.publicKey.toString()}`);
    console.log(`Vault P: ${vaultP.publicKey.toString()}`);
    console.log(`Vault Q: ${vaultQ.publicKey.toString()}`);
    console.log(`Initial Liquidity: ${formatTokenAmount(-tokenPChange)} Token P + ${formatTokenAmount(-tokenQChange)} Token Q`);
    console.log(`Ratio: 2:3 (P:Q)`);
    
    return poolInfo;
    
  } catch (error) {
    console.error("❌ Error in Pool P-Q Initialization:", error.message);
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
initPoolPQ().catch(console.error);
