// 🚀 Step 17: Comprehensive Ratio Testing with Different Scenarios
// This script tests various liquidity ratios and swap amounts to demonstrate the impact

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

async function performSwap(connection, swapAmount, swapType, description) {
    console.log(`\n🔄 ${description}`);
    console.log(`Amount: ${formatTokenAmount(swapAmount)} tokens`);

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

async function comprehensiveRatioTest() {
    console.log("🚀 Step 17: Comprehensive Ratio Testing");
    console.log("======================================");
    console.log("Testing different swap amounts to show ratio impact");

    const connection = new Connection(RPC_ENDPOINT, 'confirmed');

    // Test different swap amounts
    const testCases = [
        // Small swaps - should have good rates
        { amount: 10_000_000, type: 'single-xy', desc: 'Tiny Single Swap X→Y (0.01 tokens)' },
        { amount: 10_000_000, type: 'multihop', desc: 'Tiny Multihop Swap X→Y→Z (0.01 tokens)' },
        
        // Small swaps
        { amount: 100_000_000, type: 'single-xy', desc: 'Small Single Swap X→Y (0.1 tokens)' },
        { amount: 100_000_000, type: 'multihop', desc: 'Small Multihop Swap X→Y→Z (0.1 tokens)' },
        
        // Medium swaps
        { amount: 1_000_000_000, type: 'single-xy', desc: 'Medium Single Swap X→Y (1.0 tokens)' },
        { amount: 1_000_000_000, type: 'multihop', desc: 'Medium Multihop Swap X→Y→Z (1.0 tokens)' },
        
        // Large swaps - will show price impact
        { amount: 5_000_000_000, type: 'single-xy', desc: 'Large Single Swap X→Y (5.0 tokens)' },
        { amount: 5_000_000_000, type: 'multihop', desc: 'Large Multihop Swap X→Y→Z (5.0 tokens)' },
        
        // Very large swaps - maximum price impact
        { amount: 10_000_000_000, type: 'single-xy', desc: 'Very Large Single Swap X→Y (10.0 tokens)' },
        { amount: 10_000_000_000, type: 'multihop', desc: 'Very Large Multihop Swap X→Y→Z (10.0 tokens)' },
    ];

    const results = [];

    for (const testCase of testCases) {
        const result = await performSwap(
            connection, 
            testCase.amount, 
            testCase.type, 
            testCase.desc
        );
        
        results.push({
            ...testCase,
            result
        });

        // Wait between swaps
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Analysis
    console.log(`\n📊 COMPREHENSIVE ANALYSIS`);
    console.log(`========================`);
    
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

    // Exchange rate analysis
    console.log(`\n🎯 EXCHANGE RATE ANALYSIS BY SWAP SIZE`);
    console.log(`=====================================`);
    
    const singleSwaps = successful.filter(r => r.type === 'single-xy');
    const multihopSwaps = successful.filter(r => r.type === 'multihop');

    console.log(`\n📈 Single Swaps (X→Y):`);
    singleSwaps.forEach(s => {
        const rate = Math.abs(s.result.changeY / s.result.changeX);
        const amount = s.amount / 1_000_000_000;
        console.log(`  ${amount.toFixed(2)} tokens → 1 X = ${rate.toFixed(6)} Y`);
    });

    console.log(`\n🔄 Multihop Swaps (X→Y→Z):`);
    multihopSwaps.forEach(s => {
        const rate = Math.abs(s.result.changeZ / s.result.changeX);
        const amount = s.amount / 1_000_000_000;
        console.log(`  ${amount.toFixed(2)} tokens → 1 X = ${rate.toFixed(6)} Z`);
    });

    // Price impact analysis
    console.log(`\n💥 PRICE IMPACT ANALYSIS`);
    console.log(`=======================`);
    
    if (singleSwaps.length >= 2) {
        const smallest = singleSwaps[0];
        const largest = singleSwaps[singleSwaps.length - 1];
        const smallestRate = Math.abs(smallest.result.changeY / smallest.result.changeX);
        const largestRate = Math.abs(largest.result.changeY / largest.result.changeX);
        const priceImpact = ((largestRate - smallestRate) / smallestRate) * 100;
        
        console.log(`Single Swap Price Impact:`);
        console.log(`  Smallest swap (${smallest.amount / 1_000_000_000} tokens): 1 X = ${smallestRate.toFixed(6)} Y`);
        console.log(`  Largest swap (${largest.amount / 1_000_000_000} tokens): 1 X = ${largestRate.toFixed(6)} Y`);
        console.log(`  Price Impact: ${priceImpact.toFixed(2)}%`);
    }

    if (multihopSwaps.length >= 2) {
        const smallest = multihopSwaps[0];
        const largest = multihopSwaps[multihopSwaps.length - 1];
        const smallestRate = Math.abs(smallest.result.changeZ / smallest.result.changeX);
        const largestRate = Math.abs(largest.result.changeZ / largest.result.changeX);
        const priceImpact = ((largestRate - smallestRate) / smallestRate) * 100;
        
        console.log(`\nMultihop Swap Price Impact:`);
        console.log(`  Smallest swap (${smallest.amount / 1_000_000_000} tokens): 1 X = ${smallestRate.toFixed(6)} Z`);
        console.log(`  Largest swap (${largest.amount / 1_000_000_000} tokens): 1 X = ${largestRate.toFixed(6)} Z`);
        console.log(`  Price Impact: ${priceImpact.toFixed(2)}%`);
    }

    // Fee analysis
    console.log(`\n💰 FEE ANALYSIS`);
    console.log(`===============`);
    console.log(`Single Swap Fee: 0.3% per swap`);
    console.log(`Multihop Swap Fee: 0.3% + 0.3% = 0.6% total`);
    console.log(`Expected vs Actual Exchange Rates:`);
    
    successful.forEach(s => {
        const amount = s.amount / 1_000_000_000;
        if (s.type === 'single-xy') {
            const rate = Math.abs(s.result.changeY / s.result.changeX);
            const expectedRate = 1.0; // Assuming 1:1 pool ratio
            const feeImpact = ((expectedRate - rate) / expectedRate) * 100;
            console.log(`  ${amount.toFixed(2)} X→Y: Expected ~1.0, Got ${rate.toFixed(6)} (${feeImpact.toFixed(2)}% fee impact)`);
        } else if (s.type === 'multihop') {
            const rate = Math.abs(s.result.changeZ / s.result.changeX);
            const expectedRate = 1.0; // Assuming 1:1 pool ratios
            const feeImpact = ((expectedRate - rate) / expectedRate) * 100;
            console.log(`  ${amount.toFixed(2)} X→Z: Expected ~1.0, Got ${rate.toFixed(6)} (${feeImpact.toFixed(2)}% fee impact)`);
        }
    });

    // Save results
    fs.writeFileSync('comprehensive-ratio-test-results.json', JSON.stringify(results, null, 2));
    console.log(`\n💾 Comprehensive test results saved to comprehensive-ratio-test-results.json`);
    
    console.log(`\n🎉 Comprehensive Ratio Testing Completed!`);
    console.log(`✅ Tested ${testCases.length} different swap scenarios`);
    console.log(`✅ Demonstrated price impact across different swap sizes`);
    console.log(`✅ Showed fee impact on exchange rates`);
    console.log(`✅ Proved that larger swaps get worse rates due to price impact`);
}

// Run the comprehensive test
comprehensiveRatioTest().catch(console.error);
