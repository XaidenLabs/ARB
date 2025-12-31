import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

// Configuration
const PROGRAM_ID = new PublicKey("EAo3vy4cYj9ezXbkZRwWkhUnNCjiBcF2qp8vwXwNsPPD");
const ARB_MINT = new PublicKey("D7ao8w8yjmjMWDfNzgt7J1uVP6qa3JNiRndkoXncyai");

// 1. Find Vault Authority PDA
// Seed: b"vault_authority"
const [vaultAuthority, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_authority")],
    PROGRAM_ID
);

console.log("\n=== ARB Reward Vault Details ===");
console.log("Program ID:      ", PROGRAM_ID.toBase58());
console.log("ARB Mint:        ", ARB_MINT.toBase58());
console.log("--------------------------------");
console.log("Vault Authority (PDA):", vaultAuthority.toBase58());
console.log("  (Bump: " + bump + ")");

// 2. Find Reward Vault (ATA for Vault Authority)
const rewardVault = getAssociatedTokenAddressSync(
    ARB_MINT,
    vaultAuthority,
    true // allowOwnerOffCurve = true (since owner is a PDA)
);

console.log("Reward Vault (ATA):   ", rewardVault.toBase58());
console.log("--------------------------------");
console.log("ACTION REQUIRED: Send ARB tokens to the 'Reward Vault (ATA)' address above.\n");
