
const { Connection, PublicKey } = require('@solana/web3.js');
require('dotenv').config({ path: '.env.local' });

async function checkMints() {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_ENDPOINT;
  console.log('--- RPC & Mint Diagnosis ---');
  console.log(`RPC Endpoint: ${rpcUrl ? 'Configured (Helius/Custom)' : 'Default (Public)'}`);

  const connection = new Connection(rpcUrl || 'https://api.mainnet-beta.solana.com');

  const WRONG_MINT = '7vBWeeZqxufFTecpEmCEzHbXBxokj7H4s3DRGU3g1t1i';
  const RIGHT_MINT = 'D7ao8w8yjmjMWDfNzgt7J1uVP6qa3JNiRndkoXncyai';

  console.log(`\n1. Testing WRONG Mint (from your .env.local): ${WRONG_MINT}`);
  try {
    const info = await connection.getAccountInfo(new PublicKey(WRONG_MINT));
    if (info) {
      console.log('   [UNEXPECTED] Found account info! (Is this on Mainnet?)');
    } else {
      console.log('   [EXPECTED RESULT] Account info is NULL.');
      console.log('   => This confirms the RPC is working, but this Token Address does not exist on Mainnet.');
    }
  } catch (err) {
    console.log('   [ERROR] RPC failed to fetch:', err.message);
  }

  console.log(`\n2. Testing RIGHT Mint (Correct Mainnet Token): ${RIGHT_MINT}`);
  try {
    const info = await connection.getAccountInfo(new PublicKey(RIGHT_MINT));
    if (info) {
      console.log('   [SUCCESS] Found account info!');
      console.log(`   Owner: ${info.owner.toBase58()} (Should be Token-2022)`);
      console.log('   => RPC IS WORKING PERFECTLY.');
    } else {
      console.log('   [FAILURE] Could not find legitimate token. RPC might actually be broken.');
    }
  } catch (err) {
    console.log('   [ERROR] RPC failed to fetch:', err.message);
  }
}

checkMints();
