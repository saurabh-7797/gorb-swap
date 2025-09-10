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
  createAssociatedTokenAccountInstruction,
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
 * TypeScript Script: Swap Token Y to Token X
 * Based on IDL: Swap (discriminant: 3)
 * Args: amount_in (u64), direction_a_to_b (bool)
 */
async function swapYToX() {
  try {
    console.log("🚀 TypeScript Script: Swapping Token Y to Token X...");
    
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
    const amountIn = 1_500_000_000; // 1.5 Token Y (with 9 decimals)
    const directionAtoB = false; // false = Token Y to Token X (B to A)
    
    console.log(`\n🔄 Swap Parameters:`);
    console.log(`Amount In: ${formatTokenAmount(amountIn)} Token Y`);
    console.log(`Direction: Token Y → Token X (B to A)`);

    // Create transaction
    const transaction = new Transaction();

    // Check if user Token X ATA exists, if not create it
    try {
      await getAccount(connection, userTokenX, "confirmed", SPL_TOKEN_PROGRAM_ID);
      console.log("✅ User Token X ATA already exists");
    } catch (error) {
      console.log("📝 Creating user Token X ATA...");
      const createTokenXATAInstruction = createAssociatedTokenAccountInstruction(
        userKeypair.publicKey, // payer
        userTokenX, // ata
        userKeypair.publicKey, // owner
        TOKEN_X_MINT, // mint
        SPL_TOKEN_PROGRAM_ID,
        ATA_PROGRAM_ID
      );
      transaction.add(createTokenXATAInstruction);
    }

    // Prepare accounts for Swap (matching Rust program order)
    // For B to A swap: user_in = Token Y, user_out = Token X
    const accounts = [
      { pubkey: POOL_PDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_X_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false },
      { pubkey: VAULT_X, isSigner: false, isWritable: true },
      { pubkey: VAULT_Y, isSigner: false, isWritable: true },
      { pubkey: userTokenY, isSigner: false, isWritable: true }, // user_in (Token Y)
      { pubkey: userTokenX, isSigner: false, isWritable: true }, // user_out (Token X)
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
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYAfter)} (${balanceTokenYBefore} raw)`);

    // Calculate the swap results
    const tokenYUsed = balanceTokenYBefore - balanceTokenYAfter;
    const tokenXReceived = balanceTokenXAfter - balanceTokenXBefore;
    
    console.log(`\n📈 Swap Results:`);
    console.log(`Token Y Used: ${formatTokenAmount(tokenYUsed)} (${tokenYUsed} raw)`);
    console.log(`Token X Received: ${formatTokenAmount(tokenXReceived)} (${tokenXReceived} raw)`);
    
    if (tokenYUsed > 0 && tokenXReceived > 0) {
      const exchangeRate = tokenXReceived / tokenYUsed;
      console.log(`Exchange Rate: 1 Token Y = ${exchangeRate.toFixed(6)} Token X`);
    }

    // Save swap info
    const swapInfo = {
      poolPDA: POOL_PDA.toString(),
      tokenX: TOKEN_X_MINT.toString(),
      tokenY: TOKEN_Y_MINT.toString(),
      amountIn,
      directionAtoB,
      tokenYUsed,
      tokenXReceived,
      exchangeRate: tokenXReceived / tokenYUsed,
      transactionSignature: signature,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync("swap-y-to-x-info.json", JSON.stringify(swapInfo, null, 2));
    console.log("\n💾 Swap info saved to swap-y-to-x-info.json");

    return swapInfo;

  } catch (error) {
    console.error("❌ Error swapping Token Y to Token X:", error);
    throw error;
  }
}

// Run the function
swapYToX().catch(console.error);
