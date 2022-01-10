const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Escrow", function () {

    it("getPayments should return an empty array if there are no uncollected payments", async function () {
        const Escrow = await ethers.getContractFactory("Escrow");
        const escrow = await Escrow.deploy();
        await escrow.deployed();

        expect(await escrow.getPayments()).to.eql([]);
    });

    it("getPayments should return an array with an uncollected payments", async function () {
        const Escrow = await ethers.getContractFactory("Escrow");
        const escrow = await Escrow.deploy();
        await escrow.deployed();

        const [owner, signer1, signer2, signer3] = await ethers.getSigners();

        await escrow.connect(signer1).deposit(signer2.address, {value: 12345});
        await escrow.connect(signer1).deposit(signer3.address, {value: 33333});

        const payments = await escrow.connect(signer2).getPayments();

        expect(payments).to.have.length(1);

        const expected = {
            id: 0,
            from: signer1.address,
            amount: 12345,
            isValue: true
        };

        const actual = {
            id: payments[0].id.toNumber(),
            from: payments[0].from.toString(),
            amount: payments[0].amount.toNumber(),
            isValue: payments[0].isValue
        };

        expect(actual).to.deep.include(expected);
    });


    it("deposit should transfer eth", async function () {
        const Escrow = await ethers.getContractFactory("Escrow");
        const escrow = await Escrow.deploy();
        await escrow.deployed();

        const [owner, signer1, signer2] = await ethers.getSigners();
        const initialBalance = ethers.BigNumber.from(await ethers.provider.getBalance(signer1.address));

        const value = 1;
        const receipt = await escrow.connect(signer1).deposit(signer2.address, {value: value});

        const newBalance = ethers.BigNumber.from(await ethers.provider.getBalance(signer1.address));

        const latestBlock = await ethers.provider.getBlock("latest")
        const gasUsed = latestBlock.gasUsed;

        // new balance = initial balance - (value + (gas used * gas price))
        expect(newBalance).to.be.equal(initialBalance.sub(value).sub(receipt.gasPrice.mul(gasUsed)));
    });

    it("deposit should emit Deposited event", async function () {
        const Escrow = await ethers.getContractFactory("Escrow");
        const escrow = await Escrow.deploy();
        await escrow.deployed();

        const [owner, signer1, signer2] = await ethers.getSigners();

        await expect(escrow.connect(signer1).deposit(signer2.address, {value: 1234})).to.emit(escrow, "Deposited");
    });

    it("deposit should throw if amount is <= 0", async function () {
        const Escrow = await ethers.getContractFactory("Escrow");
        const escrow = await Escrow.deploy();
        await escrow.deployed();

        const [owner, signer1, signer2] = await ethers.getSigners();
        const initialBalance = ethers.BigNumber.from(await ethers.provider.getBalance(signer1.address));

        await expect(escrow.connect(signer1).deposit(signer2.address, {value: 0})).to.be.revertedWith('Amount must be greater than 0');
    });

    it("deposit should throw if not enough balance", async function () {
        const Escrow = await ethers.getContractFactory("Escrow");
        const escrow = await Escrow.deploy();
        await escrow.deployed();

        const [owner, signer1, signer2] = await ethers.getSigners();
        const initialBalance = ethers.BigNumber.from(await ethers.provider.getBalance(signer1.address));

        var expectedError;
        await escrow.connect(signer1).deposit(signer2.address, {value: initialBalance}).catch(error =>  {  expectedError = error; });

        expect(expectedError).to.be.an('error');
        expect(expectedError.message.startsWith("sender")).to.be.true;
    });


    it("claim should throw if payment doesn't exist", async function () {
        const Escrow = await ethers.getContractFactory("Escrow");
        const escrow = await Escrow.deploy();
        await escrow.deployed();

        const [owner, signer1, signer2] = await ethers.getSigners();

        await expect(escrow.connect(signer1).claim("123")).to.be.revertedWith("Payment doesn't exist");
    });

    it("claim should throw if payment is not for you", async function () {
        const Escrow = await ethers.getContractFactory("Escrow");
        const escrow = await Escrow.deploy();
        await escrow.deployed();

        const [owner, signer1, signer2, signer3] = await ethers.getSigners();

        const value = 10000;
        const receipt = await escrow.connect(signer1).deposit(signer3.address, {value: value});

        await expect(escrow.connect(signer2).claim("0")).to.be.revertedWith("Payment is not for you");
    });

    it("claim must transfer ether", async function () {
        const Escrow = await ethers.getContractFactory("Escrow");
        const escrow = await Escrow.deploy();
        await escrow.deployed();

        const [owner, signer1, signer2] = await ethers.getSigners();

        const value = 100000;
        await escrow.connect(signer1).deposit(signer2.address, {value: value});

        const initialBalance = ethers.BigNumber.from(await ethers.provider.getBalance(signer2.address));

        const receipt = await escrow.connect(signer2).claim("0");

        const newBalance = ethers.BigNumber.from(await ethers.provider.getBalance(signer2.address));

        const latestBlock = await ethers.provider.getBlock("latest")
        const gasUsed = latestBlock.gasUsed;

        // new balance = initial balance - (value + (gas used * gas price))
        expect(newBalance).to.be.equal(initialBalance.add(value).sub(receipt.gasPrice.mul(gasUsed)));
    });

    it("claim should emit Withdrawn event", async function () {
        const Escrow = await ethers.getContractFactory("Escrow");
        const escrow = await Escrow.deploy();
        await escrow.deployed();

        const [owner, signer1, signer2] = await ethers.getSigners();

        const value = 100000;
        await escrow.connect(signer1).deposit(signer2.address, {value: value});

        const initialBalance = ethers.BigNumber.from(await ethers.provider.getBalance(signer2.address));

        await expect(escrow.connect(signer2).claim("0")).to.emit(escrow, "Withdrawn");
    });

    it("claim must delete payment", async function () {
        const Escrow = await ethers.getContractFactory("Escrow");
        const escrow = await Escrow.deploy();
        await escrow.deployed();

        const [owner, signer1, signer2] = await ethers.getSigners();

        const value = 100000;
        await escrow.connect(signer1).deposit(signer2.address, {value: value});

        const payments = await escrow.connect(signer2).getPayments();

        expect(payments).to.have.length(1);

        const expected = {
            id: 0,
            from: signer1.address,
            amount: value,
            isValue: true
        };

        const actual = {
            id: payments[0].id.toNumber(),
            from: payments[0].from.toString(),
            amount: payments[0].amount.toNumber(),
            isValue: payments[0].isValue
        };

        expect(actual).to.deep.include(expected);

        const receipt = await escrow.connect(signer2).claim("0");

        const paymentsAfterClaim = await escrow.connect(signer2).getPayments();

        expect(paymentsAfterClaim).to.have.length(0);
    });

    // TODO tests for expiration and refund
});
