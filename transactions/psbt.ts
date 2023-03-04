import { 
  NetworkType, 
  Account
} from '../types';

import { 
  getBitcoinDerivationPath,
  getTaprootDerivationPath,
  getSegwitDerivationPath
} from '../wallet';
import * as btc from 'micro-btc-signer';
import { hex } from '@scure/base';
import { getAddressInfo } from 'bitcoin-address-validation';

import * as bip39 from 'bip39';
import { bip32 } from 'bitcoinjs-lib';

export interface InputToSign {
  address: string,
  signingIndexes: Array<number>,
  sigHash?: number,
}

export interface PrivateKeyMap {
  [address: string] : string;
} 

export function getSigningDerivationPath(
  accounts: Array<Account>, 
  address: string,
  network: NetworkType
) : string {
  const { type } = getAddressInfo(address);
  
  if (accounts.length <=0 ) {
    throw new Error('Invalid accounts list')
  }

  var path = '';

  accounts.forEach((account, index) => {
    if (type === 'p2sh') {
      if (account.btcAddress === address) {
        path = getBitcoinDerivationPath({ index: BigInt(index), network})
      }
    } else if (type === 'p2wpkh') {
      if (account.btcAddress === address) {
        path = getSegwitDerivationPath({ index: BigInt(index), network})
      } 
    } else if (type === 'p2tr') {
      if (account.ordinalsAddress === address) {
        path = getTaprootDerivationPath({ index: BigInt(index), network})
      }
    } else {
      throw new Error('Unsupported address type')
    }
  })

  return path;
}

export async function signPsbt(
  seedPhrase: string,
  accounts: Array<Account>,
  inputsToSign: Array<InputToSign>,
  psbtHex: string,
  finalize: boolean = false,
  network?: NetworkType
): Promise<string> {
  if (psbtHex.length <= 0) {
    throw new Error('Invalid transaction hex');
  }

  // decode raw tx
  var psbt: btc.Transaction;
  try {
    psbt = btc.Transaction.fromPSBT(Buffer.from(psbtHex, 'hex'));
  } catch (error) {
    throw new Error('Error decoding transaction hex');
  }

  const seed = await bip39.mnemonicToSeed(seedPhrase);
  const master = bip32.fromSeed(seed);

  try {
    // Get signing derivation path
    const networkType = network ?? "Mainnet";

    var addressPrivateKeyMap: PrivateKeyMap = {};

    inputsToSign.forEach((inputToSign) => {
      const address: string = inputToSign.address;
      if (!(address in addressPrivateKeyMap)) {
        const signingDerivationPath = getSigningDerivationPath(accounts, address, networkType);
        const child = master.derivePath(signingDerivationPath);
        const privateKey = child.privateKey!.toString('hex');
        addressPrivateKeyMap[address] = privateKey;
      }
    });

    // Sign inputs at indexes
    inputsToSign.forEach((inputToSign) => {
      const privateKey = addressPrivateKeyMap[inputToSign.address];
      inputToSign.signingIndexes.forEach((signingIndex) => {
        if (inputToSign.sigHash) {
          psbt.signIdx(hex.decode(privateKey), signingIndex, [inputToSign.sigHash]);
        } else {
          psbt.signIdx(hex.decode(privateKey), signingIndex);
        }
      })
    })

    if (finalize) {
      psbt.finalize();
    }
  } catch (error) {
    throw new Error (`Error signing PSBT ${error.toString()}`)
  }

  return psbt.hex;
}
