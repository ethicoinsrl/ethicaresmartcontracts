
const HDWalletProvider = require("truffle-hdwallet-provider");
const private = require('./private-data');

module.exports = {
  networks: {
    ganache: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
      gas: 4700000,
    },
    bsctest: {
      provider: () => new HDWalletProvider(private.mnemonic, "https://data-seed-prebsc-1-s2.binance.org:8545", 0, 3),
      network_id: 97,
      confirmations: 2,
      timeoutBlocks: 200,
    },
    bsc: {
      provider: () => new HDWalletProvider(private.mnemonic, "https://bsc-dataseed1.binance.org", 0, 3),
      network_id: 56,
      confirmations: 4,
      timeoutBlocks: 200,
      skipDryRun: true
    },
  },
  compilers: {
   solc: {
     version: "0.6.2"
   }
  },
  plugins: [
    'truffle-plugin-verify'
  ],
  api_keys: {
    bscscan: private.bscApiKey
  }
};
