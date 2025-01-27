var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "sail sense grab volcano climb east mandate exclude brand suit school hedgehog";

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:7545", 0, 50);
      },
      network_id: '*',
      gas: 6666666
    }
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};