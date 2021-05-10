// Import all required modules from openzeppelin-test-helpers
const { BN, expectRevert, ether, time } = require('@openzeppelin/test-helpers');

// Import preferred chai flavor: both expect and should are supported
const { expect } = require('chai');

const shared = require('./shared.js');

const Stablecoin = artifacts.require('./Stablecoin.sol');
const Ethicoin = artifacts.require('./Ethicoin.sol');
const Ethicare = artifacts.require('./Ethicare.sol');
const Fundraising = artifacts.require('./Fundraising.sol');

contract('02 - Fundraising contract, goal reached, withdrawn, no extra', function(accounts) {
    let stablecoinInstance;
    let ethicoinInstance;
    let ethicareInstance;
    let fundraisingInstance;
    let fundraisingID;
    let beforeCreationTime;

    const theOwner = accounts[0];
    const theNeedy = accounts[1];
    const theDoctor = accounts[2];
    const theDonor = accounts[3];

    const healthCarePrice = new BN(ether('10'));

    before(async function () {
        stablecoinInstance = await Stablecoin.deployed();
        ethicoinInstance = await Ethicoin.deployed();
        ethicareInstance = await Ethicare.deployed();

        stablecoinInstance.mint(theNeedy, new BN(ether('1000')));
        stablecoinInstance.mint(theDoctor, new BN(ether('1000')));
        stablecoinInstance.mint(theDonor, new BN(ether('1000')));

        ethicoinInstance.mint(Ethicare.address, shared.ETHICARE_ECOI_INITIAL_BALANCE);
        ethicoinInstance.mint(theDonor, new BN(ether('1000')));

        beforeCreationTime = Math.floor((new Date).getTime()/1000);
        const tx = await ethicareInstance.StartFundraising({ from: theNeedy });

        fundraisingInstance = await Fundraising.at(tx.logs[1].args.fundraising);
        fundraisingID = await ethicareInstance.numberOfFundraising.call();
    });

    describe("Fundrasing goal reached and withdraw", async () => {
        it("Fundraising should be initialized with correct values", async () => {
            const stablecoin = await fundraisingInstance.stablecoin.call();
            const ethicoin = await fundraisingInstance.ethicoin.call();
            const needyAddress = await fundraisingInstance.needyAddress.call();
            const contractState = await fundraisingInstance.GetState.call();
            const startDate = await fundraisingInstance.startDate.call();
            const needyApproved = await fundraisingInstance.needyApproved.call();
            const healthcarePrice = await fundraisingInstance.healthcarePrice.call();
            const doctorAddress = await fundraisingInstance.doctorAddress.call();
            const doctorECOIPercentage = await fundraisingInstance.doctorECOIPercentage.call();
            const ethicareECOIBalanceAfter = await ethicoinInstance.balanceOf(Ethicare.address);
            const fndECOIBalance = await ethicoinInstance.balanceOf(fundraisingInstance.address);
    
            const sum = ethicareECOIBalanceAfter.add(fndECOIBalance);
            const fac = sum.div(new BN(shared.ECOI_CASHBACK_FACTOR));
    
            expect(stablecoin).to.be.equal(Stablecoin.address);
            expect(ethicoin).to.be.equal(Ethicoin.address);
            expect(needyAddress).to.be.equal(theNeedy);
            expect(contractState.toNumber()).to.be.equal(shared.STATE_REQUESTED);
            expect(startDate.gte(beforeCreationTime)).to.be.true;
            expect(needyApproved).to.be.false;
            expect(healthcarePrice).to.be.bignumber.equal('0');
            expect(doctorAddress).to.be.equal(shared.ZERO_ADDRESS);
            expect(doctorECOIPercentage).to.be.bignumber.equal(new BN(shared.DOCTOR_COMMISSION));
            expect(fndECOIBalance).to.be.bignumber.equal(fac);
        });
    
        it("Needy shouldn't be able to propose a healthcare", async () => {
            await expectRevert.unspecified(fundraisingInstance.HealthcareProposal(healthCarePrice, { from: theNeedy }));
            const actualState = await fundraisingInstance.GetState.call();
    
            expect(actualState.toNumber()).to.be.equal(shared.STATE_REQUESTED);
        });

        it("Doctor shouldn't be able to propose healthcare below minimum price", async () => {
            await expectRevert.unspecified(fundraisingInstance.HealthcareProposal('1000', { from: theDoctor }));
        });
    
        it("Doctor should be able to propose a healthcare", async () => {
            await fundraisingInstance.HealthcareProposal(healthCarePrice, { from: theDoctor });
            const actualState = await fundraisingInstance.GetState.call();
    
            expect(actualState.toNumber()).to.be.equal(shared.STATE_ACTIVE);
        });
    
        it("Doctor shouldn't be able to propose healthcare twice", async () => {
            await expectRevert.unspecified(fundraisingInstance.HealthcareProposal(healthCarePrice, { from: theDoctor }));
        });
    
        it("Donor shouldn't be able to donate with an allowance less than donation amount", async () => {
            const donation = new BN(ether('1'));
            const donorBalanceBefore = await stablecoinInstance.balanceOf.call(theDonor);
            await expectRevert.unspecified(fundraisingInstance.Donate(donation, { from: theDonor }));
            const donorBalanceAfter = await stablecoinInstance.balanceOf.call(theDonor);
            const actualState = await fundraisingInstance.GetState.call();
    
            expect(donorBalanceAfter).to.be.bignumber.equal(donorBalanceBefore);
            expect(actualState.toNumber()).to.be.equal(shared.STATE_ACTIVE);
        });
    
        it("Donor should be able to donate through Donate function", async () => {
            const donation = new BN(ether('1'));
    
            const donorBalanceBefore = await stablecoinInstance.balanceOf.call(theDonor);
            const fundraisingBalanceBefore = await stablecoinInstance.balanceOf.call(fundraisingInstance.address);
            await stablecoinInstance.approve(fundraisingInstance.address, donation, { from: theDonor });            
            await fundraisingInstance.Donate(donation, { from:theDonor });
            const donorBalanceAfter = await stablecoinInstance.balanceOf.call(theDonor);
            const fundraisingBalanceAfter = await stablecoinInstance.balanceOf.call(fundraisingInstance.address);
            const actualState = await fundraisingInstance.GetState.call();
    
            expect(donorBalanceAfter).to.be.bignumber.equal(donorBalanceBefore.sub(donation));
            expect(fundraisingBalanceAfter).to.be.bignumber.equal(fundraisingBalanceBefore.add(donation));
            expect(actualState.toNumber()).to.be.equal(shared.STATE_ACTIVE);
            
        });
    
        it("Needy shouldn't be able to approve the fundraising in favor of the doctor when goal is not reached", async () => {
            await expectRevert.unspecified(fundraisingInstance.Approve({ from: theNeedy }));
            const actualState = await fundraisingInstance.GetState.call();
    
            expect(actualState.toNumber()).to.be.equal(shared.STATE_ACTIVE);
        });
    
        it("Doctor shouldn't be able to withdraw before approval", async () => {
            const donation = new BN(ether('9'));
    
            await stablecoinInstance.approve(fundraisingInstance.address, donation, { from: theDonor });
            await fundraisingInstance.Donate(donation, { from:theDonor });
            await expectRevert.unspecified(fundraisingInstance.Withdraw({ from: theDoctor }));
            const actualState = await fundraisingInstance.GetState.call();
    
            expect(actualState.toNumber()).to.be.equal(shared.STATE_AWAITINGFORAPPROVAL);
        });
    
        it("Only Needy should be able to approve the fundraising in favor of the doctor once goal is reached", async () => {
            await expectRevert.unspecified(fundraisingInstance.Approve({ from: theOwner }));
            await expectRevert.unspecified(fundraisingInstance.Approve({ from: theDoctor }));
            await expectRevert.unspecified(fundraisingInstance.Approve({ from: theDonor }));
            const stateBefore = await fundraisingInstance.GetState.call();
            await fundraisingInstance.Approve({ from: theNeedy });
            const stateAfter = await fundraisingInstance.GetState.call();
    
            expect(stateBefore.toNumber()).to.be.equal(shared.STATE_AWAITINGFORAPPROVAL);
            expect(stateAfter.toNumber()).to.be.equal(shared.STATE_AWAITINGFORWITHDRAW);
        });
    
        it("Only Doctor should be able to withdraw after approval", async () => {
            await expectRevert.unspecified(fundraisingInstance.Withdraw({ from: theOwner }));
            await expectRevert.unspecified(fundraisingInstance.Withdraw({ from: theNeedy }));
            await expectRevert.unspecified(fundraisingInstance.Withdraw({ from: theDonor }));
            const stateBefore = await fundraisingInstance.GetState.call();
            const balanceBefore = await stablecoinInstance.balanceOf.call(theDoctor);
            await fundraisingInstance.Withdraw({ from: theDoctor });
            const stateAfter = await fundraisingInstance.GetState.call();
            const balanceAfter = await stablecoinInstance.balanceOf.call(theDoctor);
            const fundraisingBalanceAfter = await stablecoinInstance.balanceOf.call(fundraisingInstance.address);
    
            expect(stateBefore.toNumber()).to.be.equal(shared.STATE_AWAITINGFORWITHDRAW);
            expect(fundraisingBalanceAfter).to.be.bignumber.equal('500000000000000000');
            expect(stateAfter.toNumber()).to.be.equal(shared.STATE_LOCKED); 
            expect(balanceAfter).to.be.bignumber.equal(balanceBefore.add(healthCarePrice).sub(new BN('500000000000000000')));
        });
    
        it("Doctor should be able to withdraw only once", async () => {
            await expectRevert.unspecified(fundraisingInstance.Withdraw({ from: theDoctor }));
            const stateAfter = await fundraisingInstance.GetState.call();
    
            expect(stateAfter.toNumber()).to.be.equal(shared.STATE_LOCKED);
        });
    });
});
