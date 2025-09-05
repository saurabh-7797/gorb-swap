const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} = require("@solana/web3.js");
const {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
} = require("@solana/spl-token");
const fs = require("fs");

// --- CONFIG ---
const RPC_ENDPOINT = "https://rpc.gorbchain.xyz";
const WS_ENDPOINT = "wss://rpc.gorbchain.xyz/ws/";
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

/**
 * Step 20: Create Token Q
 * Function: createTokenQ()
 * Purpose: Creates a new SPL token called Token Q with large mint amount
 */
async function createTokenQ() {
  try {
    console.log("🚀 Step 20: Creating Token Q...");
    
    // Generate Token Q mint keypair
    const tokenQKeypair = Keypair.generate();
    console.log(`Token Q Mint: ${tokenQKeypair.publicKey.toString()}`);
    
    // User's Token Q ATA
    const userTokenQ = getAssociatedTokenAddressSync(
      tokenQKeypair.publicKey, 
      userKeypair.publicKey, 
      false, 
      SPL_TOKEN_PROGRAM_ID, 
      ATA_PROGRAM_ID
    );
    console.log(`User Token Q ATA: ${userTokenQ.toString()}`);
    
    // Create transaction
    const tx = new Transaction();
    
    // Create Token Q mint account
    console.log("📝 Creating Token Q mint account...");
    const mintLamports = await getMinimumBalanceForRentExemptMint(connection);
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: userKeypair.publicKey,
        newAccountPubkey: tokenQKeypair.publicKey,
        lamports: mintLamports,
        space: MINT_SIZE,
        programId: SPL_TOKEN_PROGRAM_ID,
      })
    );
    
    // Initialize Token Q mint
    console.log("📝 Initializing Token Q mint...");
    tx.add(
      createInitializeMintInstruction(
        tokenQKeypair.publicKey,
        9, // decimals
        userKeypair.publicKey, // mint authority
        null, // freeze authority
        SPL_TOKEN_PROGRAM_ID
      )
    );
    
    // Create user's Token Q ATA
    console.log("📝 Creating user Token Q ATA...");
    tx.add(
      createAssociatedTokenAccountInstruction(
        userKeypair.publicKey,
        userTokenQ,
        userKeypair.publicKey,
        tokenQKeypair.publicKey,
        SPL_TOKEN_PROGRAM_ID,
        ATA_PROGRAM_ID
      )
    );
    
    // Mint large amount of tokens to user
    console.log("📝 Minting large amount of Token Q to user...");
    const mintAmount = 15_000_000_000_000_000; // 15 million tokens (large amount)
    tx.add(
      createMintToInstruction(
        tokenQKeypair.publicKey,
        userTokenQ,
        userKeypair.publicKey,
        mintAmount,
        [],
        SPL_TOKEN_PROGRAM_ID
      )
    );
    
    // Send transaction
    console.log("📤 Sending transaction...");
    const sig = await sendAndConfirmTransaction(connection, tx, [
      userKeypair,
      tokenQKeypair,
    ], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    
    console.log("✅ Token Q created successfully!");
    console.log(`Transaction signature: ${sig}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${sig}`);
    console.log(`\n📋 Token Q Information:`);
    console.log(`Mint Address: ${tokenQKeypair.publicKey.toString()}`);
    console.log(`User ATA: ${userTokenQ.toString()}`);
    console.log(`Initial Supply: ${(mintAmount / 1e9).toFixed(0)} tokens`);
    
    // Save Token Q info for next steps
    const tokenInfo = {
      mint: tokenQKeypair.publicKey.toString(),
      userATA: userTokenQ.toString(),
      supply: mintAmount,
      decimals: 9
    };
    
    fs.writeFileSync('token-q-info.json', JSON.stringify(tokenInfo, null, 2));
    console.log("💾 Token Q info saved to token-q-info.json");
    
    return tokenInfo;
    
  } catch (error) {
    console.error("❌ Error creating Token Q:", error.message);
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
createTokenQ().catch(console.error);
