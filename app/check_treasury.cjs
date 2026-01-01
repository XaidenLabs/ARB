
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress, getAccount } = require('@solana/spl-token');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl);
  const ARB_MINT = new PublicKey('D7ao8w8yjmjMWDfNzgt7J1uVP6qa3JNiRndkoXncyai');

  let secretKey;
  try {
    secretKey = Uint8Array.from(JSON.parse(process.env.ARB_TREASURY_PRIVATE_KEY));
  } catch (e) {
    console.error('ERROR: Could not parse ARB_TREASURY_PRIVATE_KEY from .env.local');
    console.error('Make sure it is a JSON array: [1, 2, 3, ...]');
    return;
  }

  const wallet = Keypair.fromSecretKey(secretKey);
  const address = wallet.publicKey;

  console.log('--- Treasury Wallet Check ---');
  console.log(`Address: ${address.toBase58()}`);
  
  // 1. Check SOL Balance
  const solBalance = await connection.getBalance(address);
  console.log(`SOL Balance: ${solBalance / 1e9} SOL`);

  if (solBalance === 0) {
    console.log('!!! WARNING: SOL Balance is 0. Transaction fees cannot be paid.');
  }

  // 2. Check ARB Balance
  try {
    const ata = await getAssociatedTokenAddress(ARB_MINT, address);
    console.log(`ARB Token Account: ${ata.toBase58()}`);
    
    const account = await getAccount(connection, ata);
    const amount = Number(account.amount) / 1e9; // Assuming 9 decimals
    console.log(`ARB Balance: ${amount.toLocaleString()}`);

    if (amount === 0) {
      console.log('!!! WARNING: ARB Balance is 0. No tokens to send.');
    }
  } catch (err) {
    if (err.name === 'TokenAccountNotFoundError') {
       console.log('!!! WARNING: This wallet has NO ARB Token Account created yet.');
       console.log('    You must send at least 1 ARB token to this address to initialize it.');
    } else {
       console.log('Error checking ARB balance:', err.message);
    }
  }
}

main().catch(console.error);
