// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "./IERC20.sol";
import "./SafeTransfer.sol";

interface IUniswapV2Pair {
    function swap(
        uint amount0Out,
        uint amount1Out,
        address to,
        bytes calldata data
    ) external;
}

contract Sandwich {
    using SafeTransfer for IERC20;

    address internal immutable user;
    bytes4 internal constant ERC20_TRANSFER_ID = 0xa9059cbb;
    bytes4 internal constant PAIR_SWAP_ID = 0x022c0d9f;

    receive() external payable {}

    constructor(address _owner) {
        user = _owner;
    }

    function recoverERC20(address token) public {
        // same code here...
    }

    function swap(
        address token,
        address pair,
        uint128 amountIn,
        uint128 amountOut,
        uint8 tokenOutNo
    ) external payable {
        require(msg.sender == user, "Not the owner");
        IERC20(token).transfer(pair, amountIn);
        if (tokenOutNo == 0) {
            IUniswapV2Pair(pair).swap(amountOut, 0, address(this), "");
        } else {
            IUniswapV2Pair(pair).swap(0, amountOut, address(this), "");
        }
    }

    fallback() external payable {
       // same code here...
    }
}