
const { Connection, PublicKey } = require('@solana/web3.js');
const { getMint } = require('@solana/spl-token');

async function checkDecimals() {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const mintAddress = new PublicKey('D7ao8w8yjmjMWDfNzgt7J1uVP6qa3JNiRndkoXncyai');
  
  try {
    const mintInfo = await getMint(connection, mintAddress, 'confirmed', new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb")); // Try Token-2022
    console.log(`Mint: ${mintAddress.toBase58()}`);
    console.log(`Actual Decimals: ${mintInfo.decimals}`);
  } catch (err) {
    console.log('Error fetching mint (trying Standard Token Program):', err.message);
    try {
        const mintInfo = await getMint(connection, mintAddress);
        console.log(`Mint: ${mintAddress.toBase58()}`);
        console.log(`Actual Decimals: ${mintInfo.decimals}`);
    } catch (e) {
        console.log('Failed to fetch mint info:', e.message);
    }
  }
}

checkDecimals();
