e // 🚀 Step 18: Ratio Impact Demonstration
// This script demonstrates how different liquidity ratios affect swap outcomes

console.log("🚀 Step 18: Ratio Impact Demonstration");
console.log("=====================================");
console.log("Demonstrating how different liquidity ratios affect swap outcomes");

// AMM Formula: (amountIn * reserveOut) / (reserveIn + amountIn)
// With 0.3% fee: amountIn * 0.997

function calculateSwapOutput(amountIn, reserveIn, reserveOut, feeRate = 0.003) {
    const amountInAfterFee = amountIn * (1 - feeRate);
    return (amountInAfterFee * reserveOut) / (reserveIn + amountInAfterFee);
}

function formatAmount(amount) {
    return (amount / 1_000_000_000).toFixed(6);
}

// Different pool scenarios
const poolScenarios = [
    {
        name: "Balanced Pool (1:1)",
        reserveX: 1000_000_000_000, // 1000 tokens
        reserveY: 1000_000_000_000, // 1000 tokens
        ratio: "1:1",
        description: "Equal reserves - best for swaps"
    },
    {
        name: "Slightly Unbalanced (1:2)",
        reserveX: 1000_000_000_000, // 1000 tokens
        reserveY: 2000_000_000_000, // 2000 tokens
        ratio: "1:2",
        description: "Y is 2x more valuable - X→Y gets less"
    },
    {
        name: "Moderately Unbalanced (1:5)",
        reserveX: 1000_000_000_000, // 1000 tokens
        reserveY: 5000_000_000_000, // 5000 tokens
        ratio: "1:5",
        description: "Y is 5x more valuable - X→Y gets much less"
    },
    {
        name: "Highly Unbalanced (1:10)",
        reserveX: 1000_000_000_000, // 1000 tokens
        reserveY: 10000_000_000_000, // 10000 tokens
        ratio: "1:10",
        description: "Y is 10x more valuable - X→Y gets very little"
    },
    {
        name: "Extremely Unbalanced (1:100)",
        reserveX: 1000_000_000_000, // 1000 tokens
        reserveY: 100000_000_000_000, // 100000 tokens
        ratio: "1:100",
        description: "Y is 100x more valuable - X→Y gets almost nothing"
    }
];

// Test different swap amounts
const swapAmounts = [
    { amount: 10_000_000, name: "Tiny (0.01 tokens)" },
    { amount: 100_000_000, name: "Small (0.1 tokens)" },
    { amount: 1_000_000_000, name: "Medium (1.0 tokens)" },
    { amount: 10_000_000_000, name: "Large (10.0 tokens)" },
    { amount: 100_000_000_000, name: "Very Large (100.0 tokens)" }
];

console.log("\n🎯 SWAP IMPACT ANALYSIS");
console.log("=======================");

poolScenarios.forEach((pool, poolIndex) => {
    console.log(`\n${poolIndex + 1}. ${pool.name}`);
    console.log(`   Reserves: ${formatAmount(pool.reserveX)} X : ${formatAmount(pool.reserveY)} Y (${pool.ratio})`);
    console.log(`   Description: ${pool.description}`);
    
    console.log(`   Swap Results (X→Y):`);
    
    swapAmounts.forEach(swap => {
        const output = calculateSwapOutput(swap.amount, pool.reserveX, pool.reserveY);
        const exchangeRate = output / swap.amount;
        const priceImpact = ((1.0 - exchangeRate) / 1.0) * 100;
        
        console.log(`     ${swap.name}: ${formatAmount(swap.amount)} X → ${formatAmount(output)} Y`);
        console.log(`       Exchange Rate: 1 X = ${exchangeRate.toFixed(6)} Y`);
        console.log(`       Price Impact: ${priceImpact.toFixed(2)}%`);
    });
});

// Multihop analysis
console.log(`\n🔄 MULTIHOP SWAP ANALYSIS`);
console.log(`=========================`);

const multihopScenarios = [
    {
        name: "Balanced Multihop (1:1:1)",
        poolXY: { reserveX: 1000_000_000_000, reserveY: 1000_000_000_000 },
        poolYZ: { reserveY: 1000_000_000_000, reserveZ: 1000_000_000_000 },
        description: "All pools balanced - best multihop rates"
    },
    {
        name: "Unbalanced Multihop (1:2:1)",
        poolXY: { reserveX: 1000_000_000_000, reserveY: 2000_000_000_000 },
        poolYZ: { reserveY: 2000_000_000_000, reserveZ: 1000_000_000_000 },
        description: "X-Y unbalanced, Y-Z balanced"
    },
    {
        name: "Double Unbalanced (1:2:4)",
        poolXY: { reserveX: 1000_000_000_000, reserveY: 2000_000_000_000 },
        poolYZ: { reserveY: 2000_000_000_000, reserveZ: 8000_000_000_000 },
        description: "Both pools unbalanced - worst multihop rates"
    }
];

