pragma solidity >=0.4.22 <0.8.0;

import 'openzeppelin-solidity/contracts/access/Ownable.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import './Libs/Utils.sol';
import './Fundraising.sol';

contract Ethicare is Ownable {
    using SafeMath for uint;

    ERC20 public ethicoin;
    ERC20 public stablecoin;
    uint public ecoiCashbackFactor;
    uint public doctorECOIPercentage;
    uint public minimumHealthcarePrice;

    uint public numberOfFundraising;
    mapping(uint => address payable) public fundraisingArray;

    constructor(ERC20 _stablecoin, ERC20 _ethicoin, uint _ecoiCashbackFactor, uint _doctorECOIPercentage, uint _minimumHealthcarePrice) public {
        stablecoin = _stablecoin;
        ethicoin = _ethicoin;
        ecoiCashbackFactor = _ecoiCashbackFactor;
        doctorECOIPercentage = _doctorECOIPercentage;
        minimumHealthcarePrice = _minimumHealthcarePrice;

        numberOfFundraising = 0;
    }

    event NewRequest(uint numberOfFundraising, address fundraising, address needy);

    receive() external payable { }

    function StartFundraising() public {
        numberOfFundraising = numberOfFundraising.add(1);
        Fundraising fnd = new Fundraising(stablecoin, ethicoin, msg.sender, doctorECOIPercentage, minimumHealthcarePrice);
        fundraisingArray[numberOfFundraising] = address(fnd);
        
        uint ecoiBalance = ethicoin.balanceOf(address(this));
        uint ecoiToTransfer = ecoiBalance.div(1000000);
        ethicoin.transfer(address(fnd), ecoiToTransfer);

        emit NewRequest(numberOfFundraising, fundraisingArray[numberOfFundraising], msg.sender);
    }

    function CollectEthicareBalance() public onlyOwner {
        // collect ether
        if (address(this).balance > 0)
            msg.sender.transfer(address(this).balance);

        // collect stablecoin
        if (stablecoin.balanceOf(address(this)) > 0)
            stablecoin.transfer(msg.sender, stablecoin.balanceOf(address(this)));
    }

    //Use this only when you need to replace Ethicare smartcontract
    function WithdrawAllEthicoin() public onlyOwner {
        if (ethicoin.balanceOf(address(this)) > 0)
            ethicoin.transfer(msg.sender, ethicoin.balanceOf(address(this)));
    }

    function CollectWindfallProfitFromFundraising(uint id) public onlyOwner {
        Fundraising fnd = Fundraising(fundraisingArray[id]);

        require(fnd.CanWithdrawWindfallProfit());

        fnd.TranferWindfallProfitToEthicare();
    }
}
