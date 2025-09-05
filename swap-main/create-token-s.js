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
 * Step 1: Create Token S
 * Function: createTokenS()
 * Purpose: Creates a new SPL token called Token S
 */
async function createTokenS() {
  try {
    console.log("🚀 Step 1: Creating Token S...");
    
    // Generate Token S mint keypair
    const tokenXKeypair = Keypair.generate();
    console.log(`Token S Mint: ${tokenXKeypair.publicKey.toString()}`);
    
    // User's Token S ATA
    const userTokenS = getAssociatedTokenAddressSync(
      tokenXKeypair.publicKey, 
      userKeypair.publicKey, 
      false, 
      SPL_TOKEN_PROGRAM_ID, 
      ATA_PROGRAM_ID
    );
    console.log(`User Token S ATA: ${userTokenS.toString()}`);
    
    // Create transaction
    const tx = new Transaction();
    
    // Create Token S mint account
    console.log("📝 Creating Token S mint account...");
    const mintLamports = await getMinimumBalanceForRentExemptMint(connection);
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: userKeypair.publicKey,
        newAccountPubkey: tokenXKeypair.publicKey,
        lamports: mintLamports,
        space: MINT_SIZE,
        programId: SPL_TOKEN_PROGRAM_ID,
      })
    );
    
    // Initialize Token S mint
    console.log("📝 Initializing Token S mint...");
    tx.add(
      createInitializeMintInstruction(
        tokenXKeypair.publicKey,
        9, // decimals
        userKeypair.publicKey, // mint authority
        null, // freeze authority
        SPL_TOKEN_PROGRAM_ID
      )
    );
    
    // Create user's Token S ATA
    console.log("📝 Creating user Token S ATA...");
    tx.add(
      createAssociatedTokenAccountInstruction(
        userKeypair.publicKey,
        userTokenS,
        userKeypair.publicKey,
        tokenXKeypair.publicKey,
        SPL_TOKEN_PROGRAM_ID,
        ATA_PROGRAM_ID
      )
    );
    
    // Mint tokens to user
    console.log("📝 Minting Token S to user...");
    const mintAmount = 1_000_000_000_000_000; // 1 million tokens
    tx.add(
      createMintToInstruction(
        tokenXKeypair.publicKey,
        userTokenS,
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
      tokenXKeypair,
    ], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    
    console.log("✅ Token S created successfully!");
    console.log(`Transaction signature: ${sig}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${sig}`);
    console.log(`\n📋 Token S Information:`);
    console.log(`Mint Address: ${tokenXKeypair.publicKey.toString()}`);
    console.log(`User ATA: ${userTokenS.toString()}`);
    console.log(`Initial Supply: ${(mintAmount / 1e9).toFixed(0)} tokens`);
    
    // Save Token S info for next steps
    const tokenInfo = {
      mint: tokenXKeypair.publicKey.toString(),
      userATA: userTokenS.toString(),
      supply: mintAmount,
      decimals: 9
    };
    
    fs.writeFileSync('token-s-info.json', JSON.stringify(tokenInfo, null, 2));
    console.log("💾 Token S info saved to token-s-info.json");
    
    return tokenInfo;
    
  } catch (error) {
    console.error("❌ Error creating Token S:", error.message);
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
createTokenS().catch(console.error);
