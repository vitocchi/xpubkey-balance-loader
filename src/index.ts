//
//
// bip44で定義されたpath構造
// Purpose/CoinType/Account/Change/Index
// Accountまでは強化導出され、ウォレットは一般にAccountに当たるノードの拡張公開鍵を出力してくる
// Change 0 => 受け取り用
// Change 1 => おつりよう
// Index => 各支払いで一回だけ使う
// https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki#Index
//
//
import * as bitcoin from 'bitcoinjs-lib'
import * as request from 'request-promise';
// tslint:disable-next-line:no-var-requires
const bs58check = require('bs58check')

// blockchain exlolerのurl
const baseUrl = 'https://blockchain.info/rawaddr/';

const network = bitcoin.networks.bitcoin

// ノードの情報
class NodeInfo {
    public isUsed: boolean;
    public balance: number;
    constructor(isUsed: boolean, balance: number) {
        this.isUsed = isUsed
        this.balance = balance
    }
}

// 調べるacountの初期化
const account = bitcoin.bip32.fromBase58(
    ypubToXpub(
        'ypub6XGKqgJxKyLTsMoR12bRegz4eujtM7PGdhVe95vaRk1oeLxzWzzjBUi9nNGiy48gyaiw7jxzRz1Wb2vMdyceewtoBfcEJ3i5JBCEBiLyYKG'
        )
    );

// accountの残高を調べる
getAccountBalance(account).then((balance) => {
    console.log('totalbalance!')
    console.log(balance)
}).catch((err) => {
    console.log('error!')
    console.log(err)
})

// accountの残高を調べる
async function getAccountBalance(accountNode: bitcoin.BIP32Interface) {
    const external = accountNode.derive(0)
    const internal = accountNode.derive(1);
    let accountBalance = 0
    console.log('searching external nodes')
    accountBalance += await getChangeBalance(external)

    console.log('searching internal nodes')
    accountBalance += await getChangeBalance(internal)
    return accountBalance
}

// 受け取り用、もしくはお釣り用のNodeたちの合計残高を調べる
async function getChangeBalance(changeNode: bitcoin.BIP32Interface) {
    let changeBalance = 0
    let indexNode: bitcoin.BIP32Interface
    // 利用されていないNodeが20個続いたら、それ移行は検索をストップする(bip44で規定済み)
    for (let i = 0, gap = 0; i < 2147483647 /*2^31*/ && gap < 20; i++) {
        indexNode = changeNode.derive(i)
        const nodeInfo = await getNodeInfo(indexNode)
        if (nodeInfo.isUsed) {
            gap = 0;
            changeBalance += nodeInfo.balance
        } else {
            gap ++
        }
    }
    return changeBalance
}

// Nodeの情報を調べる
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

// アドレスの残高を調べる(blockchain explolerに問い合わせる)
async function getAddressInfo(address: string) {
    const response = await request.get({
        uri: baseUrl + address
    })
    const obj = JSON.parse(response)
    if (obj.n_tx === 0) {
        return new NodeInfo(false, 0)
    } else {
        return new NodeInfo(true, obj.final_balance)
    }
}

// ypubをxpubに変換する(trezorなどの独自対応？bitcoinjs-libは対応していないので自分でやる必要がある)
function ypubToXpub(ypub: string): string {
    let data = bs58check.decode(ypub)
    data = data.slice(4)
    data = Buffer.concat([Buffer.from('0488b21e', 'hex'), data])
    const ret = bs58check.encode(data)
    return ret
}
