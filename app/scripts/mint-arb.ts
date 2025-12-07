#!/usr/bin/env tsx
import "dotenv/config";
import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

const RPC = process.env.NEXT_PUBLIC_RPC_ENDPOINT || clusterApiUrl("devnet");
const TREASURY = process.env.ARB_TREASURY_PRIVATE_KEY;
const EXISTING_MINT = process.env.NEXT_PUBLIC_ARB_MINT_ADDRESS;
const DECIMALS = Number(process.env.NEXT_PUBLIC_ARB_DECIMALS || 6);

if (!TREASURY) {
  console.error("Missing ARB_TREASURY_PRIVATE_KEY env var (JSON array secret key).");
  process.exit(1);
}

const loadKeypair = (secret: string) => {
  try {
    const secretKey = Uint8Array.from(JSON.parse(secret));
    return Keypair.fromSecretKey(secretKey);
  } catch (err) {
    throw new Error("Invalid ARB_TREASURY_PRIVATE_KEY format. Expected JSON array.");
  }
};

async function main() {
  const connection = new Connection(RPC, "confirmed");
  const treasury = loadKeypair(TREASURY);

  const mintAmountInput = Number(process.argv[2] || 1_000_000);
  if (!Number.isFinite(mintAmountInput) || mintAmountInput <= 0) {
    throw new Error("Mint amount must be a positive number");
  }

  const mint = EXISTING_MINT ? new PublicKey(EXISTING_MINT) : await createMint(
    connection,
    treasury,
    treasury.publicKey,
    null,
    DECIMALS
  );

  const treasuryAta = await getOrCreateAssociatedTokenAccount(
    connection,
    treasury,
    mint,
    treasury.publicKey
  );

  const multiplier = BigInt(10 ** DECIMALS);
  const rawAmount = BigInt(Math.floor(mintAmountInput * Number(multiplier)));

  const sig = await mintTo(
    connection,
    treasury,
    mint,
    treasuryAta.address,
    treasury,
    rawAmount
  );

  console.log("RPC:", RPC);
  console.log("ARB mint address:", mint.toBase58());
  console.log("Treasury ATA:", treasuryAta.address.toBase58());
  console.log("Minted amount (human):", mintAmountInput);
  console.log("Signature:", sig);
  console.log(`Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
