import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  getAccount,
} from "@solana/spl-token";
import * as fs from "fs";

// --- CONFIG ---
const RPC_ENDPOINT = "https://rpc.gorbchain.xyz";
const WS_ENDPOINT = "wss://rpc.gorbchain.xyz/ws/";
const AMM_PROGRAM_ID = new PublicKey("aBfrRgukSYDMgdyQ8y1XNEk4w5u7Ugtz5fPHFnkStJX");
const SPL_TOKEN_PROGRAM_ID = new PublicKey("G22oYgZ6LnVcy7v8eSNi2xpNk1NcZiPD8CVKSTut7oZ6");
const ATA_PROGRAM_ID = new PublicKey("GoATGVNeSXerFerPqTJ8hcED1msPWHHLxao2vwBYqowm");

// Native SOL mint address (wrapped SOL)
const NATIVE_SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

const USER_KEYPAIR_PATH = "/home/saurabh/.config/solana/id.json";
const userKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(USER_KEYPAIR_PATH, "utf-8")))
);

const connection = new Connection(RPC_ENDPOINT, {
  commitment: "confirmed",
  wsEndpoint: WS_ENDPOINT,
});

// Helper function to get token balance
async function getTokenBalance(tokenAccount: PublicKey): Promise<number> {
  try {
    const account = await getAccount(connection, tokenAccount, "confirmed", SPL_TOKEN_PROGRAM_ID);
    return Number(account.amount);
  } catch (error) {
    return 0;
  }
}

// Helper function to get SOL balance
async function getSOLBalance(publicKey: PublicKey): Promise<number> {
  const balance = await connection.getBalance(publicKey);
  return balance;
}

// Helper function to format token amounts
function formatTokenAmount(amount: number, decimals: number = 9): string {
  return (amount / Math.pow(10, decimals)).toFixed(6);
}

// Helper function to format SOL amounts
function formatSOLAmount(lamports: number): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(6);
}

/**
 * TypeScript Script: Initialize Native SOL Pool with Token X
 * This will use the integrated native SOL functionality in the main InitPool function
 */
