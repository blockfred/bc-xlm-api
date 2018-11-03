const fetch = require('node-fetch')
const query = require('micro-query')
const redirect = require('micro-redirect')

const BC_API = 'https://api.blockchain.info'

const HIST_ROUTE = '/price/index-series'
const PRICE_ROUTE = '/price/index'

const CC_API_MIN = 'https://min-api.cryptocompare.com/data/histominute'
const CC_API_HOUR = 'https://min-api.cryptocompare.com/data/histohour'
const CC_API_DAY = 'https://min-api.cryptocompare.com/data/histoday'
const CC_API_PRICE = 'https://min-api.cryptocompare.com/data/pricehistorical'


let CACHE = {}
let TIME_ROUND = 180

const getHistData = async (scale, quote) => {
  const toSym = ( quote || 'usd' ).toUpperCase()
  switch(scale) {
    case '900':
      return fetchHistData(CC_API_MIN, 'XLM', toSym, 1440, 15)
    case '3600':
      return fetchHistData(CC_API_HOUR, 'XLM', toSym, 168, 1)
    case '7200':
      return fetchHistData(CC_API_HOUR, 'XLM', toSym, 730, 2)
    case '86400':
      return fetchHistData(CC_API_DAY, 'XLM', toSym, 365, 1)
    default:
      return fetchHistData(CC_API_DAY, 'XLM', toSym, 655, 5)
  }
}

const getPriceData = async (quote, time) => {
  const toSym = ( quote || 'usd' ).toUpperCase()

  return fetchPriceData(CC_API_PRICE, 'XLM', toSym, time)
}

const getRoundTime = (time) => {
  const ts = time ? time : Date.now() / 1000
  return ts - ts % TIME_ROUND
}

const getCacheKey = (url, append) => {
  return `${url}:${append}}`
}

const fetchHistData = async (url, fsym, tsym, limit, combine) => {
  const requestURL = `${url}?fsym=${fsym}&tsym=${tsym}&limit=${limit}`
  const key = getCacheKey(requestURL, getRoundTime())

  if (key in CACHE) {
    return CACHE[key]
  }

  const request = await fetch(requestURL)
  const data = await request.json()

  const array = data["Data"] || []

  const mapped = array.map(data => ({
    timestamp: data.time,
    price: data.close,
    volume24h: data.volumeto,
  }))

  const filtered = mapped.filter((item, i) => i % combine === 0)

  CACHE[key] = filtered
  return filtered
}

const fetchPriceData = async(url, fsym, tsym, time) => {
  let timestamp = getRoundTime(time)
  let requestURL = `${url}?fsym=${fsym}&tsyms=${tsym}&ts=${timestamp}`

  const key = getCacheKey(requestURL, 0)

  if (key in CACHE) {
    return CACHE[key]
  }

  const request = await fetch(requestURL)
  const data = await request.json()

  const transformed = {
    timestamp,
    price: data[fsym][tsym],
    volume24h: 0,
  }

  CACHE[key] = transformed
  return transformed
}

module.exports = async (req, res) => {
  const params = query(req)
  const { quote, start, scale, base, time } = params
  const baseIsXLM = base && base.toLowerCase() === 'xlm' ? true : false

  console.log('params', params)
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (baseIsXLM && req.url.startsWith(HIST_ROUTE)) {
    const data = await getHistData(scale, quote)
    return data
  } else if (baseIsXLM && req.url.startsWith(PRICE_ROUTE)) {
    const data = await getPriceData(quote, time)
    return data
  } else {
    const loc = BC_API + req.url
    redirect(res, 302, loc)
  }
}
