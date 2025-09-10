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
 * TypeScript Script: Add Liquidity to Native SOL Pool
 * Based on IDL: AddLiquidity (discriminant: 1)
 * Args: amountA (u64), amountB (u64)
 */
async function addLiquidityNativeSOL() {
  try {
    console.log("🚀 TypeScript Script: Adding Liquidity to Native SOL Pool...");
    
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

    // Check balances before adding liquidity
    console.log("\n📊 Balances BEFORE Adding Liquidity:");
    const balanceTokenXBefore = await getTokenBalance(userTokenX);
    const balanceSOLBefore = await getSOLBalance(userKeypair.publicKey);
    const balanceLPBefore = await getTokenBalance(userLP);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXBefore)} (${balanceTokenXBefore} raw)`);
    console.log(`SOL: ${formatSOLAmount(balanceSOLBefore)} SOL (${balanceSOLBefore} lamports)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPBefore)} (${balanceLPBefore} raw)`);

    // Add liquidity parameters (maintaining the 5:10 ratio)
    const amountSOL = 2.5 * LAMPORTS_PER_SOL; // 2.5 more SOL (0.5x the initial amount)
    const amountTokenX = 5_000_000_000; // 5 more tokens (0.5x the initial amount)
    
    console.log(`\n🏊 Adding Liquidity Parameters:`);
    console.log(`Additional SOL: ${formatSOLAmount(amountSOL)} SOL`);
    console.log(`Additional Token X: ${formatTokenAmount(amountTokenX)} Token X`);
    console.log(`Maintaining Ratio: 5:10`);

    // Create transaction
    const transaction = new Transaction();

    // Check if user LP ATA exists, if not create it
    try {
      await getAccount(connection, userLP, "confirmed", SPL_TOKEN_PROGRAM_ID);
      console.log("✅ User LP ATA already exists");
    } catch (error) {
      console.log("📝 Creating user LP ATA...");
      const createLPATAInstruction = createAssociatedTokenAccountInstruction(
        userKeypair.publicKey, // payer
        userLP, // ata
        userKeypair.publicKey, // owner
        LP_MINT_PDA, // mint
        SPL_TOKEN_PROGRAM_ID,
        ATA_PROGRAM_ID
      );
      transaction.add(createLPATAInstruction);
    }

    // Prepare accounts for AddLiquidity with native SOL (matching Rust program order)
    const accounts = [
      { pubkey: POOL_PDA, isSigner: false, isWritable: true },
      { pubkey: NATIVE_SOL_MINT, isSigner: false, isWritable: false }, // token_a = SOL
      { pubkey: TOKEN_X_MINT, isSigner: false, isWritable: false },    // token_b = Token X
      { pubkey: POOL_TOKEN_VAULT, isSigner: false, isWritable: true }, // vault_a (not used for SOL)
      { pubkey: POOL_TOKEN_VAULT, isSigner: false, isWritable: true }, // vault_b (Token X vault)
      { pubkey: LP_MINT_PDA, isSigner: false, isWritable: true },      // LP mint PDA
      { pubkey: userTokenX, isSigner: false, isWritable: true },       // user_token_a (not used for SOL)
      { pubkey: userTokenX, isSigner: false, isWritable: true },       // user_token_b (Token X)
      { pubkey: userLP, isSigner: false, isWritable: true },
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: ATA_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    // Instruction data (Borsh: AddLiquidity { amount_a, amount_b })
    // For native SOL pool: amount_a = SOL amount, amount_b = Token X amount
    const data = Buffer.alloc(1 + 8 + 8); // 1 byte discriminator + 2x u64
    data.writeUInt8(1, 0); // AddLiquidity discriminator
    data.writeBigUInt64LE(BigInt(amountSOL), 1);     // amount_a = SOL
    data.writeBigUInt64LE(BigInt(amountTokenX), 9);  // amount_b = Token X
    
    console.log(`\n📝 Instruction data: ${data.toString('hex')}`);

    // Add AddLiquidity instruction
    console.log("📝 Adding AddLiquidity instruction (Native SOL Pool)...");
    transaction.add({
      keys: accounts,
      programId: AMM_PROGRAM_ID,
      data,
    });

    // Send transaction
    console.log("\n📝 Sending add liquidity transaction...");
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      userKeypair,
    ], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });

    console.log(`✅ Liquidity added successfully!`);
    console.log(`Transaction signature: ${signature}`);

    // Check balances after adding liquidity
    console.log("\n📊 Balances AFTER Adding Liquidity:");
    const balanceTokenXAfter = await getTokenBalance(userTokenX);
    const balanceSOLAfter = await getSOLBalance(userKeypair.publicKey);
    const balanceLPAfter = await getTokenBalance(userLP);
    
    console.log(`Token X: ${formatTokenAmount(balanceTokenXAfter)} (${balanceTokenXAfter} raw)`);
    console.log(`SOL: ${formatSOLAmount(balanceSOLAfter)} SOL (${balanceSOLAfter} lamports)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPAfter)} (${balanceLPAfter} raw)`);

    // Calculate the amount of liquidity added
    const tokenXUsed = balanceTokenXBefore - balanceTokenXAfter;
    const solUsed = balanceSOLBefore - balanceSOLAfter;
    const lpTokensMinted = balanceLPAfter - balanceLPBefore;
    
    console.log(`\n📈 Liquidity Added:`);
    console.log(`Token X Used: ${formatTokenAmount(tokenXUsed)} (${tokenXUsed} raw)`);
    console.log(`SOL Used: ${formatSOLAmount(solUsed)} SOL (${solUsed} lamports)`);
    console.log(`LP Tokens Minted: ${formatTokenAmount(lpTokensMinted)} (${lpTokensMinted} raw)`);

    // Update pool info
    const updatedPoolInfo = {
      ...poolInfo,
      additionalAmountSOL: amountSOL,
      additionalAmountTokenX: amountTokenX,
      totalAmountSOL: poolInfo.initialAmountSOL + amountSOL,
      totalAmountTokenX: poolInfo.initialAmountTokenX + amountTokenX,
      addLiquiditySignature: signature,
    };

    fs.writeFileSync("native-sol-pool-info.json", JSON.stringify(updatedPoolInfo, null, 2));
    console.log("\n💾 Updated native SOL pool info saved to native-sol-pool-info.json");

    return updatedPoolInfo;

  } catch (error) {
    console.error("❌ Error adding liquidity to native SOL pool:", error);
    throw error;
  }
}

// Run the function
addLiquidityNativeSOL().catch(console.error);
