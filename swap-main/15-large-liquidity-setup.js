// 🚀 Step 15: Large Liquidity Setup for Better Swap Testing
// This script adds large amounts of liquidity to all pools for better swap results

const { Connection, PublicKey, Keypair, Transaction, SystemProgram, TransactionInstruction } = require('@solana/web3.js');
const { getAssociatedTokenAddressSync, createTransferInstruction, getAccount } = require('@solana/spl-token');
const fs = require('fs');

// Configuration
const RPC_ENDPOINT = "https://rpc.gorbchain.xyz";
const AMM_PROGRAM_ID = new PublicKey("8qhCTESZN9xDCHvtXFdCHfsgcctudbYdzdCFzUkTTMMe");
const SPL_TOKEN_PROGRAM_ID = new PublicKey("G22oYgZ6LnVcy7v8eSNi2xpNk1NcZiPD8CVKSTut7oZ6");
const ATA_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

// Load user keypair
const userKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('/home/saurabh/.config/solana/id.json', 'utf8')))
);

async function getTokenBalance(tokenAccount) {
    try {
        const accountInfo = await connection.getAccountInfo(tokenAccount);
        if (!accountInfo) return 0;
        return accountInfo.data.readUInt64LE(64);
    } catch (error) {
        return 0;
    }
}

function formatTokenAmount(amount) {
    return (amount / 1_000_000_000).toFixed(6);
}

