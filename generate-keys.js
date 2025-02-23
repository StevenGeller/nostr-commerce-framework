const crypto = require('crypto');

function generateKeyPair() {
    const privateKey = crypto.randomBytes(32).toString('hex');
    return {
        privateKey: privateKey,
        publicKey: crypto.createHash('sha256').update(privateKey).digest('hex')
    };
}

const keys = generateKeyPair();
console.log('Generated Nostr Keys:');
console.log('Private Key:', keys.privateKey);
console.log('Public Key:', keys.publicKey);