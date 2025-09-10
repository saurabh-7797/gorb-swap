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
 * TypeScript Script: Remove Liquidity from Pool X-Y
 * Based on IDL: RemoveLiquidity (discriminant: 2)
 * Args: lp_amount (u64)
 */
async function removeLiquidityXY() {
  try {
    console.log("🚀 TypeScript Script: Removing Liquidity from Pool X-Y...");
    
    // Load pool info from existing file
    const poolInfo = JSON.parse(fs.readFileSync('pool-xy-info.json', 'utf-8'));
    
    const POOL_PDA = new PublicKey(poolInfo.poolPDA);
    const TOKEN_X_MINT = new PublicKey(poolInfo.tokenX);
    const TOKEN_Y_MINT = new PublicKey(poolInfo.tokenY);
    const LP_MINT_PDA = new PublicKey(poolInfo.lpMint);
    const VAULT_X = new PublicKey(poolInfo.vaultX);
    const VAULT_Y = new PublicKey(poolInfo.vaultY);
    
    console.log(`Pool PDA: ${POOL_PDA.toString()}`);
    console.log(`Token X: ${TOKEN_X_MINT.toString()}`);
    console.log(`Token Y: ${TOKEN_Y_MINT.toString()}`);
    console.log(`LP Mint: ${LP_MINT_PDA.toString()}`);
    console.log(`Vault X: ${VAULT_X.toString()}`);
    console.log(`Vault Y: ${VAULT_Y.toString()}`);

    // User ATAs
    const userTokenX = getAssociatedTokenAddressSync(TOKEN_X_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userTokenY = getAssociatedTokenAddressSync(TOKEN_Y_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userLP = getAssociatedTokenAddressSync(LP_MINT_PDA, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    console.log(`User Token X ATA: ${userTokenX.toString()}`);
    console.log(`User Token Y ATA: ${userTokenY.toString()}`);
    console.log(`User LP ATA: ${userLP.toString()}`);

    // Check balances before removing liquidity
    console.log("\n📊 Balances BEFORE Removing Liquidity:");
    const balanceTokenXBefore = await getTokenBalance(userTokenX);
    const balanceTokenYBefore = await getTokenBalance(userTokenY);
    const balanceLPBefore = await getTokenBalance(userLP);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXBefore)} (${balanceTokenXBefore} raw)`);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYBefore)} (${balanceTokenYBefore} raw)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPBefore)} (${balanceLPBefore} raw)`);

    // Remove liquidity parameters (remove 50% of LP tokens)
    const lpAmountToRemove = Math.floor(balanceLPBefore * 0.5); // Remove 50% of LP tokens
    
    console.log(`\n🏊 Removing Liquidity Parameters:`);
    console.log(`LP Tokens to Remove: ${formatTokenAmount(lpAmountToRemove)} (${lpAmountToRemove} raw)`);
    console.log(`Percentage: 50% of current LP tokens`);

    // Create transaction
    const transaction = new Transaction();

    // Prepare accounts for RemoveLiquidity (matching Rust program order)
    const accounts = [
      { pubkey: POOL_PDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_X_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false },
      { pubkey: VAULT_X, isSigner: false, isWritable: true },
      { pubkey: VAULT_Y, isSigner: false, isWritable: true },
      { pubkey: LP_MINT_PDA, isSigner: false, isWritable: true },
      { pubkey: userLP, isSigner: false, isWritable: true },
      { pubkey: userTokenX, isSigner: false, isWritable: true },
      { pubkey: userTokenY, isSigner: false, isWritable: true },
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
    console.log("📝 Adding RemoveLiquidity instruction...");
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
    const balanceTokenYAfter = await getTokenBalance(userTokenY);
    const balanceLPAfter = await getTokenBalance(userLP);
    console.log(`Token X: ${formatTokenAmount(balanceTokenXAfter)} (${balanceTokenXAfter} raw)`);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYAfter)} (${balanceTokenYAfter} raw)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPAfter)} (${balanceLPAfter} raw)`);

    // Calculate the amount of liquidity removed
    const tokenXReceived = balanceTokenXAfter - balanceTokenXBefore;
    const tokenYReceived = balanceTokenYAfter - balanceTokenYBefore;
    const lpTokensBurned = balanceLPBefore - balanceLPAfter;
    
    console.log(`\n📈 Liquidity Removed:`);
    console.log(`Token X Received: ${formatTokenAmount(tokenXReceived)} (${tokenXReceived} raw)`);
    console.log(`Token Y Received: ${formatTokenAmount(tokenYReceived)} (${tokenYReceived} raw)`);
    console.log(`LP Tokens Burned: ${formatTokenAmount(lpTokensBurned)} (${lpTokensBurned} raw)`);

    // Update pool info
    const updatedPoolInfo = {
      ...poolInfo,
      removedLpAmount: lpAmountToRemove,
      tokenXReceived,
      tokenYReceived,
      lpTokensBurned,
      removeLiquiditySignature: signature,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync("pool-xy-info.json", JSON.stringify(updatedPoolInfo, null, 2));
    console.log("\n💾 Updated pool info saved to pool-xy-info.json");

    return updatedPoolInfo;

  } catch (error) {
    console.error("❌ Error removing liquidity from pool X-Y:", error);
    throw error;
  }
}

// Run the function
removeLiquidityXY().catch(console.error);
