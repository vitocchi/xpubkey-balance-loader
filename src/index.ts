import * as bitcoin from 'bitcoinjs-lib'
import * as request from 'request-promise';

const baseUrl = 'https://blockchain.info/rawaddr/';
// tslint:disable-next-line:no-var-requires
const bs58check = require('bs58check')

const network = bitcoin.networks.bitcoin

const account = bitcoin.bip32.fromBase58(
    ypubToXpub(
        'ypub6XGKqgJxKyLTsMoR12bRegz4eujtM7PGdhVe95vaRk1oeLxzWzzjBUi9nNGiy48gyaiw7jxzRz1Wb2vMdyceewtoBfcEJ3i5JBCEBiLyYKG'
        )
    );

getAccountBalance(account).then((balance) => {
    console.log('totalbalance!')
    console.log(balance)
}).catch((err) => {
    console.log('error!')
    console.log(err)
})

async function getAccountBalance(accountNode: bitcoin.BIP32Interface) {
    const external = accountNode.derive(0)
    const internal = accountNode.derive(1);
    let accountBalance = 0
    accountBalance += await getChangeBalance(external)
    accountBalance += await getChangeBalance(internal)
    return accountBalance
}

async function getChangeBalance(changeNode: bitcoin.BIP32Interface) {
    let changeBalance = 0
    let indexNode: bitcoin.BIP32Interface
    for (let i = 0, gap = 0; i < 2147483647 /*2^31*/ && gap < 20; i++) {
        indexNode = changeNode.derive(i)
        const nodeInfo = await getNodeInfo(indexNode)
        if (nodeInfo.isUsed) {
            changeBalance += nodeInfo.balance
        } else {
            gap ++
        }
    }
    return changeBalance
}

async function getNodeInfo(node: bitcoin.BIP32Interface) {
    const p2wpkhPayment = bitcoin.payments.p2wpkh({ pubkey: node.publicKey, network })
    const p2shPayment = bitcoin.payments.p2sh({
        network,
        redeem: p2wpkhPayment
    })
    if (p2shPayment.address !== undefined) {
        return getAddressInfo(p2shPayment.address)
    } else {
        throw new Error('address is undefined')
    }
}

async function getAddressInfo(address: string) {
    const response = await request.get({
        uri: baseUrl + address
    })
    const obj = JSON.parse(response)
    if (obj.n_tx === 0) {
        return new NodeInfo(false, 0)
    } else {
        console.log(obj.final_balance)
        return new NodeInfo(true, obj.final_balance)
    }
}

class NodeInfo {
    public isUsed: boolean;
    public balance: number;
    constructor(isUsed: boolean, balance: number) {
        this.isUsed = isUsed
        this.balance = balance
    }
}

function ypubToXpub(ypub: string): string {
    let data = bs58check.decode(ypub)
    data = data.slice(4)
    data = Buffer.concat([Buffer.from('0488b21e', 'hex'), data])
    const ret = bs58check.encode(data)
    console.log(ret)
    return ret
}
