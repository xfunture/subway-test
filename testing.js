const { ethers } = require('ethers');

const SANDWICH_ADDRESS = '0xE2b5bDE7e80f89975f7229d78aD9259b2723d11F';
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const WETH_USDT_PAIR_ADDRESS = '0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852';
const WETH_TOKEN_0 = 1;
const DECIMALS = {
    WETH: 18,
    USDT: 6
};

const SANDWICH_ABI = require('./out/Sandwich.sol/Sandwich.json').abi; // ABI returned from Foundry compile
const WETH_ABI = require('./weth.json'); // I got the ABI from Etherscan

const calcNextBlockBaseFee = (curBlock) => {
    const baseFee = curBlock.baseFeePerGas;
    const gasUsed = curBlock.gasUsed;
    const targetGasUsed = curBlock.gasLimit.div(2);
    const delta = gasUsed.sub(targetGasUsed);

    const newBaseFee = baseFee.add(
        baseFee.mul(delta).div(targetGasUsed).div(ethers.BigNumber.from(8))
    );

    // Add 0-9 wei so it becomes a different hash each time
    const rand = Math.floor(Math.random() * 10);
    return newBaseFee.add(rand);
};

async function main() {
    const PUBLIC = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const PRIVATE = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

    const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545'); // anvil
    const wallet = new ethers.Wallet(PRIVATE, provider);
    const { chainId } = await provider.getNetwork();

    // SETUP: create contract instances
    const sandwich = new ethers.Contract(SANDWICH_ADDRESS, SANDWICH_ABI, wallet);
    const weth = new ethers.Contract(WETH_ADDRESS, WETH_ABI, wallet);
    const usdt = new ethers.Contract(USDT_ADDRESS, WETH_ABI, wallet);

    ////////////////////////
    // STEP 1: Wrap 1 ETH //
    ////////////////////////
    console.log('\n===== Wrapping ETH =====');

    let wethBalance = await weth.balanceOf(PUBLIC);
    console.log('- WETH balance before: ', wethBalance.toString());

    // simply send 2 ETH to WETH contract
    await wallet.sendTransaction({
        to: WETH_ADDRESS,
        value: ethers.utils.parseEther('2'),
    });

    wethBalance = await weth.balanceOf(PUBLIC);
    console.log('- WETH balance after: ', wethBalance.toString());

    ///////////////////////////////////////////////////////////////////////////////
    // STEP 2: Transfer WETH to Sandwich contract so we can use it on Uniswap V2 //
    ///////////////////////////////////////////////////////////////////////////////
    console.log('\n===== Transferring WETH =====');

    let calldata = weth.interface.encodeFunctionData(
        'transfer',
        [
            SANDWICH_ADDRESS,
            ethers.utils.parseUnits('1', DECIMALS.WETH),
        ]
    );
    let signedTx = await wallet.signTransaction({
        to: WETH_ADDRESS, // call transfer on WETH
        from: PUBLIC,
        data: calldata,
        chainId,
        maxPriorityFeePerGas: 0,
        maxFeePerGas: calcNextBlockBaseFee(await provider.getBlock()),
        gasLimit: 3000000,
        nonce: await wallet.getTransactionCount(),
        type: 2,
    });
    let txResponse = await provider.sendTransaction(signedTx);
    let receipt = await provider.getTransactionReceipt(txResponse.hash);
    // console.log('- WETH transfer gas used: ', receipt.gasUsed.toString());

    wethBalance = await weth.balanceOf(SANDWICH_ADDRESS);
    console.log('- WETH balance before swap: ', wethBalance.toString());

    let usdtBalance = await usdt.balanceOf(SANDWICH_ADDRESS);
    console.log('- USDT balance before swap: ', usdtBalance.toString());

    //////////////////////////////////////////////////////////
    // STEP 3: Calling "swap" function on Sandwich contract //
    //////////////////////////////////////////////////////////
    console.log('\n===== Calling Swap =====');

    calldata = sandwich.interface.encodeFunctionData(
        'swap',
        [
            WETH_ADDRESS,
            WETH_USDT_PAIR_ADDRESS,
            ethers.utils.parseUnits('0.5', DECIMALS.WETH),
            ethers.utils.parseUnits('950', DECIMALS.USDT), // the current rate is 976, change accordingly
            WETH_TOKEN_0 ? 1 : 0, // out token is 1 if WETH is token 0
        ]
    );
    signedTx = await wallet.signTransaction({
        to: SANDWICH_ADDRESS, // calling swap on Sandwich
        from: PUBLIC,
        data: calldata,
        chainId,
        maxPriorityFeePerGas: 0,
        maxFeePerGas: calcNextBlockBaseFee(await provider.getBlock()),
        gasLimit: 3000000,
        nonce: await wallet.getTransactionCount(),
        type: 2,
    });
    txResponse = await provider.sendTransaction(signedTx);
    receipt = await provider.getTransactionReceipt(txResponse.hash);
    console.log('- Swap gas used: ', receipt.gasUsed.toString());

    wethBalance = await weth.balanceOf(SANDWICH_ADDRESS);
    console.log('- WETH balance after swap: ', wethBalance.toString());

    usdtBalance = await usdt.balanceOf(SANDWICH_ADDRESS);
    console.log('- USDT balance after swap: ', usdtBalance.toString());

    ////////////////////////////////////////////////////////////
    // STEP 4: Calling fallback function on Sandwich contract //
    ////////////////////////////////////////////////////////////
    console.log('\n===== Calling Fallback =====');

    calldata = ethers.utils.solidityPack(
        ['address', 'address', 'uint128', 'uint128', 'uint8'],
        [
            WETH_ADDRESS,
            WETH_USDT_PAIR_ADDRESS,
            ethers.utils.parseUnits('0.5', DECIMALS.WETH),
            ethers.utils.parseUnits('950', DECIMALS.USDT),
            WETH_TOKEN_0 ? 1 : 0,
        ]
    );
    signedTx = await wallet.signTransaction({
        to: SANDWICH_ADDRESS,
        from: PUBLIC,
        data: calldata,
        chainId,
        maxPriorityFeePerGas: 0,
        maxFeePerGas: calcNextBlockBaseFee(await provider.getBlock()),
        gasLimit: 3000000,
        nonce: await wallet.getTransactionCount(),
        type: 2,
    });
    txResponse = await provider.sendTransaction(signedTx);
    receipt = await provider.getTransactionReceipt(txResponse.hash);
    console.log('- Assembly gas used: ', receipt.gasUsed.toString());

    wethBalance = await weth.balanceOf(SANDWICH_ADDRESS);
    console.log('- WETH balance after swap: ', wethBalance.toString());

    usdtBalance = await usdt.balanceOf(SANDWICH_ADDRESS);
    console.log('- USDT balance after swap: ', usdtBalance.toString());
}

(async () => {
    await main();
})();