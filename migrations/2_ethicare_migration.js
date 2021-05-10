const Stablecoin = artifacts.require("./StableCoin.sol");
const Ethicoin = artifacts.require("./Ethicoin.sol");
const Ethicare = artifacts.require("./Ethicare.sol");
const Explorer = artifacts.require("./Explorer.sol");

const ethicoinHardCapString = '100000000000000000000000000'; //100M
const cashbackFactorStr = '1000000';
const doctorEcoiPercentageStr = '5';


module.exports = function(deployer, network) {
    if (network == "ganache" || network == "private") {

      const minimumHealthcarePrice = '100000000000000000' //0,1 eth

      return deployer.deploy(Stablecoin, "DAI", "DAI").then(function (stableCoinInstance) {
        return deployer.deploy(Ethicoin, "Ethicoin", "ECOI", ethicoinHardCapString).then(function (ethicoinInstance) {
          return deployer.deploy(Ethicare, stableCoinInstance.address, ethicoinInstance.address, cashbackFactorStr, doctorEcoiPercentageStr, minimumHealthcarePrice).then(function(ethicareInstance) {
            return deployer.deploy(Explorer, ethicareInstance.address);
          });
        });
      });

    } else if (network == "bsctest") {
      
      const minimumHealthcarePrice = '1000000000000000000' //1 eth
      const bscVaiAddress = '0xEC5dCb5Dbf4B114C9d0F65BcCAb49EC54F6A0867';

      return deployer.deploy(Ethicoin, "Ethicoin", "ECOI", ethicoinHardCapString).then(function (ethicoinInstance) {
        return deployer.deploy(Ethicare, bscVaiAddress, ethicoinInstance.address, cashbackFactorStr, doctorEcoiPercentageStr, minimumHealthcarePrice).then(function(ethicareInstance) {
          return deployer.deploy(Explorer, ethicareInstance.address);
        });
      });

    } else if (network == "bsc") {
      
      const minimumHealthcarePrice = '100000000000000000000' //100 eth
      const bscVaiAddress = '0x4bd17003473389a42daf6a0a729f6fdb328bbbd7';

      return deployer.deploy(Ethicoin, "Ethicoin", "ECOI", ethicoinHardCapString).then(function (ethicoinInstance) {
        return deployer.deploy(Ethicare, bscVaiAddress, ethicoinInstance.address, cashbackFactorStr, doctorEcoiPercentageStr, minimumHealthcarePrice).then(function(ethicareInstance) {
          return deployer.deploy(Explorer, ethicareInstance.address);
        });
      });

    } else {
      console.log("Network not supported by migration script: " + network);
    }
};
