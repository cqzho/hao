// ignore
import { WebApiBase, VideoClass } from '../core/uzCode.js'
import { parse } from 'node-html-parser'
// ignore

class haijuClass extends WebApiBase {
    constructor() {
        super()
        this.webSite = 'https://www.haiju.vip'
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        }
        this.ignoreClassName = ['首页', '留言', '最新', '排行']
    }

    /**
     * 异步获取分类列表的方法。
     * @param {UZArgs} args
     * @returns {Promise<RepVideoClassList>}
     */
    async getClassList(args) {
        let webUrl = args.url
        // 如果通过首页获取分类的话，可以将对象内部的首页更新
        this.webSite = UZUtils.removeTrailingSlash(webUrl)
        let backData = new RepVideoClassList()
        try {
            const pro = await req(webUrl, { headers: this.headers })
            backData.error = pro.error
            const proData = pro.data
            if (proData) {
                const $ = cheerio.load(proData)
                let allClass = $('.conch-nav ul li a')
                let list = []
                allClass.each((index, element) => {
                    const cat = $(element)
                    if (this.isIgnoreClassName(cat.text())) return

                    let name = cat.text()
                    let href = cat.attr('href')
                    if (href.length > 0 && name.length > 0) {
                        let videoClass = new VideoClass()
                        videoClass.type_id = href
                        videoClass.type_name = name
                        videoClass.hasSubclass = true
                        list.push(videoClass)
                    }
                })
                backData.data = list
            }
        } catch (error) {
            backData.error = '获取分类失败～' + error.message
        }

        return JSON.stringify(backData)
    }

    async getSubclassList(args) {
        let backData = new RepVideoSubclassList()
        backData.data = new VideoSubclass()
        const type = args.url.match(/fenlei\/(.*?)\.html/)[1]
        const url = `${this.webSite}/vodshow/${type}-----------.html`
        try {
            const pro = await req(url, { headers: this.headers })
            backData.error = pro.error
            let proData = pro.data
            if (proData) {
                const $ = cheerio.load(proData)
                let allFilter = $('.hl-filter-all > div')
                allFilter.each((index, element) => {
                    let filterTitle = new FilterTitle()
                    filterTitle.name = $(element).find('.hl-filter-text span').text()
                    filterTitle.list = []
                    if (filterTitle.name === '已选') return
                    let filter = $(element).find('ul.hl-filter-list li')
                    filter.each((index, element) => {
                        let filterLab = new FilterLabel()
                        let name = $(element).find('a').text()
                        let id = $(element).find('a').attr('href')

                        if (name === '全部') {
                            id = ''
                        } else {
                            id = id.match(/-(.*?)\.html/)[1]
                            id = id.replace(/-/g, '')
                            id = `${filterTitle.name}@@@${id}`
                        }
                        filterLab.name = name
                        filterLab.id = id
                        filterTitle.list.push(filterLab)
                    })

                    backData.data.filter.push(filterTitle)
                })
            }
        } catch (error) {
            backData.error = '获取分类失败～ ' + error
        }
        return JSON.stringify(backData)
    }

    async getSubclassVideoList(args) {
        let backData = new RepVideoList()
        // UZUtils.debugLog(args)
        backData.data = []
        try {
            let classId = args.mainClassId.match(/fenlei\/(.*?)\.html/)[1]
            let type = ''
            let area = ''
            let year = ''
            let lang = ''
            let alphabet = ''
            let page = args.page

            let filter = args.filter
            filter.forEach((item) => {
                let [title, value] = item.id.split('@@@')
                switch (title) {
                    case '类型':
                        type = value
                        break
                    case '地区':
                        area = value
                        break
                    case '年份':
                        year = value
                        break
                    case '语言':
                        lang = value
                        break
                    case '字母':
                        alphabet = value
                        break
                }
            })
            const listUrl = `${this.webSite}/vodshow/${classId}-${area}--${type}-${lang}-${alphabet}---${page}---${year}.html`

            let pro = await req(listUrl, { headers: this.headers })
            backData.error = pro.error
            let proData = pro.data
            if (proData) {
                const $ = cheerio.load(proData)
                let allVideo = $('ul.hl-vod-list > li')
                let videos = []
                allVideo.each((index, element) => {
                    let vodUrl = $(element).find('a').attr('href') ?? ''
                    let vodPic = $(element).find('a').attr('data-original') ?? ''
                    let vodName = $(element).find('a').attr('title') ?? ''
                    let vodDiJiJi = $(element).find('span.remarks').text() ?? ''

                    let videoDet = new VideoDetail()
                    videoDet.vod_id = vodUrl
                    videoDet.vod_pic = vodPic
                    videoDet.vod_name = vodName
                    videoDet.vod_remarks = vodDiJiJi
                    videos.push(videoDet)
                })
                backData.data = videos
            }
        } catch (error) {
            backData.error = '获取视频列表失败～ ' + error
        }

        return JSON.stringify(backData)
    }

    /**
     * 获取视频详情
     * @param {UZArgs} args
     * @returns {Promise<RepVideoDetail>}
     */
    async getVideoDetail(args) {
        let backData = new RepVideoDetail()
        try {
            let webUrl = this.webSite + args.url
            let pro = await req(webUrl, { headers: this.headers })
            backData.error = pro.error
            let proData = pro.data
            if (proData) {
                const $ = cheerio.load(proData)
                let vod_content = $('.hl-content-wrap.hl-content-hide em').text() ?? ''
                let vod_pic = $('.hl-item-thumb').attr('data-original') ?? ''
                let vod_name = $('.hl-dc-title').text() ?? ''
                let detList = $('.hl-full-box ul li')
                let vod_year = ''
                let vod_director = ''
                let vod_actor = ''
                let vod_area = ''
                let vod_lang = ''
                let vod_douban_score = ''
                let type_name = ''

                for (let index = 0; index < detList.length; index++) {
                    const element = detList[index]
                    const text = $(element).text().trim()

                    if (text.includes('年份')) {
                        vod_year = text.replace('年份：', '').trim()
                    } else if (text.includes('导演')) {
                        vod_director = text.replace('导演：', '').trim()
                    } else if (text.includes('主演')) {
                        vod_actor = text.replace('主演：', '').trim()
                    } else if (text.includes('地区')) {
                        vod_area = text.replace('地区：', '').trim()
                    } else if (text.includes('语言')) {
                        vod_lang = text.replace('语言：', '').trim()
                    } else if (text.includes('类型')) {
                        type_name = text.replace('类型：', '').trim()
                    } else if (text.includes('豆瓣')) {
                        vod_douban_score = text.replace('豆瓣：', '').trim()
                    }
                }

                let from = []
                $('.hl-plays-from a').each((index, element) => {
                    let name = $(element).text().trim()
                    from.push(name)
                })

                let playlist = $('.hl-plays-list')
                let vod_play_url = []
                playlist.each((index, element) => {
                    let eps = $(element).find('a')
                    let playUrl = []
                    eps.each((index, element) => {
                        let ep_name = $(element).text()
                        let ep_url = $(element).attr('href')
                        playUrl.push(`${ep_name}$${this.webSite}${ep_url}`)
                    })
                    vod_play_url.push(playUrl.join('#'))
                })

                let detModel = new VideoDetail()
                detModel.vod_year = vod_year
                detModel.type_name = type_name
                detModel.vod_director = vod_director
                detModel.vod_actor = vod_actor
                detModel.vod_area = vod_area
                detModel.vod_lang = vod_lang
                detModel.vod_douban_score = vod_douban_score
                detModel.vod_content = vod_content.trim()
                detModel.vod_pic = vod_pic
                detModel.vod_name = vod_name
                detModel.vod_play_url = vod_play_url.join('$$$')
                detModel.vod_play_from = from.join('$$$')
                detModel.vod_id = webUrl

                backData.data = detModel
            }
        } catch (error) {
            backData.error = '获取视频详情失败' + error.message
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
        let url = args.url

        try {
            const pro = await req(url, { headers: this.headers })
            backData.error = pro.error
            let proData = pro.data

            if (proData) {
                let json = JSON.parse(proData.match(/r player_.*?=(.*?)</)[1])
                let playUrl = json.url

                if (json.encrypt == '1') {
                    playUrl = unescape(playUrl)
                } else if (json.encrypt == '2') {
                    playUrl = unescape(base64Decode(playUrl))
                }

                let jx = this.webSite + '/static/player/' + json.from + '.js'
                let jxRes = (await req(jx, { headers: this.headers })).data.match(/src="(.*?)'/)[1]
                // UZUtils.debugLog(jxRes)
                let jk = jxRes + playUrl
                let jkRes = await req(jk, { headers: { 'User-Agent': this.headers['User-Agent'], Referer: url } })
                let lj = jkRes.data.match(/var config = {[\s\S]*?}/)[0]
                let Config = {}
                eval(lj + '\nConfig=config')
                // UZUtils.debugLog(Config)
                let body = 'url=' + Config.url + '&time=' + Config.time + '&key=' + Config.key
                let video = await req(jxRes.replace('?url=', 'api.php'), {
                    method: 'POST',
                    headers: {
                        'User-Agent': this.headers['User-Agent'],
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    },
                    data: body,
                })
                if (JSON.parse(video.data).code != 200) {
                    backData.error = video.data.msg
                    return JSON.stringify(backData)
                } else {
                    playUrl = decrypt(JSON.parse(video.data).url)
                }

                backData.data = playUrl
                backData.headers = {
                    'User-Agent': this.headers['User-Agent'],
                }
            }

            function decrypt(text) {
                let key = Crypto.enc.Utf8.parse('DFGDFHffhhdgdg88')
                let iv = Crypto.enc.Utf8.parse('SFDFGDGdsdgsga99')
                let decrypted = Crypto.AES.decrypt(text, key, {
                    iv: iv,
                    mode: Crypto.mode.CBC,
                    padding: Crypto.pad.Pkcs7,
                })
                return decrypted.toString(Crypto.enc.Utf8)
            }
        } catch (error) {
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
        try {
            let cookie = 'PHPSESSID=' + generatePHPSESSID()
            let ocrApi = 'https://api.nn.ci/ocr/b64/json'
            let search = this.webSite + `/vodsearch/-------------.html?wd=${args.searchWord}&submit=`
            let image = this.webSite + '/index.php/verify/index.html?'
            let verify = this.webSite + '/index.php/ajax/verify_check?type=search&verify='

            // get image
            let imageRes = await req(image, {
                headers: {
                    'User-Agent': this.headers['User-Agent'],
                    Cookie: cookie,
                },
                responseType: 'arraybuffer',
            })

            let b64 = arrayBufferToBase64(imageRes.data)
            let ocrRes = await req(ocrApi, {
                method: 'POST',
                headers: this.headers,
                data: b64,
            })
            let vd = JSON.parse(ocrRes.data).result

            // verify
            let verifyRes = await req(verify + vd, {
                headers: {
                    'User-Agent': this.headers['User-Agent'],
                    Cookie: cookie,
                },
            })
            if (verifyRes.data.msg != 'ok') {
                backData.error = '验证码验证失败'
                return JSON.stringify(backData)
            } else {
                let searchRes = await req(search, {
                    headers: {
                        'User-Agent': this.headers['User-Agent'],
                        Cookie: cookie,
                    },
                })
                let $ = cheerio.load(searchRes.data)
                let allVideo = $('li.hl-list-item')
                let videos = []
                allVideo.each((index, element) => {
                    let vodUrl = $(element).find('.hl-item-title a').attr('href') ?? ''
                    let vodPic = $(element).find('a.hl-item-thumb').attr('data-original') ?? ''
                    let vodName = $(element).find('a.hl-item-thumb').attr('title') ?? ''
                    let vodDiJiJi = $(element).find('span.remarks').text() ?? ''

                    let videoDet = new VideoDetail()
                    videoDet.vod_id = vodUrl
                    videoDet.vod_pic = vodPic
                    videoDet.vod_name = vodName
                    videoDet.vod_remarks = vodDiJiJi
                    videos.push(videoDet)
                })
                backData.data = videos
            }

            function arrayBufferToBase64(arrayBuffer) {
                let uint8Array = new Uint8Array(arrayBuffer)
                let wordArray = Crypto.lib.WordArray.create(uint8Array)
                let base64String = Crypto.enc.Base64.stringify(wordArray)

                return base64String
            }
            function generatePHPSESSID() {
                const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
                const length = 26
                let sessionId = ''

                for (let i = 0; i < length; i++) {
                    const randomIndex = Math.floor(Math.random() * characters.length)
                    sessionId += characters[randomIndex]
                }

                return sessionId
            }
        } catch (error) {
            backData.error = '获取列表失败～' + error.message
        }
        return JSON.stringify(backData)
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
}
let haiju20240917 = new haijuClass()