async function initNativeSOLPool() {
  try {
    console.log("🚀 TypeScript Script: Initializing Native SOL Pool with Token X...");
    
    // Load Token X info from existing file
    const tokenXInfo = JSON.parse(fs.readFileSync('token-x-info.json', 'utf-8'));
    const TOKEN_X_MINT = new PublicKey(tokenXInfo.mint);
    
    console.log(`Token X: ${TOKEN_X_MINT.toString()}`);
    console.log(`Native SOL Mint: ${NATIVE_SOL_MINT.toString()}`);

    // 1. Derive pool PDA for native SOL pool
    const [poolPDA, poolBump] = await PublicKey.findProgramAddress(
      [Buffer.from("native_sol_pool"), TOKEN_X_MINT.toBuffer()],
      AMM_PROGRAM_ID
    );
    console.log(`Pool PDA: ${poolPDA.toString()}`);

    // 2. Derive LP mint PDA for native SOL pool
    const [lpMintPDA, lpMintBump] = await PublicKey.findProgramAddress(
      [Buffer.from("native_sol_lp_mint"), poolPDA.toBuffer()],
      AMM_PROGRAM_ID
    );
    console.log(`LP Mint PDA: ${lpMintPDA.toString()}`);

    // 3. Derive pool token vault PDA
    const [poolTokenVault, poolTokenVaultBump] = await PublicKey.findProgramAddress(
      [Buffer.from("native_sol_vault"), poolPDA.toBuffer(), TOKEN_X_MINT.toBuffer()],
      AMM_PROGRAM_ID
    );
    console.log(`Pool Token Vault: ${poolTokenVault.toString()}`);

    // 4. User ATAs
    const userTokenX = getAssociatedTokenAddressSync(TOKEN_X_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userLP = getAssociatedTokenAddressSync(lpMintPDA, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    console.log(`User Token X ATA: ${userTokenX.toString()}`);
    console.log(`User LP ATA: ${userLP.toString()}`);

    // 5. Check balances before pool initialization
    console.log("\n📊 Balances BEFORE Pool Initialization:");
    const balanceTokenXBefore = await getTokenBalance(userTokenX);
    const balanceSOLBefore = await getSOLBalance(userKeypair.publicKey);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXBefore)} (${balanceTokenXBefore} raw)`);
    console.log(`SOL: ${formatSOLAmount(balanceSOLBefore)} SOL (${balanceSOLBefore} lamports)`);

    // 6. Pool initialization parameters
    const amountSOL = 5 * LAMPORTS_PER_SOL; // 5 SOL
    const amountTokenX = 10_000_000_000; // 10 Token X (with 9 decimals)
    
    console.log(`\n🏊 Pool Initialization Parameters:`);
    console.log(`Initial SOL: ${formatSOLAmount(amountSOL)} SOL`);
    console.log(`Initial Token X: ${formatTokenAmount(amountTokenX)} Token X`);
    console.log(`Initial Ratio: 5 SOL : 10 Token X`);

    // 7. Create transaction
    const transaction = new Transaction();

    // 7.1. Prepare accounts for InitPool with native SOL (matching Rust program order)
    const accounts = [
      { pubkey: poolPDA, isSigner: false, isWritable: true },
      { pubkey: NATIVE_SOL_MINT, isSigner: false, isWritable: false }, // token_a = SOL
      { pubkey: TOKEN_X_MINT, isSigner: false, isWritable: false },    // token_b = Token X
      { pubkey: poolTokenVault, isSigner: false, isWritable: true },   // vault_a (not used for SOL)
      { pubkey: poolTokenVault, isSigner: false, isWritable: true },   // vault_b (Token X vault)
      { pubkey: lpMintPDA, isSigner: false, isWritable: true },        // LP mint PDA
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: userTokenX, isSigner: false, isWritable: true },       // user_token_a (not used for SOL)
      { pubkey: userTokenX, isSigner: false, isWritable: true },       // user_token_b (Token X)
      { pubkey: userLP, isSigner: false, isWritable: true },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: ATA_PROGRAM_ID, isSigner: false, isWritable: false }, // ATA Program
    ];

    // 7.2. Instruction data (Borsh: InitPool { amount_a, amount_b })
    // For native SOL pool: amount_a = SOL amount, amount_b = Token X amount
    const data = Buffer.alloc(1 + 8 + 8); // 1 byte discriminator + 2x u64
    data.writeUInt8(0, 0); // InitPool discriminator
    data.writeBigUInt64LE(BigInt(amountSOL), 1);     // amount_a = SOL
    data.writeBigUInt64LE(BigInt(amountTokenX), 9);  // amount_b = Token X
    
    console.log(`\n📝 Instruction data: ${data.toString('hex')}`);

    // 7.3. Add InitPool instruction
    console.log("📝 Adding InitPool instruction (Native SOL Pool)...");
    transaction.add({
      keys: accounts,
      programId: AMM_PROGRAM_ID,
      data,
    });

    // 8. Send transaction
    console.log("\n📝 Sending native SOL pool initialization transaction...");
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      userKeypair,
    ], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });

    console.log(`✅ Native SOL Pool initialized successfully!`);
    console.log(`Transaction signature: ${signature}`);

    // 9. Check balances after pool initialization
    console.log("\n📊 Balances AFTER Pool Initialization:");
    const balanceTokenXAfter = await getTokenBalance(userTokenX);
    const balanceSOLAfter = await getSOLBalance(userKeypair.publicKey);
    const balanceLPAfter = await getTokenBalance(userLP);
    
    console.log(`Token X: ${formatTokenAmount(balanceTokenXAfter)} (${balanceTokenXAfter} raw)`);
    console.log(`SOL: ${formatSOLAmount(balanceSOLAfter)} SOL (${balanceSOLAfter} lamports)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPAfter)} (${balanceLPAfter} raw)`);

    // 10. Save pool info
    const poolInfo = {
      poolPDA: poolPDA.toString(),
      poolBump,
      tokenMint: TOKEN_X_MINT.toString(),
      lpMint: lpMintPDA.toString(),
      lpMintBump,
      poolTokenVault: poolTokenVault.toString(),
      userTokenX: userTokenX.toString(),
      userLP: userLP.toString(),
      initialAmountSOL: amountSOL,
      initialAmountTokenX: amountTokenX,
      transactionSignature: signature,
      poolType: "native_sol",
    };

    fs.writeFileSync("native-sol-pool-info.json", JSON.stringify(poolInfo, null, 2));
    console.log("\n💾 Native SOL Pool info saved to native-sol-pool-info.json");

    return poolInfo;

  } catch (error) {
    console.error("❌ Error initializing native SOL pool:", error);
    throw error;
  }
}

// Run the function
initNativeSOLPool().catch(console.error);
