import axios from 'axios';
import BigNumber from 'bignumber.js';
import { API_TIMEOUT_MILLI, XVERSE_API_BASE_URL } from 'constant';

export async function fetchBtcFeeRate(): Promise<BigNumber> {
  return axios
    .get(`${XVERSE_API_BASE_URL}/v1/fees/btc`, { timeout: API_TIMEOUT_MILLI })
    .then((response) => {
      return new BigNumber(response.regular.toString());
    });
}

export async function fetchStxToBtcRate(): Promise<BigNumber> {
  return axios
    .get(`${XVERSE_API_BASE_URL}/v1/prices/stx/btc`, { timeout: API_TIMEOUT_MILLI })
    .then((response) => {
      return new BigNumber(response.stxBtcRate.toString());
    });
}

export async function fetchBtcToCurrencyRate({
  fiatCurrency,
}: {
  fiatCurrency: SupportedCurrency;
}): Promise<BigNumber> {
  return axios
    .get(`${XVERSE_API_BASE_URL}/v1/prices/btc/${fiatCurrency}`, { timeout: API_TIMEOUT_MILLI })
    .then((response) => {
      return new BigNumber(response.btcFiatRate.toString());
    });
}

export async function fetchTokenFiateRate(ft: string): Promise<BigNumber> {
  const url = `${XVERSE_API_BASE_URL}/v1/prices/${ft}/${fiatCurrency}`;

  return axios
    .get<TokenFiatRateResponse>(url, { timeout: API_TIMEOUT_MILLI })
    .then((response) => {
      return new BigNumber(response.data.tokenFiatRate);
    })
    .catch((error) => {
      return new BigNumber(0);
    });
}

export async function getCoinsInfo(contractids: string[]): Promise<CoinsResponse | null> {
  const fiatCurrency: string = await getFiatCurrency();
  const url = `${XVERSE_API_BASE_URL}/v1/coins`;

  const requestBody = {
    currency: fiatCurrency,
    coins: JSON.stringify(contractids),
  };

  return axios
    .post<CoinsResponse>(url, requestBody)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      return null;
    });
}
