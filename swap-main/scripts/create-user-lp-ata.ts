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

const USER_KEYPAIR_PATH = "/home/saurabh/.config/solana/id.json";
const userKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(USER_KEYPAIR_PATH, "utf-8")))
);

const connection = new Connection(RPC_ENDPOINT, {
  commitment: "confirmed",
  wsEndpoint: WS_ENDPOINT,
});

// Program ID (deployed program)
const PROGRAM_ID = new PublicKey("aBfrRgukSYDMgdyQ8y1XNEk4w5u7Ugtz5fPHFnkStJX");

// Load token info
const tokenYInfo = JSON.parse(fs.readFileSync("token-y-info.json", "utf-8"));
const wrappedSOLInfo = JSON.parse(fs.readFileSync("custom-wrapped-sol-info.json", "utf-8"));

const TOKEN_Y_MINT = new PublicKey(tokenYInfo.mint);
const WRAPPED_SOL_MINT = new PublicKey(wrappedSOLInfo.mint);

// Helper function to derive PDA
function derivePDA(seeds: (Buffer | Uint8Array)[], programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

/**
 * Create User LP ATA for the pool
 */
async function createUserLPATA() {
  try {
    console.log("🚀 Creating User LP ATA for Pool");

    // 1. Derive pool PDA
    const [poolPDA] = derivePDA(
      [Buffer.from("pool"), TOKEN_Y_MINT.toBuffer(), WRAPPED_SOL_MINT.toBuffer()],
      PROGRAM_ID
    );
    console.log(`Pool PDA: ${poolPDA.toString()}`);

    // 2. Derive LP mint PDA
    const [lpMint] = derivePDA(
      [Buffer.from("mint"), poolPDA.toBuffer()],
      PROGRAM_ID
    );
    console.log(`LP Mint: ${lpMint.toString()}`);

    // 3. Get user LP ATA
    const userLPATA = getAssociatedTokenAddressSync(
      lpMint,
      userKeypair.publicKey,
      false,
      SPL_TOKEN_PROGRAM_ID,
      ATA_PROGRAM_ID
    );
    console.log(`User LP ATA: ${userLPATA.toString()}`);

    // 4. Check if ATA already exists
    try {
      await getAccount(connection, userLPATA, "confirmed", SPL_TOKEN_PROGRAM_ID);
      console.log("✅ User LP ATA already exists!");
      return userLPATA;
    } catch (error) {
      console.log("📝 Creating User LP ATA...");
    }

    // 5. Create ATA
    const transaction = new Transaction();
    transaction.add(
      createAssociatedTokenAccountInstruction(
        userKeypair.publicKey, // payer
        userLPATA, // ata
        userKeypair.publicKey, // owner
        lpMint, // mint
        SPL_TOKEN_PROGRAM_ID,
        ATA_PROGRAM_ID
      )
    );

    // 6. Send transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [userKeypair],
      {
        commitment: "confirmed",
        preflightCommitment: "confirmed",
      }
    );

    console.log(`✅ User LP ATA created successfully!`);
    console.log(`Transaction signature: ${signature}`);

    return userLPATA;

  } catch (error) {
    console.error("❌ Error creating User LP ATA:", error);
    throw error;
  }
}

// Run the function
createUserLPATA().catch(console.error);

