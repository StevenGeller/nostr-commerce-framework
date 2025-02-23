import { generatePrivateKey, getPublicKey } from 'nostr-tools';

const privateKey = generatePrivateKey();
const publicKey = getPublicKey(privateKey);

console.log('Private Key:', privateKey);
console.log('Public Key:', publicKey);