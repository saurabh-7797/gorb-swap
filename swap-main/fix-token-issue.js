// 🔧 Fix Token Issue - Create Tokens for Correct User Address
const { Connection, PublicKey, Keypair, Transaction, SystemProgram, TransactionInstruction } = require('@solana/web3.js');
const { getAssociatedTokenAddressSync, createInitializeMintInstruction, createMintToInstruction, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, MINT_SIZE, getMinimumBalanceForRentExemptMint } = require('@solana/spl-token');
const fs = require('fs');

// Configuration
const RPC_ENDPOINT = "https://rpc.gorbchain.xyz";
const SPL_TOKEN_PROGRAM_ID = new PublicKey("G22oYgZ6LnVcy7v8eSNi2xpNk1NcZiPD8CVKSTut7oZ6");
const ATA_PROGRAM_ID = new PublicKey("GoATGVNeSXerFerPqTJ8hcED1msPWHHLxao2vwBYqowm");

// User's actual public key
const USER_PUBLIC_KEY = new PublicKey("GiGADPr1aThAUJDGnRS6KU9P5SbJ23E9qMUqWoXP1vGJ");

// Load user keypair
const userKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('/home/saurabh/.config/solana/id.json', 'utf8')))
);

async function createTokenForUser(tokenName, tokenSymbol) {
    console.log(`\n🚀 Creating ${tokenName} for user...`);
    
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    
    // Generate new mint keypair
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;
    
    console.log(`${tokenName} Mint: ${mint.toString()}`);
    
    // Get user's ATA
    const userATA = getAssociatedTokenAddressSync(mint, USER_PUBLIC_KEY, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    console.log(`User ${tokenName} ATA: ${userATA.toString()}`);
    
    // Create mint account
    const mintAccountIx = SystemProgram.createAccount({
        fromPubkey: userKeypair.publicKey,
        newAccountPubkey: mint,
        space: MINT_SIZE,
        lamports: await getMinimumBalanceForRentExemptMint(connection),
        programId: SPL_TOKEN_PROGRAM_ID,
    });
    
    // Initialize mint
    const initMintIx = createInitializeMintInstruction(
        mint,
        9, // decimals
        userKeypair.publicKey, // mint authority
        userKeypair.publicKey  // freeze authority
    );
    
    // Create user's ATA
    const createATAIx = createAssociatedTokenAccountInstruction(
        userKeypair.publicKey, // payer
        userATA, // ata
        USER_PUBLIC_KEY, // owner
        mint // mint
    );
    
    // Mint tokens to user
    const mintToIx = createMintToInstruction(
        mint,
        userATA,
        userKeypair.publicKey,
        1000000 * 1_000_000_000 // 1,000,000 tokens
    );
    
    // Create and send transaction
    const transaction = new Transaction()
        .add(mintAccountIx)
        .add(initMintIx)
        .add(createATAIx)
        .add(mintToIx);
    
    console.log(`📝 Creating ${tokenName} mint account...`);
    console.log(`📝 Initializing ${tokenName} mint...`);
    console.log(`📝 Creating user ${tokenName} ATA...`);
    console.log(`📝 Minting ${tokenName} to user...`);
    console.log(`📤 Sending transaction...`);
    
    const signature = await connection.sendTransaction(transaction, [userKeypair, mintKeypair], {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
    });
    
    await connection.confirmTransaction(signature, 'confirmed');
    console.log(`✅ ${tokenName} created successfully!`);
    console.log(`Transaction signature: ${signature}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${signature}`);
    
    // Save token info
    const tokenInfo = {
        mint: mint.toString(),
        userATA: userATA.toString(),
        initialSupply: 1000000,
        decimals: 9
    };
    
    fs.writeFileSync(`token-${tokenSymbol.toLowerCase()}-info.json`, JSON.stringify(tokenInfo, null, 2));
    console.log(`💾 ${tokenName} info saved to token-${tokenSymbol.toLowerCase()}-info.json`);
    
    return tokenInfo;
}

async function fixTokenIssue() {
    console.log("🔧 Fixing Token Issue - Creating Tokens for Correct User");
    console.log("=======================================================");
    console.log(`User Address: ${USER_PUBLIC_KEY.toString()}`);
    console.log(`User Keypair Address: ${userKeypair.publicKey.toString()}`);
    
    // Check if addresses match
    if (!userKeypair.publicKey.equals(USER_PUBLIC_KEY)) {
        console.log(`❌ ERROR: Keypair address doesn't match user address!`);
        console.log(`Keypair: ${userKeypair.publicKey.toString()}`);
        console.log(`User: ${USER_PUBLIC_KEY.toString()}`);
        console.log(`💡 SOLUTION: Use the correct keypair or update the user address`);
        return;
    }
    
    console.log(`✅ Addresses match - proceeding with token creation`);
    
    try {
        // Create Token X
        const tokenXInfo = await createTokenForUser("Token X", "X");
        
        // Wait a bit between transactions
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Create Token Y
        const tokenYInfo = await createTokenForUser("Token Y", "Y");
        
        // Wait a bit between transactions
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Create Token Z
        const tokenZInfo = await createTokenForUser("Token Z", "Z");
        
        console.log(`\n🎉 All Tokens Created Successfully!`);
        console.log(`=====================================`);
        console.log(`Token X: ${tokenXInfo.mint}`);
        console.log(`Token Y: ${tokenYInfo.mint}`);
        console.log(`Token Z: ${tokenZInfo.mint}`);
        console.log(`\n✅ User now has 1,000,000 of each token`);
        console.log(`✅ Token accounts (ATAs) created`);
        console.log(`✅ Ready for swap testing!`);
        
        console.log(`\n📝 Next Steps:`);
        console.log(`1. Run: node 4-init-pool-xy.js (with new token addresses)`);
        console.log(`2. Run: node 5-init-pool-yz.js (with new token addresses)`);
        console.log(`3. Run: node 6-add-liquidity-xy.js`);
        console.log(`4. Run: node 7-add-liquidity-yz.js`);
        console.log(`5. Run: node 8-test-multihop-xyz.js`);
        
    } catch (error) {
        console.log(`❌ Error creating tokens: ${error.message}`);
        console.log(`💡 Check your SOL balance and network connection`);
    }
}

// Run the fix
fixTokenIssue().catch(console.error);
