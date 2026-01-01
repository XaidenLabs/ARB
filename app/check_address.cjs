
const { PublicKey } = require('@solana/web3.js');

const address = '3YH1vWtFPzWYfMxAcaqyftq7kuYmwQRyMA8sK7ALywWp';
try {
  const pubkey = new PublicKey(address);
  const isOnCurve = PublicKey.isOnCurve(pubkey);
  console.log(`Address: ${address}`);
  console.log(`Is on Ed25519 curve (Wallet)? ${isOnCurve}`);
  if (isOnCurve) {
    console.log('=> This is a Standard Wallet (or System Account). It HAS a private key.');
  } else {
    console.log('=> This is a PDA (Program Derived Address). It DOES NOT have a private key.');
  }
} catch (err) {
  console.error('Invalid address:', err);
}
