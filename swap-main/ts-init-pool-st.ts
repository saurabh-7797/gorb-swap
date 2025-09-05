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
  createInitializeMintInstruction,
  getAccount,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
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
 * TypeScript Script: Initialize Pool S-T
 * Based on IDL: InitPool (discriminant: 0)
 * Args: amountA (u64), amountB (u64)
 */
async function initPoolST() {
  try {
    console.log("🚀 TypeScript Script: Initializing Pool S-T...");
    
    // Load Token S and T info from previous steps
    const tokenSInfo = JSON.parse(fs.readFileSync('token-s-info.json', 'utf-8'));
    const tokenTInfo = JSON.parse(fs.readFileSync('token-t-info.json', 'utf-8'));
    
    const TOKEN_S_MINT = new PublicKey(tokenSInfo.mint);
    const TOKEN_T_MINT = new PublicKey(tokenTInfo.mint);
    const LP_MINT = Keypair.generate(); // Generate new LP mint each time
    
    console.log(`Token S: ${TOKEN_S_MINT.toString()}`);
    console.log(`Token T: ${TOKEN_T_MINT.toString()}`);
    console.log(`LP Mint: ${LP_MINT.publicKey.toString()}`);

    // 1. Derive pool PDA
    const [poolPDA, poolBump] = await PublicKey.findProgramAddress(
      [Buffer.from("pool"), TOKEN_S_MINT.toBuffer(), TOKEN_T_MINT.toBuffer()],
      AMM_PROGRAM_ID
    );
    console.log(`Pool PDA: ${poolPDA.toString()}`);

    // 2. Derive vault PDAs (matching Rust program logic)
    const [vaultS, vaultSBump] = await PublicKey.findProgramAddress(
      [Buffer.from("vault"), poolPDA.toBuffer(), TOKEN_S_MINT.toBuffer()],
      AMM_PROGRAM_ID
    );
    const [vaultT, vaultTBump] = await PublicKey.findProgramAddress(
      [Buffer.from("vault"), poolPDA.toBuffer(), TOKEN_T_MINT.toBuffer()],
      AMM_PROGRAM_ID
    );
    console.log(`Vault S: ${vaultS.toString()}`);
    console.log(`Vault T: ${vaultT.toString()}`);

    // 3. User ATAs
    const userTokenS = getAssociatedTokenAddressSync(TOKEN_S_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userTokenT = getAssociatedTokenAddressSync(TOKEN_T_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userLP = getAssociatedTokenAddressSync(LP_MINT.publicKey, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    console.log(`User Token S ATA: ${userTokenS.toString()}`);
    console.log(`User Token T ATA: ${userTokenT.toString()}`);
    console.log(`User LP ATA: ${userLP.toString()}`);

    // 4. Check balances before pool initialization
    console.log("\n📊 Balances BEFORE Pool Initialization:");
    const balanceTokenSBefore = await getTokenBalance(userTokenS);
    const balanceTokenTBefore = await getTokenBalance(userTokenT);
    console.log(`Token S: ${formatTokenAmount(balanceTokenSBefore)} (${balanceTokenSBefore} raw)`);
    console.log(`Token T: ${formatTokenAmount(balanceTokenTBefore)} (${balanceTokenTBefore} raw)`);

    // 5. Pool initialization parameters with different ratio (2:3)
    const amountS = 2_000_000_000; // 2 tokens
    const amountT = 3_000_000_000; // 3 tokens
    
    console.log(`\n🏊 Pool Initialization Parameters:`);
    console.log(`Initial Token S: ${formatTokenAmount(amountS)} Token S`);
    console.log(`Initial Token T: ${formatTokenAmount(amountT)} Token T`);
    console.log(`Initial Ratio: 2:3`);

    // 6. Create transaction
    const transaction = new Transaction();

    // 6.1. Create LP mint account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: userKeypair.publicKey,
        newAccountPubkey: LP_MINT.publicKey,
        lamports: await connection.getMinimumBalanceForRentExemption(82),
        space: 82,
        programId: SPL_TOKEN_PROGRAM_ID,
      })
    );

    // 6.2. Initialize LP mint
    transaction.add(
      createInitializeMintInstruction(
        LP_MINT.publicKey,
        9, // decimals
        poolPDA, // mint authority (pool PDA)
        poolPDA, // freeze authority (pool PDA)
        SPL_TOKEN_PROGRAM_ID
      )
    );

    // 6.3. Vault accounts are created as PDAs by the program itself

    // 6.5. Create user LP ATA if it doesn't exist
    try {
      await getAccount(connection, userLP, "confirmed", SPL_TOKEN_PROGRAM_ID);
    } catch (error) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          userKeypair.publicKey, // payer
          userLP, // ata
          userKeypair.publicKey, // owner
          LP_MINT.publicKey, // mint
          SPL_TOKEN_PROGRAM_ID,
          ATA_PROGRAM_ID
        )
      );
    }

    // 6.6. Prepare accounts for InitPool (matching Rust program order)
    const accounts = [
      { pubkey: poolPDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_S_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_T_MINT, isSigner: false, isWritable: false },
      { pubkey: vaultS, isSigner: false, isWritable: true }, // PDA, not a signer
      { pubkey: vaultT, isSigner: false, isWritable: true }, // PDA, not a signer
      { pubkey: LP_MINT.publicKey, isSigner: false, isWritable: true },
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: userTokenS, isSigner: false, isWritable: true },
      { pubkey: userTokenT, isSigner: false, isWritable: true },
      { pubkey: userLP, isSigner: false, isWritable: true },
      { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];

    // 6.7. Instruction data (Borsh: InitPool { amount_a, amount_b })
    const data = Buffer.alloc(1 + 8 + 8); // 1 byte discriminator + 2x u64
    data.writeUInt8(0, 0); // InitPool discriminator
    data.writeBigUInt64LE(BigInt(amountS), 1);
    data.writeBigUInt64LE(BigInt(amountT), 9);
    
    console.log(`\n📝 Instruction data: ${data.toString('hex')}`);

    // 6.8. Add InitPool instruction
    console.log("📝 Adding InitPool instruction...");
    transaction.add({
      keys: accounts,
      programId: AMM_PROGRAM_ID,
      data,
    });

    // 7. Send transaction
    console.log("\n📝 Sending pool initialization transaction...");
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      userKeypair,
      LP_MINT,
    ], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });

    console.log(`✅ Pool S-T initialized successfully!`);
    console.log(`Transaction signature: ${signature}`);

    // 8. Check balances after pool initialization
    console.log("\n📊 Balances AFTER Pool Initialization:");
    const balanceTokenSAfter = await getTokenBalance(userTokenS);
    const balanceTokenTAfter = await getTokenBalance(userTokenT);
    const balanceLPAfter = await getTokenBalance(userLP);
    
    console.log(`Token S: ${formatTokenAmount(balanceTokenSAfter)} (${balanceTokenSAfter} raw)`);
    console.log(`Token T: ${formatTokenAmount(balanceTokenTAfter)} (${balanceTokenTAfter} raw)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPAfter)} (${balanceLPAfter} raw)`);

    // 9. Save pool info
    const poolInfo = {
      poolPDA: poolPDA.toString(),
      poolBump,
      tokenS: TOKEN_S_MINT.toString(),
      tokenT: TOKEN_T_MINT.toString(),
      lpMint: LP_MINT.publicKey.toString(),
      vaultS: vaultS.toString(),
      vaultT: vaultT.toString(),
      userTokenS: userTokenS.toString(),
      userTokenT: userTokenT.toString(),
      userLP: userLP.toString(),
      initialAmountS: amountS,
      initialAmountT: amountT,
      transactionSignature: signature,
    };

    fs.writeFileSync("pool-st-info.json", JSON.stringify(poolInfo, null, 2));
    console.log("\n💾 Pool S-T info saved to pool-st-info.json");

  } catch (error) {
    console.error("❌ Error initializing pool S-T:", error);
    throw error;
  }
}

// Run the function
initPoolST().catch(console.error);
