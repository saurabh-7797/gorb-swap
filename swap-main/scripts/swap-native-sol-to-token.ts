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
 * TypeScript Script: Swap Native SOL to Token X
 * Based on IDL: Swap (discriminant: 3)
 * Args: amount_in (u64), direction_a_to_b (bool)
 */
async function swapNativeSOLToToken() {
  try {
    console.log("🚀 TypeScript Script: Swapping Native SOL to Token X...");
    
    // Load pool info from existing file
    const poolInfo = JSON.parse(fs.readFileSync('native-sol-pool-info.json', 'utf-8'));
    
    const POOL_PDA = new PublicKey(poolInfo.poolPDA);
    const TOKEN_X_MINT = new PublicKey(poolInfo.tokenMint);
    const POOL_TOKEN_VAULT = new PublicKey(poolInfo.poolTokenVault);
    
    console.log(`Pool PDA: ${POOL_PDA.toString()}`);
    console.log(`Token X: ${TOKEN_X_MINT.toString()}`);
    console.log(`Pool Token Vault: ${POOL_TOKEN_VAULT.toString()}`);

    // User ATAs
    const userTokenX = getAssociatedTokenAddressSync(TOKEN_X_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    console.log(`User Token X ATA: ${userTokenX.toString()}`);

    // Check balances before swap
    console.log("\n📊 Balances BEFORE Swap:");
    const balanceTokenXBefore = await getTokenBalance(userTokenX);
    const balanceSOLBefore = await getSOLBalance(userKeypair.publicKey);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXBefore)} (${balanceTokenXBefore} raw)`);
    console.log(`SOL: ${formatSOLAmount(balanceSOLBefore)} SOL (${balanceSOLBefore} lamports)`);

    // Swap parameters
    const amountIn = 1 * LAMPORTS_PER_SOL; // 1 SOL
    const directionAtoB = true; // true = SOL to Token X (A to B)
    
    console.log(`\n🔄 Swap Parameters:`);
    console.log(`Amount In: ${formatSOLAmount(amountIn)} SOL`);
    console.log(`Direction: SOL → Token X (A to B)`);

    // Create transaction
    const transaction = new Transaction();

    // Prepare accounts for Swap with native SOL (matching Rust program order)
    const accounts = [
      { pubkey: POOL_PDA, isSigner: false, isWritable: true },
      { pubkey: NATIVE_SOL_MINT, isSigner: false, isWritable: false }, // token_a = SOL
      { pubkey: TOKEN_X_MINT, isSigner: false, isWritable: false },    // token_b = Token X
      { pubkey: POOL_TOKEN_VAULT, isSigner: false, isWritable: true }, // vault_a (not used for SOL)
      { pubkey: POOL_TOKEN_VAULT, isSigner: false, isWritable: true }, // vault_b (Token X vault)
      { pubkey: userTokenX, isSigner: false, isWritable: true },       // user_in (not used for SOL)
      { pubkey: userTokenX, isSigner: false, isWritable: true },       // user_out (Token X)
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: ATA_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    // Instruction data (Borsh: Swap { amount_in, direction_a_to_b })
    // For native SOL pool: amount_in = SOL amount, direction_a_to_b = true for SOL to Token
    const data = Buffer.alloc(1 + 8 + 1); // 1 byte discriminator + u64 + bool
    data.writeUInt8(3, 0); // Swap discriminator
    data.writeBigUInt64LE(BigInt(amountIn), 1);
    data.writeUInt8(directionAtoB ? 1 : 0, 9);
    
    console.log(`\n📝 Instruction data: ${data.toString('hex')}`);

    // Add Swap instruction
    console.log("📝 Adding Swap instruction (Native SOL Pool)...");
    transaction.add({
      keys: accounts,
      programId: AMM_PROGRAM_ID,
      data,
    });

    // Send transaction
    console.log("\n📝 Sending swap transaction...");
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      userKeypair,
    ], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });

    console.log(`✅ Swap completed successfully!`);
    console.log(`Transaction signature: ${signature}`);

    // Check balances after swap
    console.log("\n📊 Balances AFTER Swap:");
    const balanceTokenXAfter = await getTokenBalance(userTokenX);
    const balanceSOLAfter = await getSOLBalance(userKeypair.publicKey);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXAfter)} (${balanceTokenXAfter} raw)`);
    console.log(`SOL: ${formatSOLAmount(balanceSOLAfter)} SOL (${balanceSOLAfter} lamports)`);

    // Calculate the swap results
    const solUsed = balanceSOLBefore - balanceSOLAfter;
    const tokenXReceived = balanceTokenXAfter - balanceTokenXBefore;
    
    console.log(`\n📈 Swap Results:`);
    console.log(`SOL Used: ${formatSOLAmount(solUsed)} SOL (${solUsed} lamports)`);
    console.log(`Token X Received: ${formatTokenAmount(tokenXReceived)} (${tokenXReceived} raw)`);
    
    if (solUsed > 0 && tokenXReceived > 0) {
      const exchangeRate = tokenXReceived / (solUsed / LAMPORTS_PER_SOL);
      console.log(`Exchange Rate: 1 SOL = ${exchangeRate.toFixed(6)} Token X`);
    }

    // Save swap info
    const swapInfo = {
      poolPDA: POOL_PDA.toString(),
      tokenMint: TOKEN_X_MINT.toString(),
      amountIn,
      directionAtoB,
      solUsed,
      tokenXReceived,
      exchangeRate: tokenXReceived / (solUsed / LAMPORTS_PER_SOL),
      transactionSignature: signature,
      timestamp: new Date().toISOString(),
      poolType: "native_sol",
    };

    fs.writeFileSync("swap-native-sol-to-token-info.json", JSON.stringify(swapInfo, null, 2));
    console.log("\n💾 Swap info saved to swap-native-sol-to-token-info.json");

    return swapInfo;

  } catch (error) {
    console.error("❌ Error swapping Native SOL to Token X:", error);
    throw error;
  }
}

// Run the function
swapNativeSOLToToken().catch(console.error);
