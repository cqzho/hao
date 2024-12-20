// ignore
import { WebApiBase, VideoClass } from '../core/uzCode.js'
import { parse } from 'node-html-parser'
// ignore

class nkvodClass extends WebApiBase {
    constructor() {
        super()
        this.webSite = 'https://nkvod.com'
        this.headers = {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Referer: this.webSite,
        }
        this.ignoreClassName = ['热搜榜', 'APP', '首页']
        this.parseMap = {}
    }

    async initParseMap() {
        const date = new Date()
        const t = '' + date.getFullYear() + (date.getMonth() + 1) + date.getDate()
        const url = this.webSite + '/static/js/playerconfig.js?t=' + t
        const js = (await req(url, { headers: this.headers })).data
        try {
            const jsEval = js + '\nMacPlayerConfig'
            const playerList = eval(jsEval).player_list
            const players = Object.values(playerList)
            players.forEach((item) => {
                if (!item.ps || item.ps === '0') return
                if (!item.parse) return
                this.parseMap[item.show] = item.parse
            })
        } catch (e) {
            UZUtils.debugLog(e)
        }
    }

    async getClassList(args) {
        await this.initParseMap()
        const webUrl = args.url
        this.webSite = this.removeTrailingSlash(webUrl)
        let backData = new RepVideoClassList()
        try {
            const pro = await req(webUrl, { headers: this.headers })
            backData.error = pro.error
            const proData = pro.data
            if (proData) {
                const list = [
                    // { type_id: 1, type_name: '電影' },
                    { type_id: 2, type_name: '電視劇' },
                    { type_id: 3, type_name: '綜藝' },
                    { type_id: 4, type_name: '動漫' },
                    { type_id: 13, type_name: '國產劇' },
                    { type_id: 14, type_name: '港台劇' },
                    { type_id: 15, type_name: '日韓劇' },
                    { type_id: 16, type_name: '歐美劇' },
                    { type_id: 20, type_name: '其他劇' },
                ]
                backData.data = list
            }
        } catch (e) {
            backData.error = e.message
        }

        return JSON.stringify(backData)
    }

    async getVideoList(args) {
        const listUrl =
            this.removeTrailingSlash(this.webSite) +
            `/index.php/ajax/data?mid=1&tid=${args.url}&page=${args.page}&limit=20`
        let backData = new RepVideoList()
        try {
            const pro = await req(listUrl, { headers: this.headers })
            backData.error = pro.error
            const proData = pro.data
            if (proData) {
                const allVideo = proData.list
                let videos = []
                allVideo.forEach((e) => {
                    let video = new VideoDetail()
                    video.vod_id = e.vod_id
                    video.vod_name = e.vod_name
                    video.vod_pic = e.vod_pic
                    video.vod_remarks = e.vod_remarks
                    videos.push(video)
                })
                backData.data = videos
            }
        } catch (error) {
            backData.error = '获取列表失败～' + error.message
        }
        return JSON.stringify(backData)
    }

