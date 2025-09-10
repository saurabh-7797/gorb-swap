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
 * TypeScript Script: Swap Token X to Token Y
 * Based on IDL: Swap (discriminant: 3)
 * Args: amount_in (u64), direction_a_to_b (bool)
 */
async function swapXToY() {
  try {
    console.log("🚀 TypeScript Script: Swapping Token X to Token Y...");
    
    // Load pool info from existing file
    const poolInfo = JSON.parse(fs.readFileSync('pool-xy-info.json', 'utf-8'));
    
    const POOL_PDA = new PublicKey(poolInfo.poolPDA);
    const TOKEN_X_MINT = new PublicKey(poolInfo.tokenX);
    const TOKEN_Y_MINT = new PublicKey(poolInfo.tokenY);
    const VAULT_X = new PublicKey(poolInfo.vaultX);
    const VAULT_Y = new PublicKey(poolInfo.vaultY);
    
    console.log(`Pool PDA: ${POOL_PDA.toString()}`);
    console.log(`Token X: ${TOKEN_X_MINT.toString()}`);
    console.log(`Token Y: ${TOKEN_Y_MINT.toString()}`);
    console.log(`Vault X: ${VAULT_X.toString()}`);
    console.log(`Vault Y: ${VAULT_Y.toString()}`);

    // User ATAs
    const userTokenX = getAssociatedTokenAddressSync(TOKEN_X_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userTokenY = getAssociatedTokenAddressSync(TOKEN_Y_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    console.log(`User Token X ATA: ${userTokenX.toString()}`);
    console.log(`User Token Y ATA: ${userTokenY.toString()}`);

    // Check balances before swap
    console.log("\n📊 Balances BEFORE Swap:");
    const balanceTokenXBefore = await getTokenBalance(userTokenX);
    const balanceTokenYBefore = await getTokenBalance(userTokenY);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXBefore)} (${balanceTokenXBefore} raw)`);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYBefore)} (${balanceTokenYBefore} raw)`);

    // Swap parameters
    const amountIn = 1_000_000_000; // 1 Token X (with 9 decimals)
    const directionAtoB = true; // true = Token X to Token Y (A to B)
    
    console.log(`\n🔄 Swap Parameters:`);
    console.log(`Amount In: ${formatTokenAmount(amountIn)} Token X`);
    console.log(`Direction: Token X → Token Y (A to B)`);

    // Create transaction
    const transaction = new Transaction();

    // Prepare accounts for Swap (matching Rust program order)
    const accounts = [
      { pubkey: POOL_PDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_X_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false },
      { pubkey: VAULT_X, isSigner: false, isWritable: true },
      { pubkey: VAULT_Y, isSigner: false, isWritable: true },
      { pubkey: userTokenX, isSigner: false, isWritable: true },
      { pubkey: userTokenY, isSigner: false, isWritable: true },
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: ATA_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    // Instruction data (Borsh: Swap { amount_in, direction_a_to_b })
    const data = Buffer.alloc(1 + 8 + 1); // 1 byte discriminator + u64 + bool
    data.writeUInt8(3, 0); // Swap discriminator
    data.writeBigUInt64LE(BigInt(amountIn), 1);
    data.writeUInt8(directionAtoB ? 1 : 0, 9);
    
    console.log(`\n📝 Instruction data: ${data.toString('hex')}`);

    // Add Swap instruction
    console.log("📝 Adding Swap instruction...");
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
    const balanceTokenYAfter = await getTokenBalance(userTokenY);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXAfter)} (${balanceTokenXAfter} raw)`);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYAfter)} (${balanceTokenYAfter} raw)`);

    // Calculate the swap results
    const tokenXUsed = balanceTokenXBefore - balanceTokenXAfter;
    const tokenYReceived = balanceTokenYAfter - balanceTokenYBefore;
    
    console.log(`\n📈 Swap Results:`);
    console.log(`Token X Used: ${formatTokenAmount(tokenXUsed)} (${tokenXUsed} raw)`);
    console.log(`Token Y Received: ${formatTokenAmount(tokenYReceived)} (${tokenYReceived} raw)`);
    
    if (tokenXUsed > 0 && tokenYReceived > 0) {
      const exchangeRate = tokenYReceived / tokenXUsed;
      console.log(`Exchange Rate: 1 Token X = ${exchangeRate.toFixed(6)} Token Y`);
    }

    // Save swap info
    const swapInfo = {
      poolPDA: POOL_PDA.toString(),
      tokenX: TOKEN_X_MINT.toString(),
      tokenY: TOKEN_Y_MINT.toString(),
      amountIn,
      directionAtoB,
      tokenXUsed,
      tokenYReceived,
      exchangeRate: tokenYReceived / tokenXUsed,
      transactionSignature: signature,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync("swap-x-to-y-info.json", JSON.stringify(swapInfo, null, 2));
    console.log("\n💾 Swap info saved to swap-x-to-y-info.json");

    return swapInfo;

  } catch (error) {
    console.error("❌ Error swapping Token X to Token Y:", error);
    throw error;
  }
}

// Run the function
swapXToY().catch(console.error);
