pragma solidity >=0.4.22 <0.8.0;

import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/access/Ownable.sol';
import './Libs/Utils.sol';
import './Ethicare.sol';
import './Fundraising.sol';

contract Explorer {
  using SafeMath for uint256;

  Ethicare public ethicare;

  // Constructor
  constructor(Ethicare _ethicare) public {
      ethicare = _ethicare;
  }

  function GetFundraisingByIndex(uint index) public view returns(address) {
      return ethicare.fundraisingArray(index);
  }

  function ListFundraisingByState(Fundraising.TState state, uint page, uint pageSize) public view returns(uint[] memory) {
      uint contractsFound = 0;
      uint contractsInserted = 0;
      uint itemsToSkip = (page - 1) * pageSize;
      uint numberOfFundraising = ethicare.numberOfFundraising();
      uint[] memory allContracts = new uint[](numberOfFundraising);
      uint[] memory results = new uint[](pageSize);

      for(uint i = numberOfFundraising; i >= 1; i--) {
          if (address(ethicare.fundraisingArray(i)) != address(0x0)) {
              Fundraising fnd = Fundraising(ethicare.fundraisingArray(i));
              if (fnd.GetState() == state) {
                  allContracts[contractsFound] = i;
                  contractsFound++;
              }
          }
      }

      for (uint i = itemsToSkip; i < itemsToSkip + pageSize && i < contractsFound; i++) {
          results[i - itemsToSkip] = allContracts[i];
          contractsInserted++;
      }

      return Utils.CompactArrayOfUint(results, contractsInserted);
  }

  function ListFundraisingByAddress(address user, uint page, uint pageSize) public view returns(uint[] memory) {
      uint contractsFound = 0;
      uint contractsInserted = 0;
      uint itemsToSkip = (page - 1) * pageSize;
      uint numberOfFundraising = ethicare.numberOfFundraising();
      uint[] memory allContracts = new uint[](numberOfFundraising);
      uint[] memory results = new uint[](pageSize);

      for(uint i = numberOfFundraising; i >= 1; i--) {
          if (address(ethicare.fundraisingArray(i)) != address(0x0)) {
              Fundraising fnd = Fundraising(ethicare.fundraisingArray(i));
              if (fnd.needyAddress() == user || fnd.doctorAddress() == user || fnd.donations(user) != 0) {
                  allContracts[contractsFound] = i;
                  contractsFound++;
              }
          }
      }

      for (uint i = itemsToSkip; i < itemsToSkip + pageSize && i < contractsFound; i++) {
          results[i - itemsToSkip] = allContracts[i];
          contractsInserted++;
      }

      return Utils.CompactArrayOfUint(results, contractsInserted);
  }

  function ListCollectableProfit() public view returns(uint[] memory) {
        // Scan all fundraising contract in search for collectable ones
        uint numberOfFundraising = ethicare.numberOfFundraising();
        uint contractFound = 0;
        uint[] memory results = new uint[](numberOfFundraising);
        for(uint i = 0; i <= numberOfFundraising; i++) {
            if (address(ethicare.fundraisingArray(i)) != address(0x0)) {
                Fundraising fnd = Fundraising(ethicare.fundraisingArray(i));
                if (fnd.CanWithdrawWindfallProfit()) {
                    results[contractFound] = i;
                    contractFound++;
                }
            }
        }

        return Utils.CompactArrayOfUint(results, contractFound);
    }

    function GetFundraisingEcoiBalanceForUser(address payable fundraisingAddress, address account) public view returns(uint) {
      Fundraising fnd = Fundraising(fundraisingAddress);
      return fnd.ecois(account);
  }
}
