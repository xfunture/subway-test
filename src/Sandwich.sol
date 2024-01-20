// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
// pragma solidity >=0.5.0 <0.6.0;
import "./IERC20.sol";
import "./SafeTransfer.sol";

contract Sandwich{
    uint256 public x;
    // using SafeTransfer for IERC20;

    address internal user;
    bytes4 internal constant ERC20_TRANSFER_ID = 0xa9059cbb;
    bytes4 internal constant PAIR_SWAP_ID = 0x022c0d9f;
    

    receive() external payable{}

    constructor(address _owner){
        user = _owner;
    }

    function recoverERC20(address token) public {
        require(msg.sender == user,"shoo");
        IERC20(token).transfer(
            msg.sender,
            IERC20(token).balanceOf(address(this))
        );
    }


    fallback() external payable {}


    // fallback() external payable{
    //     assembly  {
    //         let value := calldataload(0x00)
    //         sstore(x.slot,value)
    //     }
    // }
}