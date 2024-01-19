const {ethers} = require('ethers');

const ABI = require('./out/Sandwith.sol/Sandwith.json').abi;
const ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';        //we'll get this address from below

const calcNextBlockBaseFee = (curBlock) => {
        // taken from: https://github.com/libevm/subway/blob/master/bot/src/utils.js
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
}


async function main(){
    // referenced: https://github.com/libevm/subway/blob/master/bot/index.js
    // public, private key generated from Anvil
    const PUBLIC = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const PRIVATE = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545'); //Anvil RPC
    const wallet = new ethers.Wallet(PRIVATE,provider);
    const { chainId} = await provider.getNetwork();

    const sandwith = new ethers.Contract(ADDRESS,ABI,wallet);

    //before call
    let x = await sandwith.x();
    console.log(`Before: ${x.toString()}`);
    //send transaction
    const block = await provider.getBlock();
    const baseFeePerGas = block.baseFeePerGas;
    const maxPriorityFeePerGas = block.maxPriorityFeePerGas
    const maxFeePerGas = block.maxFeePerGas;
    const nextBaseFee = calcNextBlockBaseFee(block);
    const nonce = await wallet.getTransactionCount();
    // you don't need a function signature to call fallback function
    const payload = ethers.utils.solidityPack(
        ['uint256'],
        [10]
    );
    // console.log("baseFeePerGas:",baseFeePerGas.toNumber());
    // console.log('maxPriorityFeePerGas:',maxPriorityFeePerGas);
    // console.log('maxFeePerGas:',maxFeePerGas);
    // console.log("nextBaseFee:",nextBaseFee.toNumber());
    // console.log("gwei:",1* 10 ** 9);

    // console.log(payload);
    const tx = {
        to:ADDRESS,                 // the address of Sandwich contract  which deploy in Anvil
        from:PUBLIC,
        data:payload,
        chainId,
        maxPriorityFeePerGas:1 * 10 ** 8, // 1 gwei
        maxFeePerGas: nextBaseFee,
        gasLimit:250000,
        nonce,
        type:2,
    };
    const signed = await wallet.signTransaction(tx);
    const res = await provider.sendTransaction(signed);
    const receipt = await provider.getTransactionReceipt(res.hash);
    console.log(receipt.gasUsed.toString());

    // after call
    x = await sandwith.x();
    console.log(`After ${x.toString()}`);
}




(async () => {
    await main();   
})();