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
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import * as fs from "fs";

// --- CONFIG ---
const RPC_ENDPOINT = "https://rpc.gorbchain.xyz";
const WS_ENDPOINT = "wss://rpc.gorbchain.xyz/ws/";
const SPL_TOKEN_PROGRAM_ID = new PublicKey("G22oYgZ6LnVcy7v8eSNi2xpNk1NcZiPD8CVKSTut7oZ6");
const ATA_PROGRAM_ID = new PublicKey("GoATGVNeSXerFerPqTJ8hcED1msPWHHLxao2vwBYqowm");

// Program ID (deployed program)
const PROGRAM_ID = new PublicKey("aBfrRgukSYDMgdyQ8y1XNEk4w5u7Ugtz5fPHFnkStJX");

const USER_KEYPAIR_PATH = "/home/saurabh/.config/solana/id.json";
const userKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(USER_KEYPAIR_PATH, "utf-8")))
);

const connection = new Connection(RPC_ENDPOINT, {
  commitment: "confirmed",
  wsEndpoint: WS_ENDPOINT,
});

// Load token info
const tokenYInfo = JSON.parse(fs.readFileSync("token-y-info.json", "utf-8"));
const wrappedSOLInfo = JSON.parse(fs.readFileSync("custom-wrapped-sol-info.json", "utf-8"));

const TOKEN_Y_MINT = new PublicKey(tokenYInfo.mint);
const WRAPPED_SOL_MINT = new PublicKey(wrappedSOLInfo.mint);

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

