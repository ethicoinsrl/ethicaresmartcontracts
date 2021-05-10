// Import all required modules from openzeppelin-test-helpers
const { BN, balance, expectEvent, expectRevert, ether, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const shared = require('./shared.js');

const Stablecoin = artifacts.require('./Stablecoin.sol');
const Ethicoin = artifacts.require('./Ethicoin.sol');
const Ethicare = artifacts.require('./Ethicare.sol');
const Fundraising = artifacts.require('./Fundraising.sol');

contract('01 - Ethicare contract', function(accounts) {

    let stablecoinInstance;
    let ethicoinInstance;
    let ethicareInstance;
    let ecoiCashbackFactor;

    const theOwner = accounts[0];
    const theNeedy = accounts[1];
    const theDoctor = accounts[2];
    const theDonor = accounts[3];

    before(async function () {
        stablecoinInstance = await Stablecoin.deployed();
        ethicoinInstance = await Ethicoin.deployed();
        ethicareInstance = await Ethicare.deployed();

        ecoiCashbackFactor = await ethicareInstance.ecoiCashbackFactor.call();

        stablecoinInstance.mint(theNeedy, new BN(ether('1000')));
        stablecoinInstance.mint(theDoctor, new BN(ether('1000')));
        stablecoinInstance.mint(theDonor, new BN(ether('1000')));

        ethicoinInstance.mint(Ethicare.address, shared.ETHICARE_ECOI_INITIAL_BALANCE);
        ethicoinInstance.mint(theDonor, new BN(ether('1000')));
    });
    
    describe("01 - Ethicare Test", async => {
        it("Ethicare should be initialized with correct values", async () => {
            const numberOfFundraising = await ethicareInstance.numberOfFundraising.call();
            const stablecoinAddress = await ethicareInstance.stablecoin.call();
            const ethicoinAddress = await ethicareInstance.ethicoin.call();
            const ecoiCashbackFactor = await ethicareInstance.ecoiCashbackFactor.call();
            const doctorECOIPercentage = await ethicareInstance.doctorECOIPercentage.call();
            const ethicareECOIBalance = await ethicoinInstance.balanceOf(Ethicare.address);
    
            expect(numberOfFundraising).to.be.bignumber.equal('0');
            expect(stablecoinAddress).to.be.equal(Stablecoin.address);
            expect(ethicoinAddress).to.be.equal(Ethicoin.address);
            expect(ecoiCashbackFactor).to.be.bignumber.equal(new BN(shared.ECOI_CASHBACK_FACTOR));
            expect(doctorECOIPercentage).to.be.bignumber.equal(new BN(shared.DOCTOR_COMMISSION));
            expect(ethicareECOIBalance).to.be.bignumber.equal(new BN(shared.ETHICARE_ECOI_INITIAL_BALANCE));
        });
    
        it("User should be able to start a new Fundraising contract", async () => {
            const tx = await ethicareInstance.StartFundraising({ from: theNeedy });
            const actualNumberOfFundraising = await ethicareInstance.numberOfFundraising.call();
            const actalFundraisingAddress = await ethicareInstance.fundraisingArray.call(actualNumberOfFundraising.toNumber());       
    
            await expectEvent.inLogs(tx.logs, 'NewRequest', { 'fundraising': actalFundraisingAddress, 'needy': theNeedy });
        });
    
        it("Ethicare should transfer the correct ECOI amount to the newly started fundraising contract", async () => {
            const ethicareECOIBalanceBefore = await ethicoinInstance.balanceOf(Ethicare.address);
            const tx = await ethicareInstance.StartFundraising({ from: theNeedy });
            const ethicareECOIBalanceAfter = await ethicoinInstance.balanceOf(Ethicare.address);
            const actualNumberOfFundraising = await ethicareInstance.numberOfFundraising.call();
            const actalFundraisingAddress = await ethicareInstance.fundraisingArray.call(actualNumberOfFundraising.toNumber());
            const fundraisingECOIBalance = await ethicoinInstance.balanceOf(actalFundraisingAddress);
           
            expect(ethicareECOIBalanceBefore).to.be.bignumber.equal(fundraisingECOIBalance.mul(ecoiCashbackFactor));
            expect(ethicareECOIBalanceBefore).to.be.bignumber.equal(fundraisingECOIBalance.add(ethicareECOIBalanceAfter)); 
        });
    
        it("Startng a new Fundraising should be increase numberOfFundraising counter correctelly", async () => {
            const numBeforeTx1 = await ethicareInstance.numberOfFundraising.call();
            const tx1 = await ethicareInstance.StartFundraising({ from: theNeedy });
            const numBeforeTx2 = await ethicareInstance.numberOfFundraising.call();
            const tx2 = await ethicareInstance.StartFundraising({ from: theNeedy });
            const numBeforeTx3 = await ethicareInstance.numberOfFundraising.call();
            const tx3 = await ethicareInstance.StartFundraising({ from: theNeedy });
    
            expect(numBeforeTx2.sub(numBeforeTx1)).to.be.bignumber.equal('1');
            expect(numBeforeTx3.sub(numBeforeTx2)).to.be.bignumber.equal('1');
        });
    
        it("Newly created Fundraising contract should be created with the right values", async () => {
            const tx = await ethicareInstance.StartFundraising({ from: theNeedy });
            let event = await expectEvent.inLogs(tx.logs, 'NewRequest');
    
            const fundraisingInstance = await Fundraising.at(event.args.fundraising);
            const fndNeedy = await fundraisingInstance.needyAddress.call();
            const fndOwner = await fundraisingInstance.owner.call();
            const fndStablecoin = await fundraisingInstance.stablecoin.call();
            const fndEthicoin = await fundraisingInstance.ethicoin.call();
            const doctorECOIPercentage = await fundraisingInstance.doctorECOIPercentage.call();
            const needyApproved = await fundraisingInstance.needyApproved.call();
    
            expect(fndNeedy).to.be.equal(theNeedy);
            expect(fndOwner).to.be.equal(Ethicare.address);
            expect(fndStablecoin).to.be.equal(Stablecoin.address);
            expect(fndEthicoin).to.be.equal(Ethicoin.address);
            expect(doctorECOIPercentage).to.be.bignumber.equal(new BN(shared.DOCTOR_COMMISSION));
            expect(needyApproved).to.be.equal(false);
        });
    
        it("User should be able to donate Stablecoin, Ethicoin and Ether to Ethicare contract", async () => {
            const stablecoinAmount = ether('3');
            const ecoiAmount = ether('5');
            const etherAmount = ether('7');
    
            const donorStablecoinBalanceBefore = await stablecoinInstance.balanceOf(theDonor);
            const donorEthicoinBalanceBefore = await ethicoinInstance.balanceOf(theDonor);
            const donorEtherBalanceBefore = await balance.current(theDonor);
            await stablecoinInstance.transfer(Ethicare.address, stablecoinAmount, { from: theDonor });
            await ethicoinInstance.transfer(Ethicare.address, ecoiAmount, { from: theDonor });
            await web3.eth.sendTransaction({ from: theDonor, to: Ethicare.address, value: etherAmount });
            const donorStablecoinBalanceAfter = await stablecoinInstance.balanceOf(theDonor);
            const donorEthicoinBalanceAfter = await ethicoinInstance.balanceOf(theDonor);
            const donorEtherBalanceAfter = await balance.current(theDonor);
    
            expect(donorStablecoinBalanceAfter.eq(donorStablecoinBalanceBefore.sub(stablecoinAmount))).to.be.true;
            expect(donorEthicoinBalanceAfter.eq(donorEthicoinBalanceBefore.sub(ecoiAmount))).to.be.true;
            expect(donorEtherBalanceAfter.lt(donorEtherBalanceBefore.sub(etherAmount))).to.be.true;
        });
    
        it("Only owner should be able to collect Ether and Stablecoin but not Ethicoin from Ethicare", async () => {
            const ownerStablecoinBalanceBefore = await stablecoinInstance.balanceOf(theOwner);
            const ownerEtherBalanceBefore = await balance.current(theOwner);
            const ethicareStablecoinBalanceBefore = await stablecoinInstance.balanceOf(Ethicare.address);
            const ethicareEtherBalanceBefore = await balance.current(Ethicare.address);
            await expectRevert.unspecified(ethicareInstance.CollectEthicareBalance({ from: theDonor }));
            await ethicareInstance.CollectEthicareBalance({ from: theOwner });
            const ownerStablecoinBalanceAfter = await stablecoinInstance.balanceOf(theOwner);
            const ownerEtherBalanceAfter = await balance.current(theOwner);
            const ethicareStablecoinBalanceAfter = await stablecoinInstance.balanceOf(Ethicare.address);
            const ethicareEtherBalanceAfter = await balance.current(Ethicare.address);
    
            expect(ownerStablecoinBalanceAfter.eq(ownerStablecoinBalanceBefore.add(ethicareStablecoinBalanceBefore))).to.be.true;
            expect(ownerEtherBalanceAfter.gt(ownerEtherBalanceBefore)).to.be.true;
            expect(ethicareStablecoinBalanceBefore.isZero()).to.be.false;
            expect(ethicareEtherBalanceBefore.isZero()).to.be.false;
            expect(ethicareStablecoinBalanceAfter.isZero()).to.be.true;
            expect(ethicareEtherBalanceAfter.isZero()).to.be.true;
        });
    
        it("CollectWindfallProfitFromFundraising should get windfall profit amounts in Ethicare smartcontract's favor", async () => {
            const tx = await ethicareInstance.StartFundraising({ from: theNeedy });
            const event = await expectEvent.inLogs(tx.logs, 'NewRequest');
            const fundraisingInstance = await Fundraising.at(event.args.fundraising);
            const fundraisingID = event.args.numberOfFundraising;
            
            const bnPrice = new BN(ether('60'));
            await fundraisingInstance.HealthcareProposal(bnPrice, { from: theDoctor });
            
            await stablecoinInstance.approve(fundraisingInstance.address, bnPrice.div(new BN('2')), { from: theDonor });
            await fundraisingInstance.Donate(bnPrice.div(new BN('2')), { from: theDonor });
            await ethicoinInstance.approve(fundraisingInstance.address, bnPrice.div(new BN('4')), { from: theDonor });
            await ethicoinInstance.transfer(fundraisingInstance.address, bnPrice.div(new BN('4')), { from: theDonor });
            await web3.eth.sendTransaction({ from: theDonor, to: fundraisingInstance.address, value: bnPrice.div(new BN('5')) });
            
            await time.increase(shared.TIME_TO_LOCK);
    
            const ethicareStablecoinBalanceBefore = await stablecoinInstance.balanceOf.call(Ethicare.address);
            const ethicareECOIBalanceBefore = await ethicoinInstance.balanceOf.call(Ethicare.address);
            const ethicareEtherBalanceBefore = await balance.current(Ethicare.address);
            const fundraisingStablecoinBalanceBefore = await stablecoinInstance.balanceOf.call(fundraisingInstance.address);
            const fundraisingECOIBalanceBefore = await ethicoinInstance.balanceOf.call(fundraisingInstance.address);
            const fundraisingEtherBalanceBefore = await balance.current(fundraisingInstance.address);

            await ethicareInstance.CollectWindfallProfitFromFundraising(fundraisingID.toString(), { from: theOwner });
            
            const ethicareStablecoinBalanceAfter = await stablecoinInstance.balanceOf.call(Ethicare.address);
            const ethicareECOIBalanceAfter = await ethicoinInstance.balanceOf.call(Ethicare.address);
            const ethicareEtherBalanceAfter = await balance.current(Ethicare.address);
            const fundraisingStablecoinBalanceAfter = await stablecoinInstance.balanceOf.call(fundraisingInstance.address);
            const fundraisingECOIBalanceAfter = await ethicoinInstance.balanceOf.call(fundraisingInstance.address);
            const fundraisingEtherBalanceAfter = await balance.current(fundraisingInstance.address);
    
            expect(ethicareStablecoinBalanceBefore.eq(ethicareStablecoinBalanceAfter)).to.be.false;
            expect(ethicareECOIBalanceBefore.eq(ethicareECOIBalanceAfter)).to.be.false;
            expect(ethicareEtherBalanceBefore.eq(ethicareEtherBalanceAfter)).to.be.false;
            expect(fundraisingStablecoinBalanceBefore.eq(fundraisingStablecoinBalanceAfter)).to.be.false;
            expect(fundraisingECOIBalanceBefore.eq(fundraisingECOIBalanceAfter)).to.be.false;
            expect(fundraisingEtherBalanceBefore.eq(fundraisingEtherBalanceAfter)).to.be.false;
            expect(fundraisingStablecoinBalanceBefore.isZero()).to.be.false;
            expect(fundraisingECOIBalanceBefore.isZero()).to.be.false;
            expect(fundraisingEtherBalanceBefore.isZero()).to.be.false;
            expect(fundraisingStablecoinBalanceAfter.isZero()).to.be.true;
            expect(fundraisingECOIBalanceAfter.isZero()).to.be.true;
            expect(fundraisingEtherBalanceAfter.isZero()).to.be.true;
        });
    });
    
});
