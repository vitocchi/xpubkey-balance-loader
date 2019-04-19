import * as bip32 from 'bip32';
import * as bitcoin from 'bitcoinjs-lib'
import * as request from 'request-promise';

const baseUrl = 'https://blockchain.info/rawaddr/';
// tslint:disable-next-line:no-var-requires
const bs58check = require('bs58check')

import { BIP32Interface } from 'bip32';

const network = bitcoin.networks.bitcoin

const node = bip32.fromBase58(
    ypubToXpub(
        'ypub6XGKqgJxKyLTsMoR12bRegz4eujtM7PGdhVe95vaRk1oeLxzWzzjBUi9nNGiy48gyaiw7jxzRz1Wb2vMdyceewtoBfcEJ3i5JBCEBiLyYKG'
        )
    );

getAccountBalance(node)

function getAccountBalance(account: bitcoin.BIP32Interface) {
    const child = account.derive(0).derive(0);
    getNodeBalance(child)
}

function getNodeBalance(node: bitcoin.BIP32Interface) {
    const p2wpkhPayment = bitcoin.payments.p2wpkh({ pubkey: node.publicKey, network })
    const p2shPayment = bitcoin.payments.p2sh({
        network,
        redeem: p2wpkhPayment
    })
    if (p2shPayment.address !== undefined) {
        getBalance(p2shPayment.address)
    } else {
        console.log('error address is undefined')
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

function getBalance(address: string) {
    request.get({
        uri: baseUrl + address
    }).then((result) => {
        console.log(result)
    })
}
