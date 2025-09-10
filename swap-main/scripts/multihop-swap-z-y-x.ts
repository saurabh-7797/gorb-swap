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
 * TypeScript Script: Multihop Swap Z → Y → X (Single Transaction)
 * Based on IDL: MultihopSwap (discriminant: 4)
 * Args: amount_in (u64), minimum_amount_out (u64)
 */
async function multihopSwapZYX() {
  try {
    console.log("🚀 TypeScript Script: Multihop Swap Z → Y → X (Single Transaction)...");
    
    // Load token info from existing files
    const tokenXInfo = JSON.parse(fs.readFileSync('token-x-info.json', 'utf-8'));
    const tokenYInfo = JSON.parse(fs.readFileSync('token-y-info.json', 'utf-8'));
    const tokenZInfo = JSON.parse(fs.readFileSync('token-z-info.json', 'utf-8'));
    
    const TOKEN_X_MINT = new PublicKey(tokenXInfo.mint);
    const TOKEN_Y_MINT = new PublicKey(tokenYInfo.mint);
    const TOKEN_Z_MINT = new PublicKey(tokenZInfo.mint);
    
    console.log(`Token X: ${TOKEN_X_MINT.toString()}`);
    console.log(`Token Y: ${TOKEN_Y_MINT.toString()}`);
    console.log(`Token Z: ${TOKEN_Z_MINT.toString()}`);

    // Load pool info
    const poolYZInfo = JSON.parse(fs.readFileSync('pool-yz-info.json', 'utf-8'));
    const poolXYInfo = JSON.parse(fs.readFileSync('pool-xy-info.json', 'utf-8'));
    
    const POOL_YZ_PDA = new PublicKey(poolYZInfo.poolPDA);
    const POOL_XY_PDA = new PublicKey(poolXYInfo.poolPDA);
    const VAULT_Z_YZ = new PublicKey(poolYZInfo.vaultZ);
    const VAULT_Y_YZ = new PublicKey(poolYZInfo.vaultY);
    const VAULT_Y_XY = new PublicKey(poolXYInfo.vaultY);
    const VAULT_X_XY = new PublicKey(poolXYInfo.vaultX);
    
    console.log(`Pool Y-Z PDA: ${POOL_YZ_PDA.toString()}`);
    console.log(`Pool X-Y PDA: ${POOL_XY_PDA.toString()}`);

    // User ATAs
    const userTokenX = getAssociatedTokenAddressSync(TOKEN_X_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userTokenY = getAssociatedTokenAddressSync(TOKEN_Y_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userTokenZ = getAssociatedTokenAddressSync(TOKEN_Z_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    console.log(`User Token X ATA: ${userTokenX.toString()}`);
    console.log(`User Token Y ATA: ${userTokenY.toString()}`);
    console.log(`User Token Z ATA: ${userTokenZ.toString()}`);

    // Check balances before multihop swap
    console.log("\n📊 Balances BEFORE Multihop Swap:");
    const balanceTokenXBefore = await getTokenBalance(userTokenX);
    const balanceTokenYBefore = await getTokenBalance(userTokenY);
    const balanceTokenZBefore = await getTokenBalance(userTokenZ);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXBefore)} (${balanceTokenXBefore} raw)`);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYBefore)} (${balanceTokenYBefore} raw)`);
    console.log(`Token Z: ${formatTokenAmount(balanceTokenZBefore)} (${balanceTokenZBefore} raw)`);

    // Multihop swap parameters
    const amountIn = 300_000_000; // 0.3 Token Z (with 9 decimals)
    const minimumAmountOut = 1; // Minimum 1 unit of Token X (slippage protection)
    
    console.log(`\n🔄 Multihop Swap Parameters:`);
    console.log(`Amount In: ${formatTokenAmount(amountIn)} Token Z`);
    console.log(`Minimum Amount Out: ${formatTokenAmount(minimumAmountOut)} Token X`);
    console.log(`Path: Z → Y → X`);

    // Create single transaction
    const transaction = new Transaction();

    // Prepare accounts for MultihopSwap (matching Rust program order)
    // Note: Pool Y-Z was created with Y as token_a and Z as token_b
    // Pool X-Y was created with X as token_a and Y as token_b
    const accounts = [
      // User and program accounts
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: userTokenZ, isSigner: false, isWritable: true }, // Initial input
      
      // Hop 1: Z → Y using Y-Z pool (7 accounts: pool, token_a, token_b, vault_a, vault_b, intermediate, next)
      // For Z → Y in Y-Z pool, we need to swap in reverse direction (token_b → token_a)
      { pubkey: POOL_YZ_PDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false }, // token_a (Y)
      { pubkey: TOKEN_Z_MINT, isSigner: false, isWritable: false }, // token_b (Z)
      { pubkey: VAULT_Y_YZ, isSigner: false, isWritable: true }, // vault_a (Y)
      { pubkey: VAULT_Z_YZ, isSigner: false, isWritable: true }, // vault_b (Z)
      { pubkey: userTokenY, isSigner: false, isWritable: true }, // Intermediate Y
      { pubkey: userTokenY, isSigner: false, isWritable: true }, // Next token account
      
      // Hop 2: Y → X using X-Y pool (7 accounts: pool, token_a, token_b, vault_a, vault_b, intermediate, next)
      // For Y → X in X-Y pool, we need to swap in reverse direction (token_b → token_a)
      { pubkey: POOL_XY_PDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_X_MINT, isSigner: false, isWritable: false }, // token_a (X)
      { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false }, // token_b (Y)
      { pubkey: VAULT_X_XY, isSigner: false, isWritable: true }, // vault_a (X)
      { pubkey: VAULT_Y_XY, isSigner: false, isWritable: true }, // vault_b (Y)
      { pubkey: userTokenY, isSigner: false, isWritable: true }, // Intermediate Y
      { pubkey: userTokenX, isSigner: false, isWritable: true }, // Final output
    ];

    // Instruction data (Borsh: MultihopSwap { amount_in, minimum_amount_out })
    const data = Buffer.alloc(1 + 8 + 8); // 1 byte discriminator + 2x u64
    data.writeUInt8(4, 0); // MultihopSwap discriminator
    data.writeBigUInt64LE(BigInt(amountIn), 1);
    data.writeBigUInt64LE(BigInt(minimumAmountOut), 9);
    
    console.log(`\n📝 Instruction data: ${data.toString('hex')}`);

    // Add MultihopSwap instruction
    console.log("📝 Adding MultihopSwap instruction...");
    transaction.add({
      keys: accounts,
      programId: AMM_PROGRAM_ID,
      data,
    });

    // Send single transaction
    console.log("\n📝 Sending multihop swap transaction...");
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      userKeypair,
    ], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });

    console.log(`✅ Multihop swap Z → Y → X completed successfully!`);
    console.log(`Transaction signature: ${signature}`);

    // Check final balances
    console.log("\n📊 Balances AFTER Multihop Swap:");
    const balanceTokenXAfter = await getTokenBalance(userTokenX);
    const balanceTokenYAfter = await getTokenBalance(userTokenY);
    const balanceTokenZAfter = await getTokenBalance(userTokenZ);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXAfter)} (${balanceTokenXAfter} raw)`);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYAfter)} (${balanceTokenYAfter} raw)`);
    console.log(`Token Z: ${formatTokenAmount(balanceTokenZAfter)} (${balanceTokenZAfter} raw)`);

    // Calculate final results
    const totalTokenZUsed = balanceTokenZBefore - balanceTokenZAfter;
    const totalTokenXReceived = balanceTokenXAfter - balanceTokenXBefore;
    const tokenYChange = balanceTokenYAfter - balanceTokenYBefore;
    
    console.log(`\n📈 Multihop Swap Results:`);
    console.log(`Total Token Z Used: ${formatTokenAmount(totalTokenZUsed)} (${totalTokenZUsed} raw)`);
    console.log(`Token Y Change: ${formatTokenAmount(tokenYChange)} (should be ~0 for multihop)`);
    console.log(`Total Token X Received: ${formatTokenAmount(totalTokenXReceived)} (${totalTokenXReceived} raw)`);
    
    if (totalTokenZUsed > 0 && totalTokenXReceived > 0) {
      const exchangeRate = totalTokenXReceived / totalTokenZUsed;
      console.log(`Final Exchange Rate: 1 Token Z = ${exchangeRate.toFixed(6)} Token X`);
    }

    // Save multihop swap info
    const multihopSwapInfo = {
      tokenPath: [TOKEN_Z_MINT.toString(), TOKEN_Y_MINT.toString(), TOKEN_X_MINT.toString()],
      amountIn,
      minimumAmountOut,
      totalTokenZUsed,
      tokenYChange,
      totalTokenXReceived,
      finalExchangeRate: totalTokenXReceived / totalTokenZUsed,
      transactionSignature: signature,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync("multihop-swap-z-y-x-info.json", JSON.stringify(multihopSwapInfo, null, 2));
    console.log("\n💾 Multihop swap info saved to multihop-swap-z-y-x-info.json");

    return multihopSwapInfo;

  } catch (error) {
    console.error("❌ Error performing multihop swap Z → Y → X:", error);
    throw error;
  }
}

// Run the function
multihopSwapZYX().catch(console.error);
