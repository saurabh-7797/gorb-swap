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
const TOKEN_Y_MINT = new PublicKey(tokenYInfo.mint);

// Native SOL mint address (wrapped SOL)
const NATIVE_SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

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
function createInitNativeSOLPoolInstruction(amountSol: number, amountToken: number): Buffer {
  const data = Buffer.alloc(1 + 8 + 8); // discriminator + amountSol + amountToken
  data.writeUInt8(11, 0); // InitNativeSOLPool discriminator (index 11 in enum)
  
  // Write u64 values as little-endian
  const amountSolBuffer = Buffer.alloc(8);
  amountSolBuffer.writeBigUInt64LE(BigInt(amountSol), 0);
  amountSolBuffer.copy(data, 1);
  
  const amountTokenBuffer = Buffer.alloc(8);
  amountTokenBuffer.writeBigUInt64LE(BigInt(amountToken), 0);
  amountTokenBuffer.copy(data, 9);
  
  return data;
}

/**
 * TypeScript Script: Initialize Native SOL Pool with Token Y
 */
async function initNativeSOLPoolTokenY() {
  try {
    console.log("🚀 Initializing Native SOL Pool: SOL ↔ Token Y");
    console.log(`Native SOL Mint: ${NATIVE_SOL_MINT.toString()}`);
    console.log(`Token Y Mint: ${TOKEN_Y_MINT.toString()}`);
    console.log(`Program ID: ${PROGRAM_ID.toString()}`);

    // 1. Derive pool PDA
    const [poolPDA] = derivePDA(
      [Buffer.from("native_sol_pool"), TOKEN_Y_MINT.toBuffer()],
      PROGRAM_ID
    );
    console.log(`Pool PDA: ${poolPDA.toString()}`);

    // 2. Derive vault PDA
    const [poolTokenVault] = derivePDA(
      [Buffer.from("native_sol_vault"), poolPDA.toBuffer(), TOKEN_Y_MINT.toBuffer()],
      PROGRAM_ID
    );
    console.log(`Pool Token Vault: ${poolTokenVault.toString()}`);

    // 3. Derive LP mint PDA
    const [lpMint] = derivePDA(
      [Buffer.from("native_sol_lp_mint"), poolPDA.toBuffer()],
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
    const userLPATA = getAssociatedTokenAddressSync(
      lpMint,
      userKeypair.publicKey,
      false,
      SPL_TOKEN_PROGRAM_ID,
      ATA_PROGRAM_ID
    );

    console.log(`User Token Y ATA: ${userTokenYATA.toString()}`);
    console.log(`User LP ATA: ${userLPATA.toString()}`);

    // 5. Check balances before
    console.log("\n📊 Balances BEFORE Pool Creation:");
    const solBalance = await connection.getBalance(userKeypair.publicKey);
    const tokenYBalance = await getTokenBalance(userTokenYATA);
    console.log(`Native SOL: ${solBalance / 1e9} SOL (${solBalance} lamports)`);
    console.log(`Token Y: ${formatTokenAmount(tokenYBalance)} (${tokenYBalance} raw)`);

    // 6. Set pool amounts (using smaller amounts to fit current balance)
    const amountSol = 1_000_000_000; // 1 SOL (in lamports)
    const amountToken = 200_000_000_000; // 200 Token Y (9 decimals)
    
    console.log(`\n💰 Pool Initialization Amounts:`);
    console.log(`Native SOL: ${amountSol / 1e9} SOL (${amountSol} lamports)`);
    console.log(`Token Y: ${formatTokenAmount(amountToken)} (${amountToken} raw)`);

    // 7. Create transaction
    const transaction = new Transaction();

    // 7.1. Add InitNativeSOLPool instruction
    const initPoolData = createInitNativeSOLPoolInstruction(amountSol, amountToken);
    transaction.add({
      keys: [
        { pubkey: poolPDA, isSigner: false, isWritable: true },
        { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false },
        { pubkey: userKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: userTokenYATA, isSigner: false, isWritable: true },
        { pubkey: userLPATA, isSigner: false, isWritable: true },
        { pubkey: lpMint, isSigner: false, isWritable: true },
        { pubkey: poolTokenVault, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: ATA_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: initPoolData,
    });

    // 8. Send transaction
    console.log("\n📝 Sending native SOL pool initialization transaction...");
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [userKeypair],
      {
        commitment: "confirmed",
        preflightCommitment: "confirmed",
      }
    );

    console.log(`✅ Native SOL Pool initialized successfully!`);
    console.log(`Transaction signature: ${signature}`);

    // 9. Check balances after
    console.log("\n📊 Balances AFTER Pool Creation:");
    const solBalanceAfter = await connection.getBalance(userKeypair.publicKey);
    const tokenYBalanceAfter = await getTokenBalance(userTokenYATA);
    const lpBalance = await getTokenBalance(userLPATA);
    
    console.log(`Native SOL: ${solBalanceAfter / 1e9} SOL (${solBalanceAfter} lamports)`);
    console.log(`Token Y: ${formatTokenAmount(tokenYBalanceAfter)} (${tokenYBalanceAfter} raw)`);
    console.log(`LP Tokens: ${formatTokenAmount(lpBalance)} (${lpBalance} raw)`);

    // 10. Calculate liquidity provided
    const solProvided = solBalance - solBalanceAfter;
    const tokenYProvided = tokenYBalance - tokenYBalanceAfter;
    
    console.log(`\n💧 Liquidity Provided:`);
    console.log(`Native SOL: ${solProvided / 1e9} SOL (${solProvided} lamports)`);
    console.log(`Token Y: ${formatTokenAmount(tokenYProvided)} (${tokenYProvided} raw)`);

    // 11. Save pool info
    const poolInfo = {
      poolPDA: poolPDA.toString(),
      tokenMint: TOKEN_Y_MINT.toString(),
      poolTokenVault: poolTokenVault.toString(),
      lpMint: lpMint.toString(),
      userLPATA: userLPATA.toString(),
      amountSol: amountSol,
      amountToken: amountToken,
      lpTokensReceived: lpBalance,
      transactionSignature: signature,
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync("native-sol-pool-tokeny-info.json", JSON.stringify(poolInfo, null, 2));
    console.log("\n💾 Native SOL Pool info saved to native-sol-pool-tokeny-info.json");

    // 12. Calculate pool ratio
    const ratio = tokenYProvided / (solProvided / 1e9);
    console.log(`\n📈 Pool Ratio: ${ratio.toFixed(6)} Token Y per SOL`);

  } catch (error) {
    console.error("❌ Error initializing native SOL pool:", error);
    throw error;
  }
}

// Run the function
initNativeSOLPoolTokenY().catch(console.error);
