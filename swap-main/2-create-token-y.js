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
 * Step 2: Create Token Y
 * Function: createTokenY()
 * Purpose: Creates a new SPL token called Token Y
 */
async function createTokenY() {
  try {
    console.log("🚀 Step 2: Creating Token Y...");
    
    // Generate Token Y mint keypair
    const tokenYKeypair = Keypair.generate();
    console.log(`Token Y Mint: ${tokenYKeypair.publicKey.toString()}`);
    
    // User's Token Y ATA
    const userTokenY = getAssociatedTokenAddressSync(
      tokenYKeypair.publicKey, 
      userKeypair.publicKey, 
      false, 
      SPL_TOKEN_PROGRAM_ID, 
      ATA_PROGRAM_ID
    );
    console.log(`User Token Y ATA: ${userTokenY.toString()}`);
    
    // Create transaction
    const tx = new Transaction();
    
    // Create Token Y mint account
    console.log("📝 Creating Token Y mint account...");
    const mintLamports = await getMinimumBalanceForRentExemptMint(connection);
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: userKeypair.publicKey,
        newAccountPubkey: tokenYKeypair.publicKey,
        lamports: mintLamports,
        space: MINT_SIZE,
        programId: SPL_TOKEN_PROGRAM_ID,
      })
    );
    
    // Initialize Token Y mint
    console.log("📝 Initializing Token Y mint...");
    tx.add(
      createInitializeMintInstruction(
        tokenYKeypair.publicKey,
        9, // decimals
        userKeypair.publicKey, // mint authority
        null, // freeze authority
        SPL_TOKEN_PROGRAM_ID
      )
    );
    
    // Create user's Token Y ATA
    console.log("📝 Creating user Token Y ATA...");
    tx.add(
      createAssociatedTokenAccountInstruction(
        userKeypair.publicKey,
        userTokenY,
        userKeypair.publicKey,
        tokenYKeypair.publicKey,
        SPL_TOKEN_PROGRAM_ID,
        ATA_PROGRAM_ID
      )
    );
    
    // Mint tokens to user
    console.log("📝 Minting Token Y to user...");
    const mintAmount = 1_000_000_000_000_000; // 1 million tokens
    tx.add(
      createMintToInstruction(
        tokenYKeypair.publicKey,
        userTokenY,
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
      tokenYKeypair,
    ], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    
    console.log("✅ Token Y created successfully!");
    console.log(`Transaction signature: ${sig}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${sig}`);
    console.log(`\n📋 Token Y Information:`);
    console.log(`Mint Address: ${tokenYKeypair.publicKey.toString()}`);
    console.log(`User ATA: ${userTokenY.toString()}`);
    console.log(`Initial Supply: ${(mintAmount / 1e9).toFixed(0)} tokens`);
    
    // Save Token Y info for next steps
    const tokenInfo = {
      mint: tokenYKeypair.publicKey.toString(),
      userATA: userTokenY.toString(),
      supply: mintAmount,
      decimals: 9
    };
    
    fs.writeFileSync('token-y-info.json', JSON.stringify(tokenInfo, null, 2));
    console.log("💾 Token Y info saved to token-y-info.json");
    
    return tokenInfo;
    
  } catch (error) {
    console.error("❌ Error creating Token Y:", error.message);
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
createTokenY().catch(console.error);
