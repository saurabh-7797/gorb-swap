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
 * Step 3: Create Token Z
 * Function: createTokenZ()
 * Purpose: Creates a new SPL token called Token Z
 */
async function createTokenZ() {
  try {
    console.log("🚀 Step 3: Creating Token Z...");
    
    // Generate Token Z mint keypair
    const tokenZKeypair = Keypair.generate();
    console.log(`Token Z Mint: ${tokenZKeypair.publicKey.toString()}`);
    
    // User's Token Z ATA
    const userTokenZ = getAssociatedTokenAddressSync(
      tokenZKeypair.publicKey, 
      userKeypair.publicKey, 
      false, 
      SPL_TOKEN_PROGRAM_ID, 
      ATA_PROGRAM_ID
    );
    console.log(`User Token Z ATA: ${userTokenZ.toString()}`);
    
    // Create transaction
    const tx = new Transaction();
    
    // Create Token Z mint account
    console.log("📝 Creating Token Z mint account...");
    const mintLamports = await getMinimumBalanceForRentExemptMint(connection);
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: userKeypair.publicKey,
        newAccountPubkey: tokenZKeypair.publicKey,
        lamports: mintLamports,
        space: MINT_SIZE,
        programId: SPL_TOKEN_PROGRAM_ID,
      })
    );
    
    // Initialize Token Z mint
    console.log("📝 Initializing Token Z mint...");
    tx.add(
      createInitializeMintInstruction(
        tokenZKeypair.publicKey,
        9, // decimals
        userKeypair.publicKey, // mint authority
        null, // freeze authority
        SPL_TOKEN_PROGRAM_ID
      )
    );
    
    // Create user's Token Z ATA
    console.log("📝 Creating user Token Z ATA...");
    tx.add(
      createAssociatedTokenAccountInstruction(
        userKeypair.publicKey,
        userTokenZ,
        userKeypair.publicKey,
        tokenZKeypair.publicKey,
        SPL_TOKEN_PROGRAM_ID,
        ATA_PROGRAM_ID
      )
    );
    
    // Mint tokens to user
    console.log("📝 Minting Token Z to user...");
    const mintAmount = 1_000_000_000_000_000; // 1 million tokens
    tx.add(
      createMintToInstruction(
        tokenZKeypair.publicKey,
        userTokenZ,
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
      tokenZKeypair,
    ], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    
    console.log("✅ Token Z created successfully!");
    console.log(`Transaction signature: ${sig}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${sig}`);
    console.log(`\n📋 Token Z Information:`);
    console.log(`Mint Address: ${tokenZKeypair.publicKey.toString()}`);
    console.log(`User ATA: ${userTokenZ.toString()}`);
    console.log(`Initial Supply: ${(mintAmount / 1e9).toFixed(0)} tokens`);
    
    // Save Token Z info for next steps
    const tokenInfo = {
      mint: tokenZKeypair.publicKey.toString(),
      userATA: userTokenZ.toString(),
      supply: mintAmount,
      decimals: 9
    };
    
    fs.writeFileSync('token-z-info.json', JSON.stringify(tokenInfo, null, 2));
    console.log("💾 Token Z info saved to token-z-info.json");
    
    return tokenInfo;
    
  } catch (error) {
    console.error("❌ Error creating Token Z:", error.message);
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
createTokenZ().catch(console.error);
