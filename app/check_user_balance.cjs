
const { Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress, getAccount } = require('@solana/spl-token');

async function checkUserBalance() {
  const userAddress = new PublicKey('5AmqMBK1DXaRuSgVbVjus4MR1Z7gCBent2SKvqWz2Z2d');
  const arbMint = new PublicKey('D7ao8w8yjmjMWDfNzgt7J1uVP6qa3JNiRndkoXncyai');
  const token2022ProgramId = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

  console.log(`Checking balances for: ${userAddress.toBase58()}`);
  
  // Use a different RPC just in case
  const connection = new Connection('https://rpc.ankr.com/solana', 'confirmed');

  try {
    const solBalance = await connection.getBalance(userAddress);
    console.log(`SOL Balance (Lamports): ${solBalance}`);
    console.log(`SOL Balance: ${solBalance / 1e9} SOL`);
  } catch (err) {
    console.error('Failed to get SOL balance:', err.message);
  }

  try {
    const ata = await getAssociatedTokenAddress(arbMint, userAddress, false, token2022ProgramId);
    console.log(`Expected ATA: ${ata.toBase58()}`);
    
    try {
        const tokenAccount = await getAccount(connection, ata, undefined, token2022ProgramId);
        console.log(`ARB Balance (Raw): ${tokenAccount.amount}`);
        console.log(`ARB Balance (UI): ${Number(tokenAccount.amount) / 1e9}`);
    } catch (e) {
        console.log('ARB Token Account does not exist or empty (Error: ' + e.message + ')');
    }
  } catch (err) {
    console.error('Failed to check ARB:', err.message);
  }
}

checkUserBalance();
