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
 * Step 19: Create Token P
 * Function: createTokenP()
 * Purpose: Creates a new SPL token called Token P with large mint amount
 */
async function createTokenP() {
  try {
    console.log("🚀 Step 19: Creating Token P...");
    
    // Generate Token P mint keypair
    const tokenPKeypair = Keypair.generate();
    console.log(`Token P Mint: ${tokenPKeypair.publicKey.toString()}`);
    
    // User's Token P ATA
    const userTokenP = getAssociatedTokenAddressSync(
      tokenPKeypair.publicKey, 
      userKeypair.publicKey, 
      false, 
      SPL_TOKEN_PROGRAM_ID, 
      ATA_PROGRAM_ID
    );
    console.log(`User Token P ATA: ${userTokenP.toString()}`);
    
    // Create transaction
    const tx = new Transaction();
    
    // Create Token P mint account
    console.log("📝 Creating Token P mint account...");
    const mintLamports = await getMinimumBalanceForRentExemptMint(connection);
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: userKeypair.publicKey,
        newAccountPubkey: tokenPKeypair.publicKey,
        lamports: mintLamports,
        space: MINT_SIZE,
        programId: SPL_TOKEN_PROGRAM_ID,
      })
    );
    
    // Initialize Token P mint
    console.log("📝 Initializing Token P mint...");
    tx.add(
      createInitializeMintInstruction(
        tokenPKeypair.publicKey,
        9, // decimals
        userKeypair.publicKey, // mint authority
        null, // freeze authority
        SPL_TOKEN_PROGRAM_ID
      )
    );
    
    // Create user's Token P ATA
    console.log("📝 Creating user Token P ATA...");
    tx.add(
      createAssociatedTokenAccountInstruction(
        userKeypair.publicKey,
        userTokenP,
        userKeypair.publicKey,
        tokenPKeypair.publicKey,
        SPL_TOKEN_PROGRAM_ID,
        ATA_PROGRAM_ID
      )
    );
    
    // Mint large amount of tokens to user
    console.log("📝 Minting large amount of Token P to user...");
    const mintAmount = 10_000_000_000_000_000; // 10 million tokens (large amount)
    tx.add(
      createMintToInstruction(
        tokenPKeypair.publicKey,
        userTokenP,
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
      tokenPKeypair,
    ], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    
    console.log("✅ Token P created successfully!");
    console.log(`Transaction signature: ${sig}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${sig}`);
    console.log(`\n📋 Token P Information:`);
    console.log(`Mint Address: ${tokenPKeypair.publicKey.toString()}`);
    console.log(`User ATA: ${userTokenP.toString()}`);
    console.log(`Initial Supply: ${(mintAmount / 1e9).toFixed(0)} tokens`);
    
    // Save Token P info for next steps
    const tokenInfo = {
      mint: tokenPKeypair.publicKey.toString(),
      userATA: userTokenP.toString(),
      supply: mintAmount,
      decimals: 9
    };
    
    fs.writeFileSync('token-p-info.json', JSON.stringify(tokenInfo, null, 2));
    console.log("💾 Token P info saved to token-p-info.json");
    
    return tokenInfo;
    
  } catch (error) {
    console.error("❌ Error creating Token P:", error.message);
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
createTokenP().catch(console.error);
