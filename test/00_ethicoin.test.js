const { BN, expectRevert, ether } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const shared = require('./shared.js');

const Ethicoin = artifacts.require('./Ethicoin.sol');
const Ethicare = artifacts.require('./Ethicare.sol');

contract('01 - Ethicare contract', function(accounts) {
    let ethicoinInstance;

    const theOwner = accounts[0];

    before(async function () {
        ethicoinInstance = await Ethicoin.deployed();
        await ethicoinInstance.mint(Ethicare.address, shared.ETHICARE_ECOI_INITIAL_BALANCE);
    });
    
    describe("01 - Ethicoin Test", async => {
        it("Owner should be able to mint until cap", async () => {
            const ownerBalanceBefore = await ethicoinInstance.balanceOf(theOwner);
            await ethicoinInstance.mint(theOwner, shared.ETHICARE_ECOI_TILL_CAP);
            const ownerBalanceAfter = await ethicoinInstance.balanceOf(theOwner);
    
            expect(ownerBalanceBefore.isZero()).to.be.true;
            expect(ownerBalanceAfter).to.be.bignumber.equal(new BN(shared.ETHICARE_ECOI_TILL_CAP));
        });

        it("Owner shouldn't be able to mint anymore", async () => {
            const ownerBalanceBefore = await ethicoinInstance.balanceOf(theOwner);
            await expectRevert.unspecified(ethicoinInstance.mint(theOwner, '1'));
            const ownerBalanceAfter = await ethicoinInstance.balanceOf(theOwner);
    
            expect(ownerBalanceBefore).to.be.bignumber.equal(ownerBalanceAfter);
        });
    });
    
});
