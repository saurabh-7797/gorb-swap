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
 * TypeScript Script: Multihop Swap X → Y → Z
 * This performs two separate swaps: X → Y, then Y → Z
 */
async function multihopSwapXYZ() {
  try {
    console.log("🚀 TypeScript Script: Multihop Swap X → Y → Z...");
    
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
    const poolXYInfo = JSON.parse(fs.readFileSync('pool-xy-info.json', 'utf-8'));
    const poolYZInfo = JSON.parse(fs.readFileSync('pool-yz-info.json', 'utf-8'));
    
    const POOL_XY_PDA = new PublicKey(poolXYInfo.poolPDA);
    const POOL_YZ_PDA = new PublicKey(poolYZInfo.poolPDA);
    const VAULT_X_XY = new PublicKey(poolXYInfo.vaultX);
    const VAULT_Y_XY = new PublicKey(poolXYInfo.vaultY);
    const VAULT_Y_YZ = new PublicKey(poolYZInfo.vaultY);
    const VAULT_Z_YZ = new PublicKey(poolYZInfo.vaultZ);
    
    console.log(`Pool X-Y PDA: ${POOL_XY_PDA.toString()}`);
    console.log(`Pool Y-Z PDA: ${POOL_YZ_PDA.toString()}`);

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
    const amountIn = 500_000_000; // 0.5 Token X (with 9 decimals)
    
    console.log(`\n🔄 Multihop Swap Parameters:`);
    console.log(`Amount In: ${formatTokenAmount(amountIn)} Token X`);
    console.log(`Path: X → Y → Z`);

    // Step 1: Swap X → Y
    console.log("\n🔄 Step 1: Swapping X → Y...");
    const swapXYTransaction = new Transaction();

    const swapXYAccounts = [
      { pubkey: POOL_XY_PDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_X_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false },
      { pubkey: VAULT_X_XY, isSigner: false, isWritable: true },
      { pubkey: VAULT_Y_XY, isSigner: false, isWritable: true },
      { pubkey: userTokenX, isSigner: false, isWritable: true },
      { pubkey: userTokenY, isSigner: false, isWritable: true },
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: ATA_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    const swapXYData = Buffer.alloc(1 + 8 + 1);
    swapXYData.writeUInt8(3, 0); // Swap discriminator
    swapXYData.writeBigUInt64LE(BigInt(amountIn), 1);
    swapXYData.writeUInt8(1, 9); // direction_a_to_b = true (X to Y)

    swapXYTransaction.add({
      keys: swapXYAccounts,
      programId: AMM_PROGRAM_ID,
      data: swapXYData,
    });

    const swapXYSignature = await sendAndConfirmTransaction(connection, swapXYTransaction, [userKeypair], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });

    console.log(`✅ X → Y swap completed! Signature: ${swapXYSignature}`);

    // Check intermediate balances
    const balanceTokenXAfterXY = await getTokenBalance(userTokenX);
    const balanceTokenYAfterXY = await getTokenBalance(userTokenY);
    const tokenXUsed = balanceTokenXBefore - balanceTokenXAfterXY;
    const tokenYReceived = balanceTokenYAfterXY - balanceTokenYBefore;
    
    console.log(`📊 After X → Y:`);
    console.log(`Token X Used: ${formatTokenAmount(tokenXUsed)} (${tokenXUsed} raw)`);
    console.log(`Token Y Received: ${formatTokenAmount(tokenYReceived)} (${tokenYReceived} raw)`);

    // Step 2: Swap Y → Z
    console.log("\n🔄 Step 2: Swapping Y → Z...");
    const swapYZTransaction = new Transaction();

    const swapYZAccounts = [
      { pubkey: POOL_YZ_PDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_Z_MINT, isSigner: false, isWritable: false },
      { pubkey: VAULT_Y_YZ, isSigner: false, isWritable: true },
      { pubkey: VAULT_Z_YZ, isSigner: false, isWritable: true },
      { pubkey: userTokenY, isSigner: false, isWritable: true },
      { pubkey: userTokenZ, isSigner: false, isWritable: true },
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: ATA_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    const swapYZData = Buffer.alloc(1 + 8 + 1);
    swapYZData.writeUInt8(3, 0); // Swap discriminator
    swapYZData.writeBigUInt64LE(BigInt(tokenYReceived), 1); // Use all Y received
    swapYZData.writeUInt8(1, 9); // direction_a_to_b = true (Y to Z)

    swapYZTransaction.add({
      keys: swapYZAccounts,
      programId: AMM_PROGRAM_ID,
      data: swapYZData,
    });

    const swapYZSignature = await sendAndConfirmTransaction(connection, swapYZTransaction, [userKeypair], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });

    console.log(`✅ Y → Z swap completed! Signature: ${swapYZSignature}`);

    // Check final balances
    console.log("\n📊 Balances AFTER Multihop Swap:");
    const balanceTokenXAfter = await getTokenBalance(userTokenX);
    const balanceTokenYAfter = await getTokenBalance(userTokenY);
    const balanceTokenZAfter = await getTokenBalance(userTokenZ);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXAfter)} (${balanceTokenXAfter} raw)`);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYAfter)} (${balanceTokenYAfter} raw)`);
    console.log(`Token Z: ${formatTokenAmount(balanceTokenZAfter)} (${balanceTokenZAfter} raw)`);

    // Calculate final results
    const totalTokenXUsed = balanceTokenXBefore - balanceTokenXAfter;
    const totalTokenZReceived = balanceTokenZAfter - balanceTokenZBefore;
    
    console.log(`\n📈 Multihop Swap Results:`);
    console.log(`Total Token X Used: ${formatTokenAmount(totalTokenXUsed)} (${totalTokenXUsed} raw)`);
    console.log(`Total Token Z Received: ${formatTokenAmount(totalTokenZReceived)} (${totalTokenZReceived} raw)`);
    
    if (totalTokenXUsed > 0 && totalTokenZReceived > 0) {
      const exchangeRate = totalTokenZReceived / totalTokenXUsed;
      console.log(`Final Exchange Rate: 1 Token X = ${exchangeRate.toFixed(6)} Token Z`);
    }

    // Save multihop swap info
    const multihopSwapInfo = {
      tokenPath: [TOKEN_X_MINT.toString(), TOKEN_Y_MINT.toString(), TOKEN_Z_MINT.toString()],
      amountIn,
      totalTokenXUsed,
      totalTokenZReceived,
      finalExchangeRate: totalTokenZReceived / totalTokenXUsed,
      swapXYSignature,
      swapYZSignature,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync("multihop-swap-x-y-z-info.json", JSON.stringify(multihopSwapInfo, null, 2));
    console.log("\n💾 Multihop swap info saved to multihop-swap-x-y-z-info.json");

    return multihopSwapInfo;

  } catch (error) {
    console.error("❌ Error performing multihop swap X → Y → Z:", error);
    throw error;
  }
}

// Run the function
multihopSwapXYZ().catch(console.error);