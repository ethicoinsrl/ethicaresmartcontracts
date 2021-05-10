// Import all required modules from openzeppelin-test-helpers
const { BN, expectRevert, ether, time } = require('@openzeppelin/test-helpers');

const { expect } = require('chai');

const shared = require('./shared.js');

const Stablecoin = artifacts.require('./Stablecoin.sol');
const Ethicoin = artifacts.require('./Ethicoin.sol');
const Ethicare = artifacts.require('./Ethicare.sol');
const Fundraising = artifacts.require('./Fundraising.sol');

contract('04 - Fundraising goal not reached and refund', function(accounts) {
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
    const halfDonation = new BN(ether('5'));
    let initialEcoiBalance = undefined;
    let ecoiExchanged = undefined;

    before(async function () {
        stablecoinInstance = await Stablecoin.deployed();
        ethicoinInstance = await Ethicoin.deployed();
        ethicareInstance = await Ethicare.deployed();

        stablecoinInstance.mint(theNeedy, new BN(ether('1000')));
        stablecoinInstance.mint(theDoctor, new BN(ether('1000')));
        stablecoinInstance.mint(theDonor, new BN(ether('1000')));

        ethicoinInstance.mint(Ethicare.address, shared.ETHICARE_ECOI_INITIAL_BALANCE);
        ethicoinInstance.mint(theDonor, new BN(ether('1000')));
        ethicoinInstance.mint(theDoctor, new BN(ether('1000')));
        ethicoinInstance.mint(theDonor, new BN(ether('1000')));

        beforeCreationTime = Math.floor((new Date).getTime()/1000);
        const tx1 = await ethicareInstance.StartFundraising({ from: theNeedy });

        fundraisingInstance = await Fundraising.at(tx1.logs[1].args.fundraising);
        fundraisingID = await ethicareInstance.numberOfFundraising.call();
        initialEcoiBalance = await ethicoinInstance.balanceOf(fundraisingInstance.address);

        await fundraisingInstance.HealthcareProposal(healthCarePrice, { from: theDoctor });
        await stablecoinInstance.approve(fundraisingInstance.address, halfDonation, { from: theDonor });            
        const tx2 = await fundraisingInstance.Donate(halfDonation, { from:theDonor });
        ecoiExchanged = tx2.logs[0].args.ecoiTransfered;

        await time.increase(shared.TIME_TO_MAXFUNDRAISINGACTIVETIME);
        await time.increase(shared.TIME_TO_LOCK);
    });

    describe("Fundraising goal not reached and refund", async () => {
         
        it("Donor should not be able to ask for refound when state is LOCKED", async () => {
            const stateBefore = await fundraisingInstance.GetState.call();
            await ethicoinInstance.approve(fundraisingInstance.address, ecoiExchanged, { from: theDonor });
            await expectRevert.unspecified(fundraisingInstance.RequestRefund({ from: theDonor }));
            const stateAfter = await fundraisingInstance.GetState.call();
    
            expect(stateBefore.toNumber()).to.be.equal(shared.STATE_LOCKED);
            expect(stateAfter.toNumber()).to.be.equal(shared.STATE_LOCKED);
        });

        it("Ethicare can collect ecois and stablecoins not reclaimed", async () => {
            const ethicareStablecoinBalanceBefore = await stablecoinInstance.balanceOf(ethicareInstance.address);
            const ethicareEcoiBalanceBefore = await ethicoinInstance.balanceOf(ethicareInstance.address);

            await ethicareInstance.CollectWindfallProfitFromFundraising(fundraisingID, { from: theOwner });

            const ethicareStablecoinBalanceAfter = await stablecoinInstance.balanceOf(ethicareInstance.address);
            const ethicareEcoiBalanceAfter = await ethicoinInstance.balanceOf(ethicareInstance.address);

            expect(ethicareStablecoinBalanceAfter).to.be.bignumber.equal(ethicareStablecoinBalanceBefore.add(halfDonation));
            expect(ethicareEcoiBalanceAfter).to.be.bignumber.equal(ethicareEcoiBalanceBefore.add(initialEcoiBalance).sub(ecoiExchanged));
        });

        it('Non Owner cannot reclaim stablecoin from Ethicare', async () => {
            const ethicareStablecoinBalanceBefore = await stablecoinInstance.balanceOf(ethicareInstance.address);
            const ownerStablecoinBalanceBefore = await stablecoinInstance.balanceOf(theOwner);

            await expectRevert.unspecified(ethicareInstance.CollectEthicareBalance({ from: theNeedy }));

            const ethicareStablecoinBalanceAfter = await stablecoinInstance.balanceOf(ethicareInstance.address);
            const ownerStablecoinBalanceAfter = await stablecoinInstance.balanceOf(theOwner);
            
            expect(ethicareStablecoinBalanceAfter).to.be.bignumber.equal(ethicareStablecoinBalanceBefore);
            expect(ownerStablecoinBalanceAfter).to.be.bignumber.equal(ownerStablecoinBalanceBefore);
        });

        it('Owner can reclaim stablecoin from Ethicare', async () => {
            const ethicareStablecoinBalanceBefore = await stablecoinInstance.balanceOf(ethicareInstance.address);
            const ownerStablecoinBalanceBefore = await stablecoinInstance.balanceOf(theOwner);

            await ethicareInstance.CollectEthicareBalance({ from: theOwner });

            const ethicareStablecoinBalanceAfter = await stablecoinInstance.balanceOf(ethicareInstance.address);
            const ownerStablecoinBalanceAfter = await stablecoinInstance.balanceOf(theOwner);
            
            expect(ethicareStablecoinBalanceAfter).to.be.bignumber.equal(ethicareStablecoinBalanceBefore.sub(halfDonation));
            expect(ownerStablecoinBalanceAfter).to.be.bignumber.equal(ownerStablecoinBalanceBefore.add(halfDonation));
        });
    
    });
});
