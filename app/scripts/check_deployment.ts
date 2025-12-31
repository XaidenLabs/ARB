
import { Connection, PublicKey } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("EAo3vy4cYj9ezXbkZRwWkhUnNCjiBcF2qp8vwXwNsPPD");
const connection = new Connection("https://api.devnet.solana.com");

async function check() {
    console.log(`Checking program ${PROGRAM_ID.toBase58()} on Devnet...`);
    const info = await connection.getAccountInfo(PROGRAM_ID);
    
    if (info) {
        console.log("✅ Program found!");
        console.log("Executable:", info.executable);
        console.log("Data Length:", info.data.length);
        console.log("Owner:", info.owner.toBase58());
    } else {
        console.log("❌ Program NOT found. It is likely NOT deployed.");
    }

    // Check Vault
    const VAULT_ADDR = new PublicKey("3YH1vWtFPzWYfMxAcaqyftq7kuYmwQRyMA8sK7ALywWp");
    console.log(`\nChecking Reward Vault ${VAULT_ADDR.toBase58()}...`);
    const balance = await connection.getTokenAccountBalance(VAULT_ADDR).catch(() => null);
    
    if (balance) {
        console.log(`✅ Vault Exists. Balance: ${balance.value.uiAmount}`);
    } else {
        console.log("⚠️ Vault not found or empty (if it's an ATA, it might not exist yet if never funded).");
    }
}

check();
