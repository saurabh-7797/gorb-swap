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
 * Step 21: Create Token R
 * Function: createTokenR()
 * Purpose: Creates a new SPL token called Token R with large mint amount
 */
async function createTokenR() {
  try {
    console.log("🚀 Step 21: Creating Token R...");
    
    // Generate Token R mint keypair
    const tokenRKeypair = Keypair.generate();
    console.log(`Token R Mint: ${tokenRKeypair.publicKey.toString()}`);
    
    // User's Token R ATA
    const userTokenR = getAssociatedTokenAddressSync(
      tokenRKeypair.publicKey, 
      userKeypair.publicKey, 
      false, 
      SPL_TOKEN_PROGRAM_ID, 
      ATA_PROGRAM_ID
    );
    console.log(`User Token R ATA: ${userTokenR.toString()}`);
    
    // Create transaction
    const tx = new Transaction();
    
    // Create Token R mint account
    console.log("📝 Creating Token R mint account...");
    const mintLamports = await getMinimumBalanceForRentExemptMint(connection);
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: userKeypair.publicKey,
        newAccountPubkey: tokenRKeypair.publicKey,
        lamports: mintLamports,
        space: MINT_SIZE,
        programId: SPL_TOKEN_PROGRAM_ID,
      })
    );
    
    // Initialize Token R mint
    console.log("📝 Initializing Token R mint...");
    tx.add(
      createInitializeMintInstruction(
        tokenRKeypair.publicKey,
        9, // decimals
        userKeypair.publicKey, // mint authority
        null, // freeze authority
        SPL_TOKEN_PROGRAM_ID
      )
    );
    
    // Create user's Token R ATA
    console.log("📝 Creating user Token R ATA...");
    tx.add(
      createAssociatedTokenAccountInstruction(
        userKeypair.publicKey,
        userTokenR,
        userKeypair.publicKey,
        tokenRKeypair.publicKey,
        SPL_TOKEN_PROGRAM_ID,
        ATA_PROGRAM_ID
      )
    );
    
    // Mint large amount of tokens to user
    console.log("📝 Minting large amount of Token R to user...");
    const mintAmount = 20_000_000_000_000_000; // 20 million tokens (large amount)
    tx.add(
      createMintToInstruction(
        tokenRKeypair.publicKey,
        userTokenR,
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
      tokenRKeypair,
    ], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    
    console.log("✅ Token R created successfully!");
    console.log(`Transaction signature: ${sig}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${sig}`);
    console.log(`\n📋 Token R Information:`);
    console.log(`Mint Address: ${tokenRKeypair.publicKey.toString()}`);
    console.log(`User ATA: ${userTokenR.toString()}`);
    console.log(`Initial Supply: ${(mintAmount / 1e9).toFixed(0)} tokens`);
    
    // Save Token R info for next steps
    const tokenInfo = {
      mint: tokenRKeypair.publicKey.toString(),
      userATA: userTokenR.toString(),
      supply: mintAmount,
      decimals: 9
    };
    
    fs.writeFileSync('token-r-info.json', JSON.stringify(tokenInfo, null, 2));
    console.log("💾 Token R info saved to token-r-info.json");
    
    return tokenInfo;
    
  } catch (error) {
    console.error("❌ Error creating Token R:", error.message);
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
createTokenR().catch(console.error);
