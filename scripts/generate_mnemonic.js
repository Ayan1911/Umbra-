const bip39 = require('bip39');
const fs = require('fs');
const path = require('path');

const mnemonic = bip39.generateMnemonic(256);

const envPath = path.join(__dirname, '..', '.env');
fs.writeFileSync(envPath, `DEPLOYER_MNEMONIC="${mnemonic}"\n`);
console.log('Mnemonic saved to .env file.');
console.log('Mnemonic:', mnemonic);
