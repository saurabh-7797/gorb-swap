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
 * TypeScript Script: Remove Liquidity from Native SOL Pool
 * Based on IDL: RemoveLiquidity (discriminant: 2)
 * Args: lp_amount (u64)
 */
async function removeLiquidityNativeSOL() {
  try {
    console.log("🚀 TypeScript Script: Removing Liquidity from Native SOL Pool...");
    
    // Load pool info from existing file
    const poolInfo = JSON.parse(fs.readFileSync('native-sol-pool-info.json', 'utf-8'));
    
    const POOL_PDA = new PublicKey(poolInfo.poolPDA);
    const TOKEN_X_MINT = new PublicKey(poolInfo.tokenMint);
    const LP_MINT_PDA = new PublicKey(poolInfo.lpMint);
    const POOL_TOKEN_VAULT = new PublicKey(poolInfo.poolTokenVault);
    
    console.log(`Pool PDA: ${POOL_PDA.toString()}`);
    console.log(`Token X: ${TOKEN_X_MINT.toString()}`);
    console.log(`LP Mint: ${LP_MINT_PDA.toString()}`);
    console.log(`Pool Token Vault: ${POOL_TOKEN_VAULT.toString()}`);

    // User ATAs
    const userTokenX = getAssociatedTokenAddressSync(TOKEN_X_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userLP = getAssociatedTokenAddressSync(LP_MINT_PDA, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    console.log(`User Token X ATA: ${userTokenX.toString()}`);
    console.log(`User LP ATA: ${userLP.toString()}`);

    // Check balances before removing liquidity
    console.log("\n📊 Balances BEFORE Removing Liquidity:");
    const balanceTokenXBefore = await getTokenBalance(userTokenX);
    const balanceSOLBefore = await getSOLBalance(userKeypair.publicKey);
    const balanceLPBefore = await getTokenBalance(userLP);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXBefore)} (${balanceTokenXBefore} raw)`);
    console.log(`SOL: ${formatSOLAmount(balanceSOLBefore)} SOL (${balanceSOLBefore} lamports)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPBefore)} (${balanceLPBefore} raw)`);

    // Remove liquidity parameters (remove 30% of LP tokens)
    const lpAmountToRemove = Math.floor(balanceLPBefore * 0.3); // Remove 30% of LP tokens
    
    console.log(`\n🏊 Removing Liquidity Parameters:`);
    console.log(`LP Tokens to Remove: ${formatTokenAmount(lpAmountToRemove)} (${lpAmountToRemove} raw)`);
    console.log(`Percentage: 30% of current LP tokens`);

    // Create transaction
    const transaction = new Transaction();

    // Prepare accounts for RemoveLiquidity with native SOL (matching Rust program order)
    const accounts = [
      { pubkey: POOL_PDA, isSigner: false, isWritable: true },
      { pubkey: NATIVE_SOL_MINT, isSigner: false, isWritable: false }, // token_a = SOL
      { pubkey: TOKEN_X_MINT, isSigner: false, isWritable: false },    // token_b = Token X
      { pubkey: POOL_TOKEN_VAULT, isSigner: false, isWritable: true }, // vault_a (not used for SOL)
      { pubkey: POOL_TOKEN_VAULT, isSigner: false, isWritable: true }, // vault_b (Token X vault)
      { pubkey: LP_MINT_PDA, isSigner: false, isWritable: true },      // LP mint PDA
      { pubkey: userLP, isSigner: false, isWritable: true },
      { pubkey: userTokenX, isSigner: false, isWritable: true },       // user_token_a (not used for SOL)
      { pubkey: userTokenX, isSigner: false, isWritable: true },       // user_token_b (Token X)
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: ATA_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    // Instruction data (Borsh: RemoveLiquidity { lp_amount })
    const data = Buffer.alloc(1 + 8); // 1 byte discriminator + u64
    data.writeUInt8(2, 0); // RemoveLiquidity discriminator
    data.writeBigUInt64LE(BigInt(lpAmountToRemove), 1);
    
    console.log(`\n📝 Instruction data: ${data.toString('hex')}`);

    // Add RemoveLiquidity instruction
    console.log("📝 Adding RemoveLiquidity instruction (Native SOL Pool)...");
    transaction.add({
      keys: accounts,
      programId: AMM_PROGRAM_ID,
      data,
    });

    // Send transaction
    console.log("\n📝 Sending remove liquidity transaction...");
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      userKeypair,
    ], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });

    console.log(`✅ Liquidity removed successfully!`);
    console.log(`Transaction signature: ${signature}`);

    // Check balances after removing liquidity
    console.log("\n📊 Balances AFTER Removing Liquidity:");
    const balanceTokenXAfter = await getTokenBalance(userTokenX);
    const balanceSOLAfter = await getSOLBalance(userKeypair.publicKey);
    const balanceLPAfter = await getTokenBalance(userLP);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXAfter)} (${balanceTokenXAfter} raw)`);
    console.log(`SOL: ${formatSOLAmount(balanceSOLAfter)} SOL (${balanceSOLAfter} lamports)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPAfter)} (${balanceLPAfter} raw)`);

    // Calculate the amount of liquidity removed
    const tokenXReceived = balanceTokenXAfter - balanceTokenXBefore;
    const solReceived = balanceSOLAfter - balanceSOLBefore;
    const lpTokensBurned = balanceLPBefore - balanceLPAfter;
    
    console.log(`\n📈 Liquidity Removed:`);
    console.log(`Token X Received: ${formatTokenAmount(tokenXReceived)} (${tokenXReceived} raw)`);
    console.log(`SOL Received: ${formatSOLAmount(solReceived)} SOL (${solReceived} lamports)`);
    console.log(`LP Tokens Burned: ${formatTokenAmount(lpTokensBurned)} (${lpTokensBurned} raw)`);

    // Update pool info
    const updatedPoolInfo = {
      ...poolInfo,
      removedLpAmount: lpAmountToRemove,
      tokenXReceived,
      solReceived,
      lpTokensBurned,
      removeLiquiditySignature: signature,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync("native-sol-pool-info.json", JSON.stringify(updatedPoolInfo, null, 2));
    console.log("\n💾 Updated native SOL pool info saved to native-sol-pool-info.json");

    return updatedPoolInfo;

  } catch (error) {
    console.error("❌ Error removing liquidity from native SOL pool:", error);
    throw error;
  }
}

// Run the function
removeLiquidityNativeSOL().catch(console.error);
