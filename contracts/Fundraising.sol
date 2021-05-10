pragma solidity >=0.4.22 <0.8.0;

import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/access/Ownable.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';


contract Fundraising is Ownable {
    using SafeMath for uint256;

    enum TState {
        // Needy asked for aid but no healthcare proposal came yet
        Requested,

        // An healthcare proposal has came and donors can Donate
        Active,

        // Goal is reached and and doctor are waiting for the needy approval
        AwaitingForApproval,

        // Needy has approved and doctor can withdraw
        AwaitingForWithdraw,

        // Goal is not reached and Donors can ask for Refund
        AwaitingForRefund,

        // Contract is locked. Eventually balance can be withdrawn as windfall profit
        Locked
    }

    // Max time from start the fundraising can be in REQUESTED state before lock
    uint constant MAXREQUESTEDSTATETIME = 15 days;

    // Max time from start the fundraising can be in ACTIVE state
    uint constant MAXFUNDRAISINGACTIVETIME = 30 days;

    // Max time from start the needy can approve the fundraising in favor of the doctor before awaiting for Refund
    uint constant MAXWAITINGFORAPPROVALTIME = 45 days;

    // Max time from start Ethicare can close a contract and get all unreclaimed balances
    uint constant MAXWAITINGFORREFUND = 90 days; 

    // State variables
    ERC20 public stablecoin;
    ERC20 public ethicoin;
    TState private lastState;
    uint public startDate;

    address public needyAddress;
    bool public needyApproved;

    uint public healthcarePrice;
    address public doctorAddress;
    uint public doctorECOIBalance;
    uint public doctorECOIPercentage;
    uint public minimumHealthcarePrice;
    uint public initialECOIBalance;

    mapping(address => uint) public donations;
    mapping(address => uint) public ecois;

    // Constructor
    constructor(ERC20 _stablecoin, ERC20 _ethicoin, address _needyAddress, uint _doctorECOIPercentage, uint _minimumHealthcarePrice) public {
        stablecoin = _stablecoin;
        ethicoin = _ethicoin;
        needyAddress = _needyAddress;
        doctorECOIPercentage = _doctorECOIPercentage;
        minimumHealthcarePrice = _minimumHealthcarePrice;
        lastState = TState.Requested;
        startDate = block.timestamp;
        needyApproved = false;
    }

    /**
    @notice Make this Fundraising contract able to receive ether.
    */
    receive() external payable { }

    /**
    @notice Handle contract state machine
    @dev Should be used as first modifier or at least before atState modifier
    @dev Should be used by all function that modify contract state or depends from contract state.
    */
    modifier transitionState() {
        lastState = GetState();
        _;
    }

    /**
    @notice Function can be executed only at specified state
    @dev this should be used just below transitionState modifier
    @param _state Allowed state
    */
    modifier atState(TState _state) {
        require(lastState == _state, 'This operation cannot be performed at this state');
        _;
    }

    /**
    @notice Only Needy can execute the function
    */
    modifier onlyNeedy() {
        require(msg.sender == needyAddress, 'Only needy can perform this operation');
        _;
    }

    /**
    @notice Needy cannot execute the function
    */
    modifier denyToNeedy() {
        require(msg.sender != needyAddress, 'This operation cannot be performed by needy');
        _;
    }

    /**
    @notice Only Doctor can execute the function
    */
    modifier onlyDoctor() {
        require(msg.sender == doctorAddress, 'Only doctor can perform this operation');
        _;
    }



    /**
    @notice Raised when contract receive a correct proposal from a Doctor
    */
    event ProposalReceived(address doctorAddress, uint healthcarePrice);

    /**
    @notice Raised when contract receive a donation
    */
    event DonationReceived(address from, uint donationAmount, uint ecoiTransfered);

    /**
    @notice Raised when Needy approve in favor of the Doctor
    */
    event Approved();

    /**
    @notice Raised when Doctor withdraw his payment
    @param amount Amount Withdrawan
    */
    event Withdrawan(uint amount);

    /**
    @notice Raised when a Donor ask for a Refund
    */
    event Refunded(address donorAddress, uint amount);


    function HealthcareProposal(uint _healthcarePrice)
        public
        transitionState
        atState(TState.Requested)
        denyToNeedy
    {
        require(_healthcarePrice >= minimumHealthcarePrice, 'Healthcare price is too low');
        
        // gather doctor data
        healthcarePrice = _healthcarePrice;
        doctorAddress = msg.sender;

        // calculate ecoi to transfer to the doctor in case of withdrow
        // initial ecoi balance is set at this stage
        initialECOIBalance = ethicoin.balanceOf(address(this));
        doctorECOIBalance = (initialECOIBalance.div(100)).mul(doctorECOIPercentage);

        // emit ProposalReceived event
        emit ProposalReceived(msg.sender, healthcarePrice);
    }

    function Donate(uint amount)
        public
        transitionState
        atState(TState.Active)
    {
        require(stablecoin.allowance(msg.sender, address(this)) >= amount, 'Not enough stablecoin allowance');

        // store donor address and donation
        donations[msg.sender] = SafeMath.add(donations[msg.sender], amount);

        //calculate ecoi to transfer in exchange of donation
        uint ecoiForDonors = initialECOIBalance.sub(doctorECOIBalance);
        uint ecoiToTransfer = (amount.mul(ecoiForDonors)).div(healthcarePrice);
        if (ecoiToTransfer > ecoiForDonors)
            ecoiToTransfer = ecoiForDonors;

        ecois[msg.sender] = SafeMath.add(ecois[msg.sender], ecoiToTransfer);

        emit DonationReceived(msg.sender, amount, ecoiToTransfer);

        stablecoin.transferFrom(msg.sender, address(this), amount);
        ethicoin.transfer(msg.sender, ecoiToTransfer);
    }

        /**
        @notice Approve Doctor for withdrawal
        @dev 1. Can be called only by Needy
        @dev 2. Can be called only when healthcarePrice is reached
        @dev 3. Can be called only when contract state is in AwaitingForApproval
        */
    function Approve()
        public
        onlyNeedy
        transitionState
        atState(TState.AwaitingForApproval)
    {
        // emit Approved event
        emit Approved();

        // Set needyApproved to TRUE
        needyApproved = true;
    }

        /**
        @notice Doctor withdraw emolument specified in healthcarePrice
        @dev 1. Can be called only when state is AwaitingForWithdraw
        @dev 2. Can be called only by doctor
        @dev 3. Can be called only when healthcarePrice is reached
        @dev 4. Can be called only when Needy has approved
        */
    function Withdraw()
        public
        onlyDoctor
        transitionState
        atState(TState.AwaitingForWithdraw)
    {
        require(healthcarePrice > 0, 'healthcarePrice cannot be zero.');

        uint commission = (healthcarePrice.div(100)).mul(doctorECOIPercentage);

        // store healthcarePrice
        uint amount = healthcarePrice.sub(commission);

        // set it to ZERO to avoid multiple withdrawal
        healthcarePrice = 0;

        // Send emolument to Doctor
        stablecoin.transfer(msg.sender, amount);
        ethicoin.transfer(msg.sender, doctorECOIBalance);

        // emit Withdrawan event
        emit Withdrawan(amount);
    }

        /**
        @notice Donor request for Refund
        @dev 1. Can only be called when contractState is AwaitingForWithdraw
        @dev 2. Can only be called by Donors
        @dev 3. Can be called only when healthcarePrice is not reached within the deadline
        */
    function RequestRefund()
        public
        transitionState
        atState(TState.AwaitingForRefund)
    {
        require(donations[msg.sender] > 0, 'Nothing to refund');
        require(ecois[msg.sender] > 0, 'Ecois to get back cannot be zero');
        require(ethicoin.allowance(msg.sender, address(this)) >= ecois[msg.sender], 'Not enough ecoi allowance');

        // store donor amount
        uint stablecoinAmount = donations[msg.sender];
        uint ecoiAmount = ecois[msg.sender];

        // set donor amount to ZERO
        donations[msg.sender] = 0;
        ecois[msg.sender] = 0;

        // transefer amount to donor
        stablecoin.transfer(msg.sender, stablecoinAmount);
        ethicoin.transferFrom(msg.sender, address(this), ecoiAmount);

        // emit Refunded event
        emit Refunded(msg.sender, stablecoinAmount);
    }

    function CanWithdrawWindfallProfit() public view returns(bool) {
        uint stablecoinAmount = stablecoin.balanceOf(address(this));
        uint ecoiAmount = ethicoin.balanceOf(address(this));

        return (startDate.add(MAXWAITINGFORREFUND) <= block.timestamp)
            && (
                (stablecoinAmount > 0)
                || (ecoiAmount > 0)
                || (address(this).balance > 0)
            );
    }

    function TranferWindfallProfitToEthicare()
        public
        onlyOwner
        transitionState
        atState(TState.Locked)
    {
        uint stablecoinAmount = stablecoin.balanceOf(address(this));
        uint ecoiAmount = ethicoin.balanceOf(address(this));

        if (stablecoinAmount > 0)
            stablecoin.transfer(msg.sender, stablecoinAmount);
        if (ecoiAmount > 0)
            ethicoin.transfer(msg.sender, ecoiAmount);
        if (address(this).balance > 0)
            msg.sender.transfer(address(this).balance);
    }

    function GetState() public view returns(TState) {
        TState state = lastState;
        if (state != TState.Locked) {
            // From Requested to Active or Locked
            if (state == TState.Requested) {
                if (doctorAddress != address(0x0))
                    state = TState.Active;
                else if (block.timestamp > startDate.add(MAXREQUESTEDSTATETIME))
                    state = TState.Locked;
            }

            // From Active to AwaitingForApproval or AwaitingforRefund
            if (state == TState.Active) {
                if (stablecoin.balanceOf(address(this)) >= healthcarePrice)
                    state = TState.AwaitingForApproval;
                else if (block.timestamp > startDate.add(MAXFUNDRAISINGACTIVETIME))
                    state = TState.AwaitingForRefund;
            }

            // From AwaitingForApproval to AwaitingForWithdraw or AwaitingForRefund
            if (state == TState.AwaitingForApproval) {
                if (needyApproved == true)
                    state = TState.AwaitingForWithdraw;
                else if (block.timestamp > startDate.add(MAXWAITINGFORAPPROVALTIME))
                    state = TState.AwaitingForRefund; // Cancelled. Donors con ask for Refund
            }

            if (state == TState.AwaitingForWithdraw && healthcarePrice == 0) {
                state = TState.Locked;
            }

            if (state == TState.AwaitingForRefund && stablecoin.balanceOf(address(this)) == 0) {
                state = TState.Locked;
            }

            if ((block.timestamp > startDate.add(MAXWAITINGFORREFUND))) {
                state = TState.Locked;
            }
        }

        return state;
    }

}
