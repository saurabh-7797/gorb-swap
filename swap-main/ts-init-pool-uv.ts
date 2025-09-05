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
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";

// --- CONFIG ---
const RPC_ENDPOINT = "https://rpc.gorbchain.xyz";
const WS_ENDPOINT = "wss://rpc.gorbchain.xyz/ws/";
const AMM_PROGRAM_ID = new PublicKey("8qhCTESZN9xDCHvtXFdCHfsgcctudbYdzdCFzUkTTMMe");
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
 * TypeScript Script: Initialize Pool U-V
 * Based on IDL: InitPool (discriminant: 0)
 * Args: amountA (u64), amountB (u64)
 */
async function initPoolUV() {
  try {
    console.log("🚀 TypeScript Script: Initializing Pool U-V...");
    
    // Load Token U and V info from previous steps
    const tokenUInfo = JSON.parse(fs.readFileSync('token-u-info.json', 'utf-8'));
    const tokenVInfo = JSON.parse(fs.readFileSync('token-v-info.json', 'utf-8'));
    
    const TOKEN_U_MINT = new PublicKey(tokenUInfo.mint);
    const TOKEN_V_MINT = new PublicKey(tokenVInfo.mint);
    const LP_MINT = Keypair.generate();
    
    console.log(`Token U: ${TOKEN_U_MINT.toString()}`);
    console.log(`Token V: ${TOKEN_V_MINT.toString()}`);
    console.log(`LP Mint: ${LP_MINT.publicKey.toString()}`);

    // 1. Derive pool PDA
    const [poolPDA, poolBump] = await PublicKey.findProgramAddress(
      [Buffer.from("pool"), TOKEN_U_MINT.toBuffer(), TOKEN_V_MINT.toBuffer()],
      AMM_PROGRAM_ID
    );
    console.log(`Pool PDA: ${poolPDA.toString()}`);

    // 2. Create vault accounts as regular accounts (not PDAs)
    const vaultU = Keypair.generate();
    const vaultV = Keypair.generate();
    console.log(`Vault U: ${vaultU.publicKey.toString()}`);
    console.log(`Vault V: ${vaultV.publicKey.toString()}`);

    // 3. User ATAs
    const userTokenU = getAssociatedTokenAddressSync(TOKEN_U_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userTokenV = getAssociatedTokenAddressSync(TOKEN_V_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userLP = getAssociatedTokenAddressSync(LP_MINT.publicKey, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    console.log(`User Token U ATA: ${userTokenU.toString()}`);
    console.log(`User Token V ATA: ${userTokenV.toString()}`);
    console.log(`User LP ATA: ${userLP.toString()}`);

    // 4. Check balances before pool initialization
    console.log("\n📊 Balances BEFORE Pool Initialization:");
    const balanceTokenUBefore = await getTokenBalance(userTokenU);
    const balanceTokenVBefore = await getTokenBalance(userTokenV);
    console.log(`Token U: ${formatTokenAmount(balanceTokenUBefore)} (${balanceTokenUBefore} raw)`);
    console.log(`Token V: ${formatTokenAmount(balanceTokenVBefore)} (${balanceTokenVBefore} raw)`);

    // 5. Pool initialization parameters with different ratio (3:4)
    const amountU = 3_000_000_000; // 3 tokens
    const amountV = 4_000_000_000; // 4 tokens
    
    console.log(`\n🏊 Pool Initialization Parameters:`);
    console.log(`Initial Token U: ${formatTokenAmount(amountU)} Token U`);
    console.log(`Initial Token V: ${formatTokenAmount(amountV)} Token V`);
    console.log(`Initial Ratio: 3:4`);

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
        poolPDA, // mint authority
        null // freeze authority
      )
    );

    // 6.3. Create vault U account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: userKeypair.publicKey,
        newAccountPubkey: vaultU.publicKey,
        lamports: await connection.getMinimumBalanceForRentExemption(165),
        space: 165,
        programId: SPL_TOKEN_PROGRAM_ID,
      })
    );

    // 6.4. Create vault V account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: userKeypair.publicKey,
        newAccountPubkey: vaultV.publicKey,
        lamports: await connection.getMinimumBalanceForRentExemption(165),
        space: 165,
        programId: SPL_TOKEN_PROGRAM_ID,
      })
    );

    // 6.5. Create user LP ATA if it doesn't exist
    try {
      await getAccount(connection, userLP, "confirmed", SPL_TOKEN_PROGRAM_ID);
    } catch (error) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          userKeypair.publicKey, // payer
          userLP, // ata
          userKeypair.publicKey, // owner
          LP_MINT.publicKey // mint
        )
      );
    }

    // 6.6. Initialize pool instruction
    const initPoolInstruction = {
      programId: AMM_PROGRAM_ID,
      keys: [
        { pubkey: poolPDA, isSigner: false, isWritable: true },
        { pubkey: TOKEN_U_MINT, isSigner: false, isWritable: false },
        { pubkey: TOKEN_V_MINT, isSigner: false, isWritable: false },
        { pubkey: LP_MINT.publicKey, isSigner: true, isWritable: true },
        { pubkey: vaultU.publicKey, isSigner: true, isWritable: true },
        { pubkey: vaultV.publicKey, isSigner: true, isWritable: true },
        { pubkey: userTokenU, isSigner: false, isWritable: true },
        { pubkey: userTokenV, isSigner: false, isWritable: true },
        { pubkey: userLP, isSigner: false, isWritable: true },
        { pubkey: userKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        Buffer.from([0]), // InitPool discriminator
        Buffer.from(new Uint8Array(new BigUint64Array([BigInt(amountU)]).buffer)),
        Buffer.from(new Uint8Array(new BigUint64Array([BigInt(amountV)]).buffer)),
      ]),
    };

    transaction.add(initPoolInstruction);

    // 7. Send transaction
    console.log("\n📝 Sending pool initialization transaction...");
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      userKeypair,
      LP_MINT,
      vaultU,
      vaultV,
    ]);

    console.log(`✅ Pool U-V initialized successfully!`);
    console.log(`Transaction signature: ${signature}`);

    // 8. Check balances after pool initialization
    console.log("\n📊 Balances AFTER Pool Initialization:");
    const balanceTokenUAfter = await getTokenBalance(userTokenU);
    const balanceTokenVAfter = await getTokenBalance(userTokenV);
    const balanceLPAfter = await getTokenBalance(userLP);
    
    console.log(`Token U: ${formatTokenAmount(balanceTokenUAfter)} (${balanceTokenUAfter} raw)`);
    console.log(`Token V: ${formatTokenAmount(balanceTokenVAfter)} (${balanceTokenVAfter} raw)`);
    console.log(`LP Tokens: ${formatTokenAmount(balanceLPAfter)} (${balanceLPAfter} raw)`);

    // 9. Save pool info
    const poolInfo = {
      poolPDA: poolPDA.toString(),
      poolBump,
      tokenU: TOKEN_U_MINT.toString(),
      tokenV: TOKEN_V_MINT.toString(),
      lpMint: LP_MINT.publicKey.toString(),
      vaultU: vaultU.publicKey.toString(),
      vaultV: vaultV.publicKey.toString(),
      userTokenU: userTokenU.toString(),
      userTokenV: userTokenV.toString(),
      userLP: userLP.toString(),
      initialAmountU: amountU,
      initialAmountV: amountV,
      transactionSignature: signature,
    };

    fs.writeFileSync("pool-uv-info.json", JSON.stringify(poolInfo, null, 2));
    console.log("\n💾 Pool U-V info saved to pool-uv-info.json");

  } catch (error) {
    console.error("❌ Error initializing pool U-V:", error);
    throw error;
  }
}

// Run the function
initPoolUV().catch(console.error);