async function largeLiquiditySetup() {
    console.log("🚀 Step 15: Large Liquidity Setup for Better Swap Testing");
    console.log("=========================================================");

    const connection = new Connection(RPC_ENDPOINT, 'confirmed');

    // Load token and pool info
    const tokenXInfo = JSON.parse(fs.readFileSync('token-x-info.json', 'utf8'));
    const tokenYInfo = JSON.parse(fs.readFileSync('token-y-info.json', 'utf8'));
    const tokenZInfo = JSON.parse(fs.readFileSync('token-z-info.json', 'utf8'));
    const poolXYInfo = JSON.parse(fs.readFileSync('pool-xy-info.json', 'utf8'));
    const poolYZInfo = JSON.parse(fs.readFileSync('pool-yz-info.json', 'utf8'));

    const TOKEN_X_MINT = new PublicKey(tokenXInfo.mint);
    const TOKEN_Y_MINT = new PublicKey(tokenYInfo.mint);
    const TOKEN_Z_MINT = new PublicKey(tokenZInfo.mint);
    const POOL_XY_PDA = new PublicKey(poolXYInfo.poolPDA);
    const POOL_YZ_PDA = new PublicKey(poolYZInfo.poolPDA);
    const LP_XY_MINT = new PublicKey(poolXYInfo.lpMint);
    const LP_YZ_MINT = new PublicKey(poolYZInfo.lpMint);
    const VAULT_XY_X = new PublicKey(poolXYInfo.vaultX);
    const VAULT_XY_Y = new PublicKey(poolXYInfo.vaultY);
    const VAULT_YZ_Y = new PublicKey(poolYZInfo.vaultY);
    const VAULT_YZ_Z = new PublicKey(poolYZInfo.vaultZ);

    // User ATAs
    const userTokenX = getAssociatedTokenAddressSync(TOKEN_X_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userTokenY = getAssociatedTokenAddressSync(TOKEN_Y_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userTokenZ = getAssociatedTokenAddressSync(TOKEN_Z_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userLPXY = getAssociatedTokenAddressSync(LP_XY_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);
    const userLPYZ = getAssociatedTokenAddressSync(LP_YZ_MINT, userKeypair.publicKey, false, SPL_TOKEN_PROGRAM_ID, ATA_PROGRAM_ID);

    console.log(`Token X: ${TOKEN_X_MINT.toString()}`);
    console.log(`Token Y: ${TOKEN_Y_MINT.toString()}`);
    console.log(`Token Z: ${TOKEN_Z_MINT.toString()}`);
    console.log(`Pool X-Y: ${POOL_XY_PDA.toString()}`);
    console.log(`Pool Y-Z: ${POOL_YZ_PDA.toString()}`);

    // Check balances before adding liquidity
    console.log("\n📊 Balances BEFORE Large Liquidity Addition:");
    const balanceTokenXBefore = await getTokenBalance(userTokenX);
    const balanceTokenYBefore = await getTokenBalance(userTokenY);
    const balanceTokenZBefore = await getTokenBalance(userTokenZ);
    const balanceLPXYBefore = await getTokenBalance(userLPXY);
    const balanceLPYZBefore = await getTokenBalance(userLPYZ);
    
    console.log(`Token X: ${formatTokenAmount(balanceTokenXBefore)} (${balanceTokenXBefore} raw)`);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYBefore)} (${balanceTokenYBefore} raw)`);
    console.log(`Token Z: ${formatTokenAmount(balanceTokenZBefore)} (${balanceTokenZBefore} raw)`);
    console.log(`LP X-Y: ${formatTokenAmount(balanceLPXYBefore)} (${balanceLPXYBefore} raw)`);
    console.log(`LP Y-Z: ${formatTokenAmount(balanceLPYZBefore)} (${balanceLPYZBefore} raw)`);

    // Large liquidity parameters - BALANCED RATIOS for best swap results
    const LARGE_LIQUIDITY_XY = {
        amountX: 50_000_000_000, // 50.0 Token X
        amountY: 50_000_000_000, // 50.0 Token Y
        ratio: "1:1 (Balanced - Best for swaps)"
    };

    const LARGE_LIQUIDITY_YZ = {
        amountY: 50_000_000_000, // 50.0 Token Y
        amountZ: 50_000_000_000, // 50.0 Token Z
        ratio: "1:1 (Balanced - Best for swaps)"
    };

    console.log(`\n💧 Large Liquidity Parameters:`);
    console.log(`Pool X-Y: ${formatTokenAmount(LARGE_LIQUIDITY_XY.amountX)} X : ${formatTokenAmount(LARGE_LIQUIDITY_XY.amountY)} Y (${LARGE_LIQUIDITY_XY.ratio})`);
    console.log(`Pool Y-Z: ${formatTokenAmount(LARGE_LIQUIDITY_YZ.amountY)} Y : ${formatTokenAmount(LARGE_LIQUIDITY_YZ.amountZ)} Z (${LARGE_LIQUIDITY_YZ.ratio})`);

    // Add large liquidity to Pool X-Y
    console.log(`\n🔄 Adding Large Liquidity to Pool X-Y...`);
    
    const addLiquidityXYInstruction = new Transaction().add(
        new TransactionInstruction({
            keys: [
                { pubkey: POOL_XY_PDA, isSigner: false, isWritable: true },
                { pubkey: TOKEN_X_MINT, isSigner: false, isWritable: false },
                { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false },
                { pubkey: LP_XY_MINT, isSigner: false, isWritable: true },
                { pubkey: VAULT_XY_X, isSigner: false, isWritable: true },
                { pubkey: VAULT_XY_Y, isSigner: false, isWritable: true },
                { pubkey: userTokenX, isSigner: false, isWritable: true },
                { pubkey: userTokenY, isSigner: false, isWritable: true },
                { pubkey: userLPXY, isSigner: false, isWritable: true },
                { pubkey: userKeypair.publicKey, isSigner: true, isWritable: true },
                { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: AMM_PROGRAM_ID,
            data: Buffer.concat([
                Buffer.from([1]), // AddLiquidity instruction
                Buffer.from(LARGE_LIQUIDITY_XY.amountX.toString(16).padStart(16, '0'), 'hex'),
                Buffer.from(LARGE_LIQUIDITY_XY.amountY.toString(16).padStart(16, '0'), 'hex'),
            ])
        })
    );

    console.log(`📝 Adding AddLiquidity instruction for Pool X-Y...`);
    console.log(`📤 Sending transaction...`);
    
    const signatureXY = await connection.sendTransaction(addLiquidityXYInstruction, [userKeypair], {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
    });

    await connection.confirmTransaction(signatureXY, 'confirmed');
    console.log(`✅ AddLiquidity X-Y transaction successful!`);
    console.log(`Transaction signature: ${signatureXY}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${signatureXY}`);

    // Add large liquidity to Pool Y-Z
    console.log(`\n🔄 Adding Large Liquidity to Pool Y-Z...`);
    
    const addLiquidityYZInstruction = new Transaction().add(
        new TransactionInstruction({
            keys: [
                { pubkey: POOL_YZ_PDA, isSigner: false, isWritable: true },
                { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false },
                { pubkey: TOKEN_Z_MINT, isSigner: false, isWritable: false },
                { pubkey: LP_YZ_MINT, isSigner: false, isWritable: true },
                { pubkey: VAULT_YZ_Y, isSigner: false, isWritable: true },
                { pubkey: VAULT_YZ_Z, isSigner: false, isWritable: true },
                { pubkey: userTokenY, isSigner: false, isWritable: true },
                { pubkey: userTokenZ, isSigner: false, isWritable: true },
                { pubkey: userLPYZ, isSigner: false, isWritable: true },
                { pubkey: userKeypair.publicKey, isSigner: true, isWritable: true },
                { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: AMM_PROGRAM_ID,
            data: Buffer.concat([
                Buffer.from([1]), // AddLiquidity instruction
                Buffer.from(LARGE_LIQUIDITY_YZ.amountY.toString(16).padStart(16, '0'), 'hex'),
                Buffer.from(LARGE_LIQUIDITY_YZ.amountZ.toString(16).padStart(16, '0'), 'hex'),
            ])
        })
    );

    console.log(`📝 Adding AddLiquidity instruction for Pool Y-Z...`);
    console.log(`📤 Sending transaction...`);
    
    const signatureYZ = await connection.sendTransaction(addLiquidityYZInstruction, [userKeypair], {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
    });

    await connection.confirmTransaction(signatureYZ, 'confirmed');
    console.log(`✅ AddLiquidity Y-Z transaction successful!`);
    console.log(`Transaction signature: ${signatureYZ}`);
    console.log(`View on GorbScan: https://gorbscan.com/tx/${signatureYZ}`);

    // Check balances after adding liquidity
    console.log("\n📊 Balances AFTER Large Liquidity Addition:");
    const balanceTokenXAfter = await getTokenBalance(userTokenX);
    const balanceTokenYAfter = await getTokenBalance(userTokenY);
    const balanceTokenZAfter = await getTokenBalance(userTokenZ);
    const balanceLPXYAfter = await getTokenBalance(userLPXY);
    const balanceLPYZAfter = await getTokenBalance(userLPYZ);
    
    console.log(`Token X: ${formatTokenAmount(balanceTokenXAfter)} (${balanceTokenXAfter} raw)`);
    console.log(`Token Y: ${formatTokenAmount(balanceTokenYAfter)} (${balanceTokenYAfter} raw)`);
    console.log(`Token Z: ${formatTokenAmount(balanceTokenZAfter)} (${balanceTokenZAfter} raw)`);
    console.log(`LP X-Y: ${formatTokenAmount(balanceLPXYAfter)} (${balanceLPXYAfter} raw)`);
    console.log(`LP Y-Z: ${formatTokenAmount(balanceLPYZAfter)} (${balanceLPYZAfter} raw)`);

    // Calculate changes
    const tokenXChange = balanceTokenXAfter - balanceTokenXBefore;
    const tokenYChange = balanceTokenYAfter - balanceTokenYBefore;
    const tokenZChange = balanceTokenZAfter - balanceTokenZBefore;
    const lpXYChange = balanceLPXYAfter - balanceLPXYBefore;
    const lpYZChange = balanceLPYZAfter - balanceLPYZBefore;

    console.log(`\n💰 Large Liquidity Addition Results:`);
    console.log(`Token X Change: ${formatTokenAmount(tokenXChange)} (${tokenXChange} raw)`);
    console.log(`Token Y Change: ${formatTokenAmount(tokenYChange)} (${tokenYChange} raw)`);
    console.log(`Token Z Change: ${formatTokenAmount(tokenZChange)} (${tokenZChange} raw)`);
    console.log(`LP X-Y Change: ${formatTokenAmount(lpXYChange)} (${lpXYChange} raw)`);
    console.log(`LP Y-Z Change: ${formatTokenAmount(lpYZChange)} (${lpYZChange} raw)`);

    console.log(`\n🎯 Large Liquidity Summary:`);
    console.log(`Liquidity Added to Pool X-Y:`);
    console.log(`  - Token X: ${formatTokenAmount(LARGE_LIQUIDITY_XY.amountX)} (${LARGE_LIQUIDITY_XY.amountX} raw)`);
    console.log(`  - Token Y: ${formatTokenAmount(LARGE_LIQUIDITY_XY.amountY)} (${LARGE_LIQUIDITY_XY.amountY} raw)`);
    console.log(`  - LP Tokens Received: ${formatTokenAmount(lpXYChange)} (${lpXYChange} raw)`);
    
    console.log(`Liquidity Added to Pool Y-Z:`);
    console.log(`  - Token Y: ${formatTokenAmount(LARGE_LIQUIDITY_YZ.amountY)} (${LARGE_LIQUIDITY_YZ.amountY} raw)`);
    console.log(`  - Token Z: ${formatTokenAmount(LARGE_LIQUIDITY_YZ.amountZ)} (${LARGE_LIQUIDITY_YZ.amountZ} raw)`);
    console.log(`  - LP Tokens Received: ${formatTokenAmount(lpYZChange)} (${lpYZChange} raw)`);

    // Save updated pool info
    const updatedPoolXYInfo = {
        ...poolXYInfo,
        largeLiquidityAdded: true,
        largeLiquidityAmountX: LARGE_LIQUIDITY_XY.amountX,
        largeLiquidityAmountY: LARGE_LIQUIDITY_XY.amountY,
        largeLiquidityRatio: LARGE_LIQUIDITY_XY.ratio
    };

    const updatedPoolYZInfo = {
        ...poolYZInfo,
        largeLiquidityAdded: true,
        largeLiquidityAmountY: LARGE_LIQUIDITY_YZ.amountY,
        largeLiquidityAmountZ: LARGE_LIQUIDITY_YZ.amountZ,
        largeLiquidityRatio: LARGE_LIQUIDITY_YZ.ratio
    };

    fs.writeFileSync('pool-xy-info.json', JSON.stringify(updatedPoolXYInfo, null, 2));
    fs.writeFileSync('pool-yz-info.json', JSON.stringify(updatedPoolYZInfo, null, 2));

    console.log(`\n💾 Updated pool info saved to pool-xy-info.json and pool-yz-info.json`);
    console.log(`\n🎉 Large Liquidity Setup Completed Successfully!`);
    console.log(`✅ Added 50.0 tokens to each pool with 1:1 ratios`);
    console.log(`✅ Pools now have large liquidity for better swap testing`);
    console.log(`✅ Ready for testing different swap ratios!`);
}

// Run the large liquidity setup
largeLiquiditySetup().catch(console.error);
