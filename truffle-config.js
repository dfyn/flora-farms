const HDWalletProvider = require("@truffle/hdwallet-provider");
const { mnemonic, infuraKey,maticVigilKey } = require("./secret.json");


module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*"
    },
    ganache: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
    },
    ropsten: {
      provider: function () {
        return new HDWalletProvider(mnemonic, `https://ropsten.infura.io/v3/${infuraKey}`)
      },
      skipDryRun: true,
      network_id: 3
    },
    mainnet: {
      provider: function () {
        return new HDWalletProvider(mnemonic, `https://mainnet.infura.io/v3/${infuraKey}`)
      },
      skipDryRun: true,
      network_id: 1
    },
    goerli: {
      provider: function () {
        return new HDWalletProvider(mnemonic, `https://goerli.infura.io/v3/${infuraKey}`)
      },
      skipDryRun: true,
      network_id: "*"
    },
    matic_test: {
      provider: () => new HDWalletProvider(mnemonic, `https://rpc-mumbai.maticvigil.com/v1/${maticVigilKey}`),
      network_id: 80001,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    matic: {
      provider: () => new HDWalletProvider(mnemonic, `https://rpc-mainnet.maticvigil.com/v1/${maticVigilKey}`),
      network_id: 137,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    }
  },
  compilers: {
    solc: {
      version: "0.6.11",
      settings: {
        optimizer: {
          enabled: true
        }
      }
    }
  }
};