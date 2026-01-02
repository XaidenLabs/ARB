
const { Connection } = require('@solana/web3.js');
require('dotenv').config({ path: '.env.local' });

async function checkRpc() {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_ENDPOINT;
  
  if (!rpcUrl) {
    console.error('❌ NEXT_PUBLIC_RPC_ENDPOINT is NOT set in .env.local');
    console.log('   The app is defaulting to the public Mainnet endpoint (which explains the errors).');
    return;
  }

  console.log('--- RPC Connection Check ---');
  console.log(`Configured URL: ${rpcUrl.substring(0, 25)}... (masked)`);
  
  if (rpcUrl.includes('helius')) {
    console.log('✅ Matches "helius" pattern.');
  }

  console.log('Connecting...');
  const connection = new Connection(rpcUrl);

  try {
    const version = await connection.getVersion();
    console.log('✅ Connection Successful!');
    console.log(`   Node Version: ${version['solana-core']}`);
  } catch (err) {
    console.error('❌ Failed to connect to this RPC URL.');
    console.error('   Error:', err.message);
  }
}

checkRpc();
