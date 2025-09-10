import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  SYSVAR_RENT_PUBKEY,
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

// Helper function to format token amounts
function formatTokenAmount(amount: number, decimals: number = 9): string {
  return (amount / Math.pow(10, decimals)).toFixed(6);
}

/**
 * TypeScript Script: Swap Token Y to Native SOL
 * This swaps Token Y for native SOL using the existing Token Y - Native SOL pool
 */
async function swapTokenYToNativeSOL() {
  try {
    console.log("🚀 Swapping Token Y to Native SOL...");
    
    // Load pool info from the native SOL pool we just created
    const poolInfo = JSON.parse(fs.readFileSync('native-sol-pool-tokeny-info.json', 'utf-8'));
    
    const POOL_PDA = new PublicKey(poolInfo.poolPDA);
    const TOKEN_Y_MINT = new PublicKey(poolInfo.tokenMint);
    const LP_MINT = new PublicKey(poolInfo.lpMint);
    const POOL_TOKEN_VAULT = new PublicKey(poolInfo.poolTokenVault);
    
    console.log(`Pool PDA: ${POOL_PDA.toString()}`);
    console.log(`Token Y: ${TOKEN_Y_MINT.toString()}`);
    console.log(`LP Mint: ${LP_MINT.toString()}`);
    console.log(`Pool Token Vault: ${POOL_TOKEN_VAULT.toString()}`);

    // User ATAs
    const userTokenY = getAssociatedTokenAddressSync(
      TOKEN_Y_MINT,
      userKeypair.publicKey,
      false,
      SPL_TOKEN_PROGRAM_ID,
      ATA_PROGRAM_ID
    );
    
    console.log(`User Token Y ATA: ${userTokenY.toString()}`);

    // Check balances before swap
    console.log("\n📊 Balances BEFORE Swap:");
    const balanceTokenYBefore = await getTokenBalance(userTokenY);
    const nativeSOLBalanceBefore = await connection.getBalance(userKeypair.publicKey);
    
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYBefore)} (${balanceTokenYBefore} raw)`);
    console.log(`Native SOL: ${nativeSOLBalanceBefore / 1e9} SOL (${nativeSOLBalanceBefore} lamports)`);

    // Swap parameters - swap 10 Token Y for SOL
    const amountTokenYIn = 10_000_000_000; // 10 Token Y (9 decimals)
    const minimumAmountSOLOut = 0; // Accept any amount of SOL (no slippage protection for testing)
    
    console.log(`\n🔄 Swap Parameters:`);
    console.log(`Token Y to swap: ${formatTokenAmount(amountTokenYIn)} Token Y`);
    console.log(`Minimum SOL expected: ${minimumAmountSOLOut / 1e9} SOL`);

    // Create transaction
    const transaction = new Transaction();

    // Prepare accounts for SwapTokenToNativeSOL (matching Rust program order)
    const accounts = [
      { pubkey: POOL_PDA, isSigner: false, isWritable: true },                    // pool_info
      { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false },               // token_mint_info
      { pubkey: POOL_TOKEN_VAULT, isSigner: false, isWritable: true },            // pool_token_vault
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: true },        // user_info
      { pubkey: userTokenY, isSigner: false, isWritable: true },                  // user_token_account
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },       // token_program
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },    // system_program
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },         // rent
    ];

    // Instruction data (Borsh: SwapTokenToNativeSOL { amount_in, minimum_amount_out })
    const data = Buffer.alloc(1 + 8 + 8); // 1 byte discriminator + 2x u64
    data.writeUInt8(13, 0); // SwapTokenToNativeSOL discriminator (index 13 in enum)
    data.writeBigUInt64LE(BigInt(amountTokenYIn), 1); // amount_in
    data.writeBigUInt64LE(BigInt(minimumAmountSOLOut), 9); // minimum_amount_out
    
    console.log(`\n📝 Instruction data: ${data.toString('hex')}`);

    // Add SwapTokenToNativeSOL instruction
    console.log("📝 Adding SwapTokenToNativeSOL instruction...");
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
    const balanceTokenYAfter = await getTokenBalance(userTokenY);
    const nativeSOLBalanceAfter = await connection.getBalance(userKeypair.publicKey);
    
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYAfter)} (${balanceTokenYAfter} raw)`);
    console.log(`Native SOL: ${nativeSOLBalanceAfter / 1e9} SOL (${nativeSOLBalanceAfter} lamports)`);

    // Calculate changes
    const tokenYChange = balanceTokenYBefore - balanceTokenYAfter;
    const solChange = nativeSOLBalanceAfter - nativeSOLBalanceBefore;
    
    console.log(`\n📈 Swap Results:`);
    console.log(`Token Y spent: ${formatTokenAmount(tokenYChange)}`);
    console.log(`SOL received: ${solChange / 1e9} SOL`);
    console.log(`Exchange rate: ${(solChange / 1e9) / (tokenYChange / 1e9)} SOL per Token Y`);

    // Update pool info
    const updatedPoolInfo = {
      ...poolInfo,
      lastSwapSignature: signature,
      lastSwapAmountTokenYIn: amountTokenYIn,
      lastSwapAmountSOLOut: solChange,
    };

    fs.writeFileSync("native-sol-pool-tokeny-info.json", JSON.stringify(updatedPoolInfo, null, 2));
    console.log("\n💾 Pool info updated with swap details");

  } catch (error) {
    console.error("❌ Error swapping Token Y to Native SOL:", error);
    throw error;
  }
}

// Run the function
swapTokenYToNativeSOL().catch(console.error);
