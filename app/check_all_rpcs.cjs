
const { Connection } = require('@solana/web3.js');

const ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana',
  'https://solana-rpc.publicnode.com',
  'https://solana.drpc.org',
  'https://mainnet.helius-rpc.com', // No key, expect fail
];

async function testAll() {
  console.log('Testing RPC Connectivity from this machine...\n');

  for (const url of ENDPOINTS) {
    console.log(`Testing: ${url}`);
    const connection = new Connection(url, 'confirmed');
    try {
        const version = await connection.getVersion();
        console.log(`✅ SUCCESS: ${url}`);
        console.log(`   Version: ${JSON.stringify(version)}`);
        
        // Try a balance check too
        // const bal = await connection.getBalance(new PublicKey('5AmqMBK1DXaRuSgVbVjus4MR1Z7gCBent2SKvqWz2Z2d'));
        // console.log(`   Balance Check: OK`);
    } catch (err) {
        let msg = err.message;
        if (msg.length > 200) msg = msg.substring(0, 200) + "...";
        console.log(`❌ FAILED: ${url}`);
        console.log(`   Error: ${msg}`);
    }
    console.log('--------------------------------------------------');
  }
}

testAll();