// Helper function to derive PDA
function derivePDA(seeds: (Buffer | Uint8Array)[], programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

// Helper function to create instruction data
function createInitPoolInstruction(amountA: number, amountB: number): Buffer {
  const data = Buffer.alloc(1 + 8 + 8); // discriminator + amountA + amountB
  data.writeUInt8(0, 0); // InitPool discriminator
  
  // Write u64 values as little-endian
  const amountABuffer = Buffer.alloc(8);
  amountABuffer.writeBigUInt64LE(BigInt(amountA), 0);
  amountABuffer.copy(data, 1);
  
  const amountBBuffer = Buffer.alloc(8);
  amountBBuffer.writeBigUInt64LE(BigInt(amountB), 0);
  amountBBuffer.copy(data, 9);
  
  return data;
}

/**
 * TypeScript Script: Initialize Pool between Token Y and Wrapped SOL
 */
async function initPoolTokenYWrappedSOL() {
  try {
    console.log("🚀 Initializing Pool: Token Y ↔ Wrapped SOL");
    console.log(`Token Y Mint: ${TOKEN_Y_MINT.toString()}`);
    console.log(`Wrapped SOL Mint: ${WRAPPED_SOL_MINT.toString()}`);
    console.log(`Program ID: ${PROGRAM_ID.toString()}`);

    // 1. Derive pool PDA
    const [poolPDA] = derivePDA(
      [Buffer.from("pool"), TOKEN_Y_MINT.toBuffer(), WRAPPED_SOL_MINT.toBuffer()],
      PROGRAM_ID
    );
    console.log(`Pool PDA: ${poolPDA.toString()}`);

    // 2. Derive vault PDAs
    const [vaultA] = derivePDA(
      [Buffer.from("vault"), poolPDA.toBuffer(), TOKEN_Y_MINT.toBuffer()],
      PROGRAM_ID
    );
    const [vaultB] = derivePDA(
      [Buffer.from("vault"), poolPDA.toBuffer(), WRAPPED_SOL_MINT.toBuffer()],
      PROGRAM_ID
    );
    console.log(`Vault A (Token Y): ${vaultA.toString()}`);
    console.log(`Vault B (Wrapped SOL): ${vaultB.toString()}`);

    // 3. Derive LP mint PDA
    const [lpMint] = derivePDA(
      [Buffer.from("mint"), poolPDA.toBuffer()],
      PROGRAM_ID
    );
    console.log(`LP Mint: ${lpMint.toString()}`);

    // 4. Get user token accounts
    const userTokenYATA = getAssociatedTokenAddressSync(
      TOKEN_Y_MINT,
      userKeypair.publicKey,
      false,
      SPL_TOKEN_PROGRAM_ID,
      ATA_PROGRAM_ID
    );
    const userWrappedSOLATA = getAssociatedTokenAddressSync(
      WRAPPED_SOL_MINT,
      userKeypair.publicKey,
      false,
      SPL_TOKEN_PROGRAM_ID,
      ATA_PROGRAM_ID
    );
    const userLPATA = getAssociatedTokenAddressSync(
      lpMint,
      userKeypair.publicKey,
      false,
      SPL_TOKEN_PROGRAM_ID,
      ATA_PROGRAM_ID
    );

    console.log(`User Token Y ATA: ${userTokenYATA.toString()}`);
    console.log(`User Wrapped SOL ATA: ${userWrappedSOLATA.toString()}`);
    console.log(`User LP ATA: ${userLPATA.toString()}`);

    // 5. Check balances before
    console.log("\n📊 Balances BEFORE Pool Creation:");
    const tokenYBalance = await getTokenBalance(userTokenYATA);
    const wrappedSOLBalance = await getTokenBalance(userWrappedSOLATA);
    console.log(`Token Y: ${formatTokenAmount(tokenYBalance)} (${tokenYBalance} raw)`);
    console.log(`Wrapped SOL: ${formatTokenAmount(wrappedSOLBalance)} (${wrappedSOLBalance} raw)`);

    // 6. Set pool amounts
    const amountA = 1_000_000_000_000; // 1000 Token Y (9 decimals)
    const amountB = 5_000_000_000; // 5 Wrapped SOL (9 decimals)
    
    console.log(`\n💰 Pool Initialization Amounts:`);
    console.log(`Token Y: ${formatTokenAmount(amountA)} (${amountA} raw)`);
    console.log(`Wrapped SOL: ${formatTokenAmount(amountB)} (${amountB} raw)`);

    // 7. Create transaction
    const transaction = new Transaction();

    // 7.1. Add InitPool instruction
    const initPoolData = createInitPoolInstruction(amountA, amountB);
    transaction.add({
      keys: [
        { pubkey: poolPDA, isSigner: false, isWritable: true },
        { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false },
        { pubkey: WRAPPED_SOL_MINT, isSigner: false, isWritable: false },
        { pubkey: vaultA, isSigner: false, isWritable: true },
        { pubkey: vaultB, isSigner: false, isWritable: true },
        { pubkey: lpMint, isSigner: false, isWritable: true },
        { pubkey: userKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: userTokenYATA, isSigner: false, isWritable: true },
        { pubkey: userWrappedSOLATA, isSigner: false, isWritable: true },
        { pubkey: userLPATA, isSigner: false, isWritable: true },
        { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: ATA_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: initPoolData,
    });

    // 8. Send transaction
    console.log("\n📝 Sending pool initialization transaction...");
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [userKeypair],
      {
        commitment: "confirmed",
        preflightCommitment: "confirmed",
      }
    );

    console.log(`✅ Pool initialized successfully!`);
    console.log(`Transaction signature: ${signature}`);

    // 9. Check balances after
    console.log("\n📊 Balances AFTER Pool Creation:");
    const tokenYBalanceAfter = await getTokenBalance(userTokenYATA);
    const wrappedSOLBalanceAfter = await getTokenBalance(userWrappedSOLATA);
    const lpBalance = await getTokenBalance(userLPATA);
    
    console.log(`Token Y: ${formatTokenAmount(tokenYBalanceAfter)} (${tokenYBalanceAfter} raw)`);
    console.log(`Wrapped SOL: ${formatTokenAmount(wrappedSOLBalanceAfter)} (${wrappedSOLBalanceAfter} raw)`);
    console.log(`LP Tokens: ${formatTokenAmount(lpBalance)} (${lpBalance} raw)`);

    // 10. Calculate liquidity provided
    const tokenYProvided = tokenYBalance - tokenYBalanceAfter;
    const wrappedSOLProvided = wrappedSOLBalance - wrappedSOLBalanceAfter;
    
    console.log(`\n💧 Liquidity Provided:`);
    console.log(`Token Y: ${formatTokenAmount(tokenYProvided)} (${tokenYProvided} raw)`);
    console.log(`Wrapped SOL: ${formatTokenAmount(wrappedSOLProvided)} (${wrappedSOLProvided} raw)`);

    // 11. Save pool info
    const poolInfo = {
      poolPDA: poolPDA.toString(),
      tokenA: TOKEN_Y_MINT.toString(),
      tokenB: WRAPPED_SOL_MINT.toString(),
      vaultA: vaultA.toString(),
      vaultB: vaultB.toString(),
      lpMint: lpMint.toString(),
      userLPATA: userLPATA.toString(),
      amountA: amountA,
      amountB: amountB,
      lpTokensReceived: lpBalance,
      transactionSignature: signature,
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync("pool-tokeny-wrapped-sol-info.json", JSON.stringify(poolInfo, null, 2));
    console.log("\n💾 Pool info saved to pool-tokeny-wrapped-sol-info.json");

    // 12. Calculate pool ratio
    const ratio = tokenYProvided / wrappedSOLProvided;
    console.log(`\n📈 Pool Ratio: ${ratio.toFixed(6)} Token Y per Wrapped SOL`);

  } catch (error) {
    console.error("❌ Error initializing pool:", error);
    throw error;
  }
}

// Run the function
initPoolTokenYWrappedSOL().catch(console.error);