    async getVideoDetail(args) {
        let backData = new RepVideoDetail()
        const webUrl = this.webSite + `/detail/${args.url}.html`
        try {
            const pro = await req(webUrl, { headers: this.headers })
            backData.error = pro.error
            const proData = pro.data
            if (proData) {
                const $ = cheerio.load(proData)
                let vod_content = $('.switch-box .text').text()
                let vod_pic = $('.detail-pic img').attr('data-src')
                let vod_name = $('.detail-info h3').text()
                // let detList = document.querySelectorAll('ewave-content__detail p.data')
                let vod_year = ''
                let vod_director = ''
                let vod_actor = ''
                let vod_area = ''
                let vod_lang = ''
                let vod_douban_score = ''
                let type_name = ''

                // let newDetList = []
                // detList.forEach((e) => {
                //     if (e.text.includes('/')) {
                //         let temp = e.text.split('/')
                //         newDetList = newDetList.concat(temp)
                //     } else newDetList.push(e.text)
                // })

                // for (let index = 0; index < newDetList.length; index++) {
                //     const element = newDetList[index].trim()
                //     if (element.includes('年份')) {
                //         vod_year = element.replace('年份：', '')
                //     } else if (element.includes('导演')) {
                //         vod_director = element.replace('导演：', '')
                //     } else if (element.includes('主演')) {
                //         vod_actor = element.replace('主演：', '')
                //     } else if (element.includes('地区')) {
                //         vod_area = element.replace('地区：', '')
                //     } else if (element.includes('语言')) {
                //         vod_lang = element.replace('语言：', '')
                //     } else if (element.includes('类型')) {
                //         type_name = element.replace('类型：', '')
                //     } else if (element.includes('豆瓣')) {
                //         vod_douban_score = element.replace('豆瓣：', '')
                //     }
                // }

                let from = []
                $('.anthology-tab > .swiper-wrapper a').each((index, element) => {
                    let name = $(element)
                        .contents()
                        .filter(function () {
                            return this.type === 'text'
                        })
                        .text()
                        .trim()
                    from.push(name)
                })
                // UZUtils.debugLog(from)

                let juJiDocment = $('.anthology-list-box')

                let vod_play_url = ''
                juJiDocment.each((index, element) => {
                    let line = from[index]
                    let allvideos = $(element).find('ul.anthology-list-play li a')
                    allvideos.each((index, element) => {
                        let playerUrl = this.combineUrl($(element).attr('href'))
                        vod_play_url += $(element).text()
                        vod_play_url += '$'
                        vod_play_url += line + '@@@' + playerUrl
                        vod_play_url += '#'
                    })
                    vod_play_url += '$$$'
                })
                // UZUtils.debugLog(vod_play_from)
                // UZUtils.debugLog(vod_play_url)

                let detModel = new VideoDetail()
                detModel.vod_year = vod_year
                detModel.type_name = type_name
                detModel.vod_director = vod_director
                detModel.vod_actor = vod_actor
                detModel.vod_area = vod_area
                detModel.vod_lang = vod_lang
                detModel.vod_douban_score = vod_douban_score
                detModel.vod_content = vod_content
                detModel.vod_pic = vod_pic
                detModel.vod_name = vod_name
                detModel.vod_play_url = vod_play_url
                detModel.vod_id = args.url
                detModel.vod_play_from = from.join('$$$')

                backData.data = detModel
            }
        } catch (e) {
            backData.error = '获取视频详情失败' + e.message
        }

        return JSON.stringify(backData)
    }

    /**
     * 获取视频的播放地址
     * @param {UZArgs} args
     * @returns {Promise<RepVideoPlayUrl>}
     */
    async getVideoPlayUrl(args) {
        let backData = new RepVideoPlayUrl()
        const parts = args.url.split('@@@')
        const from = parts[0]
        const url = parts[1]
        // let reqUrl = 'https://www.dandanju.tv/player/68893-1-28.html'

        try {
            const pro = await req(url, { headers: this.headers })
            backData.error = pro.error
            let proData = pro.data

            if (proData) {
                let $ = cheerio.load(proData)
                const js = JSON.parse($('script:contains(player_aaaa)').html().replace('var player_aaaa=', ''))
                let playUrl = js.url
                if (js.encrypt == 1) {
                    playUrl = unescape(playUrl)
                } else if (js.encrypt == 2) {
                    playUrl = unescape(this.base64Decode(playUrl))
                }
                if (/\.m3u8$/.test(playUrl)) {
                    backData.data = playUrl
                } else {
                    const parseUrl = this.parseMap[from]
                    if (parseUrl) {
                        const punycode = this.createPunycode()
                        let reqUrl = parseUrl + playUrl
                        reqUrl = punycode.toASCII(reqUrl)
                        // UZUtils.debugLog(reqUrl)
                        const parseReq = await req(reqUrl, { headers: this.headers })
                        const parseHtml = parseReq.data
                        const matches = parseHtml.match(/let ConFig = {([\w\W]*)},box/)
                        if (matches && matches.length > 1) {
                            const configJson = '{' + matches[1].trim() + '}'
                            const config = JSON.parse(configJson)
                            playUrl = this.decryptUrl(config)
                        }
                    }
                    backData.data = playUrl
                }
            }
        } catch (error) {
            UZUtils.debugLog(error)
            backData.error = error.message
        }
        return JSON.stringify(backData)
    }

