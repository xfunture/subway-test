// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
contract Sandwich{
    uint256 public x;
    receive() external payable{

    }

    fallback() external payable{
        assembly  {
            let value := calldataload(0x00)
            sstore(x.slot,value)
        }
    }
}