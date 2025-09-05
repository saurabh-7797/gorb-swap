// 🎲 CUSTOM VALUES EXAMPLE - Set Any Random Values You Want!

// ========================================
// 💧 LIQUIDITY RATIOS - Change These!
// ========================================

// Pool X-Y Liquidity (you can set ANY values)
const POOL_XY_LIQUIDITY = {
    amountX: 1500_000_000,  // 1.5 Token X
    amountY: 750_000_000,   // 0.75 Token Y
    ratio: "2:1 (X:Y)"      // X is worth 2x more than Y
};

// Pool Y-Z Liquidity (you can set ANY values)
const POOL_YZ_LIQUIDITY = {
    amountY: 2000_000_000,  // 2.0 Token Y
    amountZ: 4000_000_000,  // 4.0 Token Z
    ratio: "1:2 (Y:Z)"      // Z is worth 2x more than Y
};

// ========================================
// 🔄 SWAP AMOUNTS - Change These!
// ========================================

// Single Swap Amounts (you can set ANY values)
const SINGLE_SWAP = {
    amountIn: 300_000_000,      // 0.3 tokens
    minimumAmountOut: 100_000_000, // 0.1 tokens minimum
    direction: "X to Y"
};

// Multihop Swap Amounts (you can set ANY values)
const MULTIHOP_SWAP = {
    amountIn: 800_000_000,      // 0.8 tokens
    minimumAmountOut: 300_000_000, // 0.3 tokens minimum
    path: "X → Y → Z"
};

// Large Swap Amounts (you can set ANY values)
const LARGE_SWAP = {
    amountIn: 10_000_000_000,   // 10.0 tokens
    minimumAmountOut: 5000_000_000, // 5.0 tokens minimum
    direction: "Y to Z"
};

// ========================================
// 🎯 RANDOM VALUE GENERATOR
// ========================================

function generateRandomLiquidity() {
    // Generate random amounts between 0.1 and 10.0 tokens
    const randomX = Math.floor(Math.random() * 9000_000_000) + 100_000_000;
    const randomY = Math.floor(Math.random() * 9000_000_000) + 100_000_000;
    const randomZ = Math.floor(Math.random() * 9000_000_000) + 100_000_000;
    
    return {
        amountX: randomX,
        amountY: randomY,
        amountZ: randomZ,
        ratioXY: `1:${(randomY / randomX).toFixed(2)} (X:Y)`,
        ratioYZ: `1:${(randomZ / randomY).toFixed(2)} (Y:Z)`
    };
}

function generateRandomSwap() {
    // Generate random swap amount between 0.01 and 5.0 tokens
    const randomAmount = Math.floor(Math.random() * 4900_000_000) + 10_000_000;
    const randomMinOut = Math.floor(randomAmount * 0.1); // 10% of input as minimum
    
    return {
        amountIn: randomAmount,
        minimumAmountOut: randomMinOut,
        slippageTolerance: "10%"
    };
}

// ========================================
// 📊 DISPLAY CURRENT VALUES
// ========================================

console.log("🎲 CUSTOM VALUES CONFIGURATION");
console.log("=====================================");

console.log("\n💧 LIQUIDITY RATIOS:");
console.log(`Pool X-Y: ${POOL_XY_LIQUIDITY.amountX / 1_000_000_000} X : ${POOL_XY_LIQUIDITY.amountY / 1_000_000_000} Y (${POOL_XY_LIQUIDITY.ratio})`);
console.log(`Pool Y-Z: ${POOL_YZ_LIQUIDITY.amountY / 1_000_000_000} Y : ${POOL_YZ_LIQUIDITY.amountZ / 1_000_000_000} Z (${POOL_YZ_LIQUIDITY.ratio})`);

console.log("\n🔄 SWAP AMOUNTS:");
console.log(`Single Swap: ${SINGLE_SWAP.amountIn / 1_000_000_000} tokens (${SINGLE_SWAP.direction})`);
console.log(`Multihop Swap: ${MULTIHOP_SWAP.amountIn / 1_000_000_000} tokens (${MULTIHOP_SWAP.path})`);
console.log(`Large Swap: ${LARGE_SWAP.amountIn / 1_000_000_000} tokens (${LARGE_SWAP.direction})`);

console.log("\n🎲 RANDOM VALUES GENERATED:");
const randomLiquidity = generateRandomLiquidity();
const randomSwap = generateRandomSwap();

console.log(`Random Liquidity X: ${randomLiquidity.amountX / 1_000_000_000} tokens`);
console.log(`Random Liquidity Y: ${randomLiquidity.amountY / 1_000_000_000} tokens`);
console.log(`Random Liquidity Z: ${randomLiquidity.amountZ / 1_000_000_000} tokens`);
console.log(`Random Ratio X-Y: ${randomLiquidity.ratioXY}`);
console.log(`Random Ratio Y-Z: ${randomLiquidity.ratioYZ}`);

console.log(`\nRandom Swap Amount: ${randomSwap.amountIn / 1_000_000_000} tokens`);
console.log(`Random Min Output: ${randomSwap.minimumAmountOut / 1_000_000_000} tokens`);
console.log(`Random Slippage: ${randomSwap.slippageTolerance}`);

// ========================================
// 📝 HOW TO USE THESE VALUES
// ========================================

console.log("\n📝 HOW TO USE THESE VALUES:");
console.log("=====================================");
console.log("1. Copy the values above");
console.log("2. Paste them into your script files:");
console.log("   - 6-add-liquidity-xy.js (for X-Y pool)");
console.log("   - 7-add-liquidity-yz.js (for Y-Z pool)");
console.log("   - 8-test-multihop-xyz.js (for multihop swaps)");
console.log("   - 11-large-swap-x-to-y.js (for large swaps)");
console.log("3. Run the scripts with your custom values!");
console.log("4. Watch how different ratios affect swap outcomes!");

console.log("\n🎯 EXAMPLE CUSTOM VALUES TO TRY:");
console.log("=====================================");
console.log("• Unbalanced Pool: 10.0 X : 1.0 Y (10:1 ratio)");
console.log("• Equal Pool: 5.0 X : 5.0 Y (1:1 ratio)");
console.log("• Reverse Pool: 1.0 X : 10.0 Y (1:10 ratio)");
console.log("• Large Swaps: 50.0 tokens (test price impact)");
console.log("• Small Swaps: 0.001 tokens (test precision)");
console.log("• Random Swaps: Use the generator above!");

export { 
    POOL_XY_LIQUIDITY, 
    POOL_YZ_LIQUIDITY, 
    SINGLE_SWAP, 
    MULTIHOP_SWAP, 
    LARGE_SWAP,
    generateRandomLiquidity,
    generateRandomSwap
};