multihopScenarios.forEach((scenario, index) => {
    console.log(`\n${index + 1}. ${scenario.name}`);
    console.log(`   Pool X-Y: ${formatAmount(scenario.poolXY.reserveX)} X : ${formatAmount(scenario.poolXY.reserveY)} Y`);
    console.log(`   Pool Y-Z: ${formatAmount(scenario.poolYZ.reserveY)} Y : ${formatAmount(scenario.poolYZ.reserveZ)} Z`);
    console.log(`   Description: ${scenario.description}`);
    
    console.log(`   Multihop Results (X→Y→Z):`);
    
    swapAmounts.forEach(swap => {
        // First hop: X → Y
        const intermediateY = calculateSwapOutput(swap.amount, scenario.poolXY.reserveX, scenario.poolXY.reserveY);
        
        // Second hop: Y → Z
        const finalZ = calculateSwapOutput(intermediateY, scenario.poolYZ.reserveY, scenario.poolYZ.reserveZ);
        
        const exchangeRate = finalZ / swap.amount;
        const priceImpact = ((1.0 - exchangeRate) / 1.0) * 100;
        
        console.log(`     ${swap.name}: ${formatAmount(swap.amount)} X → ${formatAmount(intermediateY)} Y → ${formatAmount(finalZ)} Z`);
        console.log(`       Exchange Rate: 1 X = ${exchangeRate.toFixed(6)} Z`);
        console.log(`       Price Impact: ${priceImpact.toFixed(2)}%`);
    });
});

// Fee impact analysis
console.log(`\n💰 FEE IMPACT ANALYSIS`);
console.log(`======================`);

const feeScenarios = [
    { name: "No Fees", fee: 0.0 },
    { name: "Low Fees (0.1%)", fee: 0.001 },
    { name: "Medium Fees (0.3%)", fee: 0.003 },
    { name: "High Fees (1.0%)", fee: 0.01 },
    { name: "Very High Fees (5.0%)", fee: 0.05 }
];

console.log(`\nSingle Swap Fee Impact (1000 X : 1000 Y pool, 1.0 token swap):`);
feeScenarios.forEach(scenario => {
    const output = calculateSwapOutput(1_000_000_000, 1000_000_000_000, 1000_000_000_000, scenario.fee);
    const exchangeRate = output / 1_000_000_000;
    const feeImpact = (scenario.fee * 100).toFixed(1);
    
    console.log(`  ${scenario.name} (${feeImpact}%): 1 X = ${exchangeRate.toFixed(6)} Y`);
});

console.log(`\nMultihop Fee Impact (1000 X : 1000 Y : 1000 Z pools, 1.0 token swap):`);
feeScenarios.forEach(scenario => {
    // First hop: X → Y
    const intermediateY = calculateSwapOutput(1_000_000_000, 1000_000_000_000, 1000_000_000_000, scenario.fee);
    
    // Second hop: Y → Z
    const finalZ = calculateSwapOutput(intermediateY, 1000_000_000_000, 1000_000_000_000, scenario.fee);
    
    const exchangeRate = finalZ / 1_000_000_000;
    const feeImpact = (scenario.fee * 100).toFixed(1);
    
    console.log(`  ${scenario.name} (${feeImpact}%): 1 X = ${exchangeRate.toFixed(6)} Z`);
});

// Summary and recommendations
console.log(`\n📊 SUMMARY AND RECOMMENDATIONS`);
console.log(`==============================`);

console.log(`\n✅ BEST PRACTICES:`);
console.log(`• Use balanced pools (1:1 ratios) for best swap rates`);
console.log(`• Small swaps have minimal price impact`);
console.log(`• Large swaps have significant price impact`);
console.log(`• Multihop swaps compound the imbalance effects`);
console.log(`• Fees compound in multihop swaps (0.3% + 0.3% = 0.6%)`);

console.log(`\n❌ AVOID:`);
console.log(`• Highly unbalanced pools for large swaps`);
console.log(`• Multihop swaps through unbalanced pools`);
console.log(`• Very large swaps without slippage protection`);
console.log(`• Ignoring price impact in swap calculations`);

console.log(`\n🎯 OPTIMAL STRATEGIES:`);
console.log(`• For small swaps: Any pool ratio works fine`);
console.log(`• For medium swaps: Use balanced or slightly unbalanced pools`);
console.log(`• For large swaps: Use balanced pools only`);
console.log(`• For multihop: Ensure all intermediate pools are balanced`);
console.log(`• Always set appropriate slippage protection`);

console.log(`\n💡 KEY INSIGHTS:`);
console.log(`• Pool ratio determines the base exchange rate`);
console.log(`• Swap size determines the price impact`);
console.log(`• Fees are fixed but price impact increases with size`);
console.log(`• Multihop amplifies both fee and price impact`);
console.log(`• Slippage protection prevents unfavorable trades`);

console.log(`\n🎉 Ratio Impact Demonstration Completed!`);
console.log(`✅ Demonstrated how different ratios affect swap outcomes`);
console.log(`✅ Showed price impact across different swap sizes`);
console.log(`✅ Analyzed fee impact on exchange rates`);
console.log(`✅ Provided optimal strategies for different scenarios`);

