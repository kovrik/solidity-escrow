//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "hardhat/console.sol";

contract Escrow is ReentrancyGuard {

    // payments expire in 1 day
    uint256 private EXPIRATION = 1 days;

    uint256 private paymentCounter = 0;

    // IDs of all unclaimed payments
    uint256[] private paymentIds;

    // mapping of payment_id => Payment
    mapping(uint256 => Payment) private payments;

    // events
    event Deposited(uint256 id);
    event Withdrawn(uint256 id);

    struct Payment {
        uint256 id;
        address from;
        address payable to;
        uint256 amount;
        uint256 expiresAt;
        bool isValue;
    }

    constructor () {}

    fallback() external {
        console.log("Called a fallback function");
    }

    receive() external payable {
        console.log("Called a payable function");
    }

    // returns all payments that were sent to msg.sender
    function getPayments()  public view returns (Payment[] memory) {
        console.log("Get payments");
        console.log("Escrow Account Balance (ETH): ", address(this).balance / (1 ether));
        console.log("msg.sender ", msg.sender);
        console.log("paymentIds.length ", paymentIds.length);

        uint256 resultSize = 0;
        
        for (uint256 i = 0; i < paymentIds.length; i++) {
            Payment memory payment = payments[paymentIds[i]];
            console.log("paymentIds[i]", payment.id);
            console.log("  payments[paymentIds[i]].from ", payment.from);
            console.log("  payments[paymentIds[i]].to ", payment.to);
            console.log("  payments[paymentIds[i]].amount ", payment.amount);
            console.log("  payments[paymentIds[i]].to == msg.sender ", payment.to == msg.sender);
            console.log("  payments[paymentIds[i]].expiresAt", payment.expiresAt);
            console.log("  payments[paymentIds[i]].isValue", payment.isValue);
            console.log("  payments[paymentIds[i]].expired?", block.timestamp > payment.expiresAt);
            console.log("");
            if (payment.to == msg.sender && block.timestamp <= payment.expiresAt) {
                resultSize++;
            }
        }
        console.log("result size ", resultSize);

        uint256 j = 0;
        Payment[] memory result = new Payment[](resultSize);
        for (uint256 i = 0; i < paymentIds.length; i++) {
            Payment memory payment = payments[paymentIds[i]];
            if (payment.to == msg.sender &&  block.timestamp <= payment.expiresAt) {
                result[j] = payments[i];
                j++;
            }
        }
        return result;
    }


    // creates new payment (deposit)
    function deposit(address payable userAddressId) public payable nonReentrant {
        require(msg.value > 0, "Amount must be greater than 0");
        require(msg.sender.balance >= msg.value, "You don't have enough money");

        // TODO generate unique id?
        /* uint256 id = uint(keccak256(abi.encodePacked(block.difficulty, block.timestamp, paymentCounter++))); */
        uint256 id = paymentCounter++;

        payments[id] = Payment(id, msg.sender, userAddressId, msg.value, block.timestamp + EXPIRATION, true);
        paymentIds.push(id);

        emit Deposited(id);
    }


    // claims a payment (withdrawal)
    function claim(uint256 paymentId) public nonReentrant {
        require(payments[paymentId].isValue, "Payment doesn't exist");

        Payment memory payment = payments[paymentId];
        require(msg.sender == payment.to, "Payment is not for you");

        // check expiry
        bool hasExpired = block.timestamp > payment.expiresAt;
        address sendTo;
        if (hasExpired) {
            console.log("Payment has expired!");
            // refund to sender
            sendTo = payment.from;
        } else  { 
            sendTo = payment.to;
        }

        delete payments[paymentId];

        console.log("Escrow Account Balance (ETH): ", address(this).balance / (1 ether));
        console.log("  Payment Claimed: ", payment.id);
        console.log("  Payment Amount: ", payment.amount / (1 ether));
        console.log("  Payment To: ", payment.to);

        (bool sent,) = sendTo.call{value: payment.amount}("");
        require(sent, "Failed to send Ether");

        emit Withdrawn(paymentId);
    }
}
