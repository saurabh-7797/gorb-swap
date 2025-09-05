// 🚀 Step 16: Test Different Swap Ratios with Large Liquidity
// This script tests various swap amounts and ratios to see the impact

const { Connection, PublicKey, Keypair, Transaction, SystemProgram, TransactionInstruction } = require('@solana/web3.js');
const { getAssociatedTokenAddressSync } = require('@solana/spl-token');
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

async function testSwapRatio(connection, swapAmount, swapType, description) {
    console.log(`\n🔄 Testing ${description}`);
    console.log(`Amount: ${formatTokenAmount(swapAmount)} tokens`);
    console.log(`Type: ${swapType}`);

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

    // Check balances before swap
    const balanceXBefore = await getTokenBalance(userTokenX);
    const balanceYBefore = await getTokenBalance(userTokenY);
    const balanceZBefore = await getTokenBalance(userTokenZ);

    let instruction;
    let accounts;

    if (swapType === 'single-xy') {
        // Single swap X to Y
        instruction = new TransactionInstruction({
            keys: [
                { pubkey: POOL_XY_PDA, isSigner: false, isWritable: true },
                { pubkey: TOKEN_X_MINT, isSigner: false, isWritable: false },
                { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false },
                { pubkey: VAULT_XY_X, isSigner: false, isWritable: true },
                { pubkey: VAULT_XY_Y, isSigner: false, isWritable: true },
                { pubkey: userTokenX, isSigner: false, isWritable: true },
                { pubkey: userTokenY, isSigner: false, isWritable: true },
                { pubkey: userKeypair.publicKey, isSigner: true, isWritable: true },
                { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ],
            programId: AMM_PROGRAM_ID,
            data: Buffer.concat([
                Buffer.from([3]), // Swap instruction
                Buffer.from(swapAmount.toString(16).padStart(16, '0'), 'hex'),
                Buffer.from([1]), // directionAToB = true (X to Y)
            ])
        });
    } else if (swapType === 'single-yz') {
        // Single swap Y to Z
        instruction = new TransactionInstruction({
            keys: [
                { pubkey: POOL_YZ_PDA, isSigner: false, isWritable: true },
                { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false },
                { pubkey: TOKEN_Z_MINT, isSigner: false, isWritable: false },
                { pubkey: VAULT_YZ_Y, isSigner: false, isWritable: true },
                { pubkey: VAULT_YZ_Z, isSigner: false, isWritable: true },
                { pubkey: userTokenY, isSigner: false, isWritable: true },
                { pubkey: userTokenZ, isSigner: false, isWritable: true },
                { pubkey: userKeypair.publicKey, isSigner: true, isWritable: true },
                { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ],
            programId: AMM_PROGRAM_ID,
            data: Buffer.concat([
                Buffer.from([3]), // Swap instruction
                Buffer.from(swapAmount.toString(16).padStart(16, '0'), 'hex'),
                Buffer.from([1]), // directionAToB = true (Y to Z)
            ])
        });
    } else if (swapType === 'multihop') {
        // Multihop swap X to Z via Y
        const tokenPath = [TOKEN_X_MINT, TOKEN_Y_MINT, TOKEN_Z_MINT];
        const pathBuffer = Buffer.alloc(1 + (tokenPath.length * 32));
        pathBuffer.writeUInt8(tokenPath.length, 0);
        tokenPath.forEach((token, index) => {
            token.toBuffer().copy(pathBuffer, 1 + (index * 32));
        });

        instruction = new TransactionInstruction({
            keys: [
                { pubkey: POOL_XY_PDA, isSigner: false, isWritable: true },
                { pubkey: POOL_YZ_PDA, isSigner: false, isWritable: true },
                { pubkey: TOKEN_X_MINT, isSigner: false, isWritable: false },
                { pubkey: TOKEN_Y_MINT, isSigner: false, isWritable: false },
                { pubkey: TOKEN_Z_MINT, isSigner: false, isWritable: false },
                { pubkey: VAULT_XY_X, isSigner: false, isWritable: true },
                { pubkey: VAULT_XY_Y, isSigner: false, isWritable: true },
                { pubkey: VAULT_YZ_Y, isSigner: false, isWritable: true },
                { pubkey: VAULT_YZ_Z, isSigner: false, isWritable: true },
                { pubkey: userTokenX, isSigner: false, isWritable: true },
                { pubkey: userTokenY, isSigner: false, isWritable: true },
                { pubkey: userTokenZ, isSigner: false, isWritable: true },
                { pubkey: userKeypair.publicKey, isSigner: true, isWritable: true },
                { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ],
            programId: AMM_PROGRAM_ID,
            data: Buffer.concat([
                Buffer.from([4]), // MultihopSwap instruction
                Buffer.from(swapAmount.toString(16).padStart(16, '0'), 'hex'),
                Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]), // minimumAmountOut = 0
                pathBuffer,
            ])
        });
    }

    try {
        const transaction = new Transaction().add(instruction);
        const signature = await connection.sendTransaction(transaction, [userKeypair], {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        });

        await connection.confirmTransaction(signature, 'confirmed');
        console.log(`✅ ${description} successful!`);
        console.log(`Transaction signature: ${signature}`);

        // Check balances after swap
        const balanceXAfter = await getTokenBalance(userTokenX);
        const balanceYAfter = await getTokenBalance(userTokenY);
        const balanceZAfter = await getTokenBalance(userTokenZ);

        const changeX = balanceXAfter - balanceXBefore;
        const changeY = balanceYAfter - balanceYBefore;
        const changeZ = balanceZAfter - balanceZBefore;

        console.log(`📊 Results:`);
        console.log(`Token X Change: ${formatTokenAmount(changeX)} (${changeX} raw)`);
        console.log(`Token Y Change: ${formatTokenAmount(changeY)} (${changeY} raw)`);
        console.log(`Token Z Change: ${formatTokenAmount(changeZ)} (${changeZ} raw)`);

        if (swapType === 'single-xy') {
            const exchangeRate = Math.abs(changeY / changeX);
            console.log(`Exchange Rate: 1 X = ${exchangeRate.toFixed(6)} Y`);
        } else if (swapType === 'single-yz') {
            const exchangeRate = Math.abs(changeZ / changeY);
            console.log(`Exchange Rate: 1 Y = ${exchangeRate.toFixed(6)} Z`);
        } else if (swapType === 'multihop') {
            const exchangeRate = Math.abs(changeZ / changeX);
            console.log(`Exchange Rate: 1 X = ${exchangeRate.toFixed(6)} Z`);
        }

        return {
            success: true,
            changeX,
            changeY,
            changeZ,
            signature
        };

    } catch (error) {
        console.log(`❌ ${description} failed: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

async function testDifferentRatios() {
    console.log("🚀 Step 16: Testing Different Swap Ratios with Large Liquidity");
    console.log("==============================================================");

    const connection = new Connection(RPC_ENDPOINT, 'confirmed');

    // Test different swap amounts and types
    const testCases = [
        // Small swaps
        { amount: 100_000_000, type: 'single-xy', desc: 'Small Single Swap X→Y (0.1 tokens)' },
        { amount: 100_000_000, type: 'single-yz', desc: 'Small Single Swap Y→Z (0.1 tokens)' },
        { amount: 100_000_000, type: 'multihop', desc: 'Small Multihop Swap X→Y→Z (0.1 tokens)' },
        
        // Medium swaps
        { amount: 1_000_000_000, type: 'single-xy', desc: 'Medium Single Swap X→Y (1.0 tokens)' },
        { amount: 1_000_000_000, type: 'single-yz', desc: 'Medium Single Swap Y→Z (1.0 tokens)' },
        { amount: 1_000_000_000, type: 'multihop', desc: 'Medium Multihop Swap X→Y→Z (1.0 tokens)' },
        
        // Large swaps
        { amount: 5_000_000_000, type: 'single-xy', desc: 'Large Single Swap X→Y (5.0 tokens)' },
        { amount: 5_000_000_000, type: 'single-yz', desc: 'Large Single Swap Y→Z (5.0 tokens)' },
        { amount: 5_000_000_000, type: 'multihop', desc: 'Large Multihop Swap X→Y→Z (5.0 tokens)' },
        
        // Very large swaps
        { amount: 10_000_000_000, type: 'single-xy', desc: 'Very Large Single Swap X→Y (10.0 tokens)' },
        { amount: 10_000_000_000, type: 'single-yz', desc: 'Very Large Single Swap Y→Z (10.0 tokens)' },
        { amount: 10_000_000_000, type: 'multihop', desc: 'Very Large Multihop Swap X→Y→Z (10.0 tokens)' },
    ];

    const results = [];

    for (const testCase of testCases) {
        const result = await testSwapRatio(
            connection, 
            testCase.amount, 
            testCase.type, 
            testCase.desc
        );
        
        results.push({
            ...testCase,
            result
        });

        // Wait a bit between swaps to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Summary
    console.log(`\n📊 TESTING SUMMARY`);
    console.log(`==================`);
    
    const successful = results.filter(r => r.result.success);
    const failed = results.filter(r => !r.result.success);
    
    console.log(`✅ Successful swaps: ${successful.length}`);
    console.log(`❌ Failed swaps: ${failed.length}`);
    
    if (failed.length > 0) {
        console.log(`\n❌ Failed swaps:`);
        failed.forEach(f => {
            console.log(`  - ${f.desc}: ${f.result.error}`);
        });
    }

    console.log(`\n🎯 EXCHANGE RATE ANALYSIS`);
    console.log(`=========================`);
    
    // Analyze exchange rates by swap size
    const smallSwaps = successful.filter(r => r.amount === 100_000_000);
    const mediumSwaps = successful.filter(r => r.amount === 1_000_000_000);
    const largeSwaps = successful.filter(r => r.amount === 5_000_000_000);
    const veryLargeSwaps = successful.filter(r => r.amount === 10_000_000_000);

    console.log(`\nSmall Swaps (0.1 tokens):`);
    smallSwaps.forEach(s => {
        if (s.type === 'single-xy') {
            const rate = Math.abs(s.result.changeY / s.result.changeX);
            console.log(`  X→Y: 1 X = ${rate.toFixed(6)} Y`);
        } else if (s.type === 'single-yz') {
            const rate = Math.abs(s.result.changeZ / s.result.changeY);
            console.log(`  Y→Z: 1 Y = ${rate.toFixed(6)} Z`);
        } else if (s.type === 'multihop') {
            const rate = Math.abs(s.result.changeZ / s.result.changeX);
            console.log(`  X→Z: 1 X = ${rate.toFixed(6)} Z`);
        }
    });

    console.log(`\nMedium Swaps (1.0 tokens):`);
    mediumSwaps.forEach(s => {
        if (s.type === 'single-xy') {
            const rate = Math.abs(s.result.changeY / s.result.changeX);
            console.log(`  X→Y: 1 X = ${rate.toFixed(6)} Y`);
        } else if (s.type === 'single-yz') {
            const rate = Math.abs(s.result.changeZ / s.result.changeY);
            console.log(`  Y→Z: 1 Y = ${rate.toFixed(6)} Z`);
        } else if (s.type === 'multihop') {
            const rate = Math.abs(s.result.changeZ / s.result.changeX);
            console.log(`  X→Z: 1 X = ${rate.toFixed(6)} Z`);
        }
    });

    console.log(`\nLarge Swaps (5.0 tokens):`);
    largeSwaps.forEach(s => {
        if (s.type === 'single-xy') {
            const rate = Math.abs(s.result.changeY / s.result.changeX);
            console.log(`  X→Y: 1 X = ${rate.toFixed(6)} Y`);
        } else if (s.type === 'single-yz') {
            const rate = Math.abs(s.result.changeZ / s.result.changeY);
            console.log(`  Y→Z: 1 Y = ${rate.toFixed(6)} Z`);
        } else if (s.type === 'multihop') {
            const rate = Math.abs(s.result.changeZ / s.result.changeX);
            console.log(`  X→Z: 1 X = ${rate.toFixed(6)} Z`);
        }
    });

    console.log(`\nVery Large Swaps (10.0 tokens):`);
    veryLargeSwaps.forEach(s => {
        if (s.type === 'single-xy') {
            const rate = Math.abs(s.result.changeY / s.result.changeX);
            console.log(`  X→Y: 1 X = ${rate.toFixed(6)} Y`);
        } else if (s.type === 'single-yz') {
            const rate = Math.abs(s.result.changeZ / s.result.changeY);
            console.log(`  Y→Z: 1 Y = ${rate.toFixed(6)} Z`);
        } else if (s.type === 'multihop') {
            const rate = Math.abs(s.result.changeZ / s.result.changeX);
            console.log(`  X→Z: 1 X = ${rate.toFixed(6)} Z`);
        }
    });

    // Save results
    fs.writeFileSync('swap-ratio-test-results.json', JSON.stringify(results, null, 2));
    console.log(`\n💾 Test results saved to swap-ratio-test-results.json`);
    
    console.log(`\n🎉 Different Ratio Testing Completed!`);
    console.log(`✅ Tested ${testCases.length} different swap scenarios`);
    console.log(`✅ Analyzed exchange rates across different swap sizes`);
    console.log(`✅ Demonstrated impact of large liquidity on swap outcomes`);
}

// Run the ratio testing
testDifferentRatios().catch(console.error);