    /**
     * 搜索视频
     * @param {UZArgs} args
     * @returns {Promise<RepVideoList>}
     */
    async searchVideo(args) {
        let backData = new RepVideoList()
        // Search requires verification code
        return JSON.stringify(backData)
    }

    createPunycode = () => {
        const maxInt = 2147483647
        const base = 36
        const tMin = 1
        const tMax = 26
        const skew = 38
        const damp = 700
        const initialBias = 72
        const initialN = 128
        const delimiter = '-'

        const regexPunycode = /^xn--/
        const regexNonASCII = /[^\0-\x7F]/
        const regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g

        const errors = {
            overflow: 'Overflow: input needs wider integers to process',
            'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
            'invalid-input': 'Invalid input',
        }

        const baseMinusTMin = base - tMin
        const floor = Math.floor
        const stringFromCharCode = String.fromCharCode

        function error(type) {
            throw new RangeError(errors[type])
        }

        function map(array, callback) {
            const result = []
            let length = array.length
            while (length--) {
                result[length] = callback(array[length])
            }
            return result
        }

        function mapDomain(domain, callback) {
            const parts = domain.split('@')
            let result = ''
            if (parts.length > 1) {
                result = parts[0] + '@'
                domain = parts[1]
            }
            domain = domain.replace(regexSeparators, '\x2E')
            const labels = domain.split('.')
            const encoded = map(labels, callback).join('.')
            return result + encoded
        }

        function ucs2decode(string) {
            const output = []
            let counter = 0
            const length = string.length
            while (counter < length) {
                const value = string.charCodeAt(counter++)
                if (value >= 0xd800 && value <= 0xdbff && counter < length) {
                    const extra = string.charCodeAt(counter++)
                    if ((extra & 0xfc00) == 0xdc00) {
                        output.push(((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000)
                    } else {
                        output.push(value)
                        counter--
                    }
                } else {
                    output.push(value)
                }
            }
            return output
        }

        const ucs2encode = (codePoints) => String.fromCodePoint(...codePoints)

        const basicToDigit = function (codePoint) {
            if (codePoint >= 0x30 && codePoint < 0x3a) {
                return 26 + (codePoint - 0x30)
            }
            if (codePoint >= 0x41 && codePoint < 0x5b) {
                return codePoint - 0x41
            }
            if (codePoint >= 0x61 && codePoint < 0x7b) {
                return codePoint - 0x61
            }
            return base
        }

        const digitToBasic = function (digit, flag) {
            return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5)
        }

        const adapt = function (delta, numPoints, firstTime) {
            let k = 0
            delta = firstTime ? floor(delta / damp) : delta >> 1
            delta += floor(delta / numPoints)
            for (; delta > (baseMinusTMin * tMax) >> 1; k += base) {
                delta = floor(delta / baseMinusTMin)
            }
            return floor(k + ((baseMinusTMin + 1) * delta) / (delta + skew))
        }

        const decode = function (input) {
            const output = []
            const inputLength = input.length
            let i = 0
            let n = initialN
            let bias = initialBias

            let basic = input.lastIndexOf(delimiter)
            if (basic < 0) {
                basic = 0
            }

            for (let j = 0; j < basic; ++j) {
                if (input.charCodeAt(j) >= 0x80) {
                    error('not-basic')
                }
                output.push(input.charCodeAt(j))
            }

            for (let index = basic > 0 ? basic + 1 : 0; index < inputLength; ) {
                const oldi = i
                for (let w = 1, k = base; ; k += base) {
                    if (index >= inputLength) {
                        error('invalid-input')
                    }

                    const digit = basicToDigit(input.charCodeAt(index++))

                    if (digit >= base) {
                        error('invalid-input')
                    }
                    if (digit > floor((maxInt - i) / w)) {
                        error('overflow')
                    }

                    i += digit * w
                    const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias

                    if (digit < t) {
                        break
                    }

                    const baseMinusT = base - t
                    if (w > floor(maxInt / baseMinusT)) {
                        error('overflow')
                    }

                    w *= baseMinusT
                }

                const out = output.length + 1
                bias = adapt(i - oldi, out, oldi == 0)

                if (floor(i / out) > maxInt - n) {
                    error('overflow')
                }

                n += floor(i / out)
                i %= out

                output.splice(i++, 0, n)
            }

            return String.fromCodePoint(...output)
        }

        const encode = function (input) {
            const output = []
            input = ucs2decode(input)
            const inputLength = input.length
            let n = initialN
            let delta = 0
            let bias = initialBias

            for (const currentValue of input) {
                if (currentValue < 0x80) {
                    output.push(stringFromCharCode(currentValue))
                }
            }

            const basicLength = output.length
            let handledCPCount = basicLength

            if (basicLength) {
                output.push(delimiter)
            }

            while (handledCPCount < inputLength) {
                let m = maxInt
                for (const currentValue of input) {
                    if (currentValue >= n && currentValue < m) {
                        m = currentValue
                    }
                }

                const handledCPCountPlusOne = handledCPCount + 1
                if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
                    error('overflow')
                }

                delta += (m - n) * handledCPCountPlusOne
                n = m

                for (const currentValue of input) {
                    if (currentValue < n && ++delta > maxInt) {
                        error('overflow')
                    }
                    if (currentValue === n) {
                        let q = delta
                        for (let k = base; ; k += base) {
                            const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias
                            if (q < t) {
                                break
                            }
                            const qMinusT = q - t
                            const baseMinusT = base - t
                            output.push(stringFromCharCode(digitToBasic(t + (qMinusT % baseMinusT), 0)))
                            q = floor(qMinusT / baseMinusT)
                        }

                        output.push(stringFromCharCode(digitToBasic(q, 0)))
                        bias = adapt(delta, handledCPCountPlusOne, handledCPCount === basicLength)
                        delta = 0
                        ++handledCPCount
                    }
                }

                ++delta
                ++n
            }
            return output.join('')
        }

        const toUnicode = function (input) {
            return mapDomain(input, function (string) {
                return regexPunycode.test(string) ? decode(string.slice(4).toLowerCase()) : string
            })
        }

        const toASCII = function (input) {
            return mapDomain(input, function (string) {
                return regexNonASCII.test(string) ? 'xn--' + encode(string) : string
            })
        }

        return {
            ucs2decode,
            ucs2encode,
            decode,
            encode,
            toASCII,
            toUnicode,
        }
    }

