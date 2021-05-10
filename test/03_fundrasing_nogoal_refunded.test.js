// Import all required modules from openzeppelin-test-helpers
const { BN, expectRevert, ether, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const shared = require('./shared.js');

const Stablecoin = artifacts.require('./Stablecoin.sol');
const Ethicoin = artifacts.require('./Ethicoin.sol');
const Ethicare = artifacts.require('./Ethicare.sol');
const Fundraising = artifacts.require('./Fundraising.sol');

contract('03 - Fundraising goal not reached and refund', function(accounts) {
    let stablecoinInstance;
    let ethicoinInstance;
    let ethicareInstance;
    let fundraisingInstance;
    let fundraisingID;
    let beforeCreationTime;

    const theNeedy = accounts[1];
    const theDoctor = accounts[2];
    const theDonor = accounts[3];

    const healthCarePrice = new BN(ether('10'));
    const halfDonation = new BN(ether('5'));
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

        await fundraisingInstance.HealthcareProposal(healthCarePrice, { from: theDoctor });
        await stablecoinInstance.approve(fundraisingInstance.address, halfDonation, { from: theDonor });            
        const tx2 = await fundraisingInstance.Donate(halfDonation, { from:theDonor });
        ecoiExchanged = tx2.logs[0].args.ecoiTransfered;

        await time.increase(shared.TIME_TO_MAXFUNDRAISINGACTIVETIME);
    });

    describe("Fundraising goal not reached and refund", async () => {
        it("Donor shouldn't be able to ask for refound without approve the rignt ecoi amount", async () => {
            await expectRevert.unspecified(fundraisingInstance.RequestRefund({ from: theDonor }));
            const actualState = await fundraisingInstance.GetState.call();
    
            expect(actualState.toNumber()).to.be.equal(shared.STATE_AWAITINGFORREFUND);
        });
    
        it("Non Donor shouldn't be able to ask for refound", async () => {
            await ethicoinInstance.approve(fundraisingInstance.address, ecoiExchanged, { from: theNeedy });
            await expectRevert.unspecified(fundraisingInstance.RequestRefund({ from: theNeedy }));
            const actualState = await fundraisingInstance.GetState.call();
    
            expect(actualState.toNumber()).to.be.equal(shared.STATE_AWAITINGFORREFUND);
        });
    
        it("Donor should be able to ask for refound", async () => {
            await ethicoinInstance.approve(fundraisingInstance.address, ecoiExchanged, { from: theDonor });
            await fundraisingInstance.RequestRefund({ from: theDonor })
            const actualState = await fundraisingInstance.GetState.call();
    
            expect(actualState.toNumber()).to.be.equal(shared.STATE_LOCKED);
        });
    
    });
});
