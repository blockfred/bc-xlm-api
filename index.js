const fetch = require('node-fetch')
const query = require('micro-query')
const redirect = require('micro-redirect')

const BLOCKCHAIN_API = 'https://api.blockchain.info/price/index-series'

const CC_API_MIN = 'https://min-api.cryptocompare.com/data/histominute'
const CC_API_HOUR = 'https://min-api.cryptocompare.com/data/histohour'
const CC_API_DAY = 'https://min-api.cryptocompare.com/data/histoday'


let CACHE = {}

const getCacheData = async (quote, start, scale) => {
}

const getData = async (scale, quote) => {
  const toSym = ( quote || 'usd' ).toUpperCase()
  switch(scale) {
    case '900':
      return fetchData(CC_API_MIN, 'XLM', toSym, 1440, 15)
    case '3600':
      return fetchData(CC_API_HOUR, 'XLM', toSym, 168, 1)
    case '7200':
      return fetchData(CC_API_HOUR, 'XLM', toSym, 730, 2)
    case '86400':
      return fetchData(CC_API_DAY, 'XLM', toSym, 365, 1)
    default:
      return fetchData(CC_API_DAY, 'XLM', toSym, 655, 5)
  }
}

const getCacheKey = (url) => {
  let now = Date.now()/1000
  let roundedTime = now - now % 180
  return `${url}:${roundedTime}`
}

const fetchData = async (url, fsym, tsym, limit, combine) => {
  const requestURL = `${url}?fsym=${fsym}&tsym=${tsym}&limit=${limit}`
  const key = getCacheKey(requestURL)

  if (key in CACHE) {
    console.log('key in cache')
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

module.exports = async (req, res) => {
  const params = query(req)
  const { quote, start, scale, base } = params

  console.log('params', params)

  if (base && base.toLowerCase() === 'xlm') {
    const data = await getData(scale, quote)
    return data
  } else {
    const i = req.url.indexOf('?')
    const rurl = i > -1 ? req.url.substr(i) : ''
    const loc = BLOCKCHAIN_API + rurl
    redirect(res, 302, loc)
  }
}