    decryptUrl(jsConfig) {
        const key = Crypto.enc.Utf8.parse('2890' + jsConfig.config.uid + 'tB959C')
        const iv = Crypto.enc.Utf8.parse('GZ4JgN2BdSqVWJ1z')
        const mode = Crypto.mode.CBC
        const padding = Crypto.pad.Pkcs7
        const decrypted = Crypto.AES.decrypt(jsConfig.url, key, {
            iv: iv,
            mode: mode,
            padding: padding,
        })
        const decryptedUrl = Crypto.enc.Utf8.stringify(decrypted)
        return decryptedUrl
    }

    base64Decode(text) {
        return Crypto.enc.Utf8.stringify(Crypto.enc.Base64.parse(text))
    }

    combineUrl(url) {
        if (url === undefined) {
            return ''
        }
        if (url.indexOf(this.webSite) !== -1) {
            return url
        }
        if (url.startsWith('/')) {
            return this.webSite + url
        }
        return this.webSite + '/' + url
    }

    isIgnoreClassName(className) {
        for (let index = 0; index < this.ignoreClassName.length; index++) {
            const element = this.ignoreClassName[index]
            if (className.indexOf(element) !== -1) {
                return true
            }
        }
        return false
    }

    removeTrailingSlash(str) {
        if (str.endsWith('/')) {
            return str.slice(0, -1)
        }
        return str
    }
}
let nkvod20240712 = new nkvodClass()
