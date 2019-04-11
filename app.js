var express = require('express');
var bitcoin = require('bitcoinjs-lib');

var app = express();

const network = bitcoin.networks.testnet

var server = app.listen(3000, function() {
    console.log("Node.js is listening to PORT:" + server.address().port)
})

app.get('/', function(req, res, next) {
    res.json('xpubkey-balance-loader')
})

app.get('/xpub/:xpub', function(req, res, next) {
    childXpub = deriveChildXpubKey(req.params.xpub, 0)
    address = getAddress(childXpub, network)
    res.json(address)
})

function deriveChildXpubKey(xpub /*base58エンコーディング*/ , index) {
    return bitcoin.bip32.fromBase58(xpub, network).derive(parseInt(index))
}

function getAddress(node, network) {
    return bitcoin.payments.p2pkh({
        pubkey: node.publicKey,
        network
    }).address
}