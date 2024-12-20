// ignore
import { WebApiBase, VideoClass } from '../core/uzCode.js'
import { parse } from 'node-html-parser'
// ignore

class nivodClass extends WebApiBase {
    url = 'https://www.nivod5.com'
    apiUrl = 'https://api.nivodz.com'
    show_id_code = ''
    play_id_code = ''
    /**
     * 异步获取分类列表的方法。
     * @param {UZArgs} args
     * @returns {Promise<RepVideoClassList>}
     */
    async getClassList(args) {
        let webUrl = args.url
        // 如果通过首页获取分类的话，可以将对象内部的首页更新
        this.webSite = this.removeTrailingSlash(webUrl)
        let backData = new RepVideoClassList()
        try {
            const pro = await this.request(webUrl)
            backData.error = pro.error
            let proData = pro.data
            if (proData) {
                let document = parse(proData)
                let allClass = document.querySelectorAll('a.channel-link')
                let list = []
                for (let index = 0; index < allClass.length; index++) {
                    const element = allClass[index]
                    // let isIgnore = this.isIgnoreClassName(element.text)
                    // if (isIgnore) {
                    //     continue
                    // }
                    let type_name = element.text.trim().split('\n')[1]
                    let url = element.attributes['href']

                    url = url.replace('class.html?channelId=', '')
                    if (type_name === '午夜场') url = '7'

                    if (url.length > 0 && type_name.length > 0) {
                        let videoClass = new VideoClass()
                        videoClass.type_id = url
                        videoClass.type_name = type_name
                        list.push(videoClass)
                    }
                }
                backData.data = list
            }
        } catch (error) {
            backData.error = '获取分类失败～' + error.message
        }

        return JSON.stringify(backData)
    }

    /**
     * 获取分类视频列表
     * @param {UZArgs} args
     * @returns {Promise<RepVideoList>}
     */
    async getVideoList(args) {
        let listUrl = this.apiUrl + '/show/filter/WEB/3.2?'
        let backData = new RepVideoList()
        try {
            let sort = 4 // 最新
            let t = new Date().getTime()
            let queryParams = {
                _ts: t,
                app_version: '1.0',
                platform: '3',
                market_id: 'web_nivod',
                device_code: 'web',
                versioncode: '1',
                oid: '1ee3fdfe5bd50a5bc932b4520de68686576a2f3cb7ddf1e2'
            }
            let body = {
                sort_by: sort,
                channel_id: args.url,
                start: (args.page - 1) * 20
            }
            let sign = this.createSign(queryParams, body, '2x_Give_it_a_shot')
            queryParams.sign = sign
            let url =
                listUrl +
                Object.keys(queryParams)
                    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
                    .join('&')
            let response = await this.request(url + '&_No_Encrypt_=1', body)
            backData.error = response.error
            let data = response.data.list
            let videos = []
            data.forEach((e) => {
                let videoDet = new VideoDetail()
                videoDet.vod_id = e.showIdCode ?? ''
                videoDet.vod_pic = e.showImg ?? ''
                videoDet.vod_name = e.showTitle ?? ''
                videoDet.vod_remarks = e.episodesTxt ?? ''

                videos.push(videoDet)
            })

            backData.data = videos
        } catch (error) {
            backData.error = '获取列表失败～' + error.message
        }
        return JSON.stringify(backData)
    }

    /**
     * 获取视频详情
     * @param {UZArgs} args
     * @returns {Promise<RepVideoDetail>}
     */
    async getVideoDetail(args) {
        this.show_id_code = args.url
        let backData = new RepVideoDetail()
        try {
            let t = new Date().getTime()
            let queryParams = {
                _ts: t,
                app_version: '1.0',
                platform: '3',
                market_id: 'web_nivod',
                device_code: 'web',
                versioncode: '1',
                oid: '1ee3fdfe5bd50a5bc932b4520de68686576a2f3cb7ddf1e2'
            }
            let body = { show_id_code: args.url }
            let sign = this.createSign(queryParams, body, '2x_Give_it_a_shot')
            queryParams.sign = sign
            let url =
                'https://api.nivodz.com/show/detail/WEB/3.2?' +
                Object.keys(queryParams)
                    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
                    .join('&')
            let response = await this.request(url + '&_No_Encrypt_=1', body)
            backData.error = response.error
            let proData = response.data
            if (proData) {
                let data = proData.entity
                let vod_content = data.showDesc ?? ''
                let vod_pic = data.showImg ?? ''
                let vod_name = data.showTitle ?? ''
                let vod_year = data.postYear ?? ''
                let vod_director = data.director ?? ''
                let vod_actor = data.actors ?? ''
                let vod_area = data.regionName ?? ''
                let vod_lang = ''
                let vod_douban_score = ''
                let type_name = data.channelName ?? ''

                let juJiDocment = data.plays ?? []
                let vod_play_url = ''
                for (let index = 0; index < juJiDocment.length; index++) {
                    const element = juJiDocment[index]

                    vod_play_url += element.displayName
                    vod_play_url += '$'
                    vod_play_url += element.playIdCode
                    vod_play_url += '#'
                }

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
                detModel.vod_play_url = vod_play_url
                detModel.vod_id = args.url

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
        try {
            let body = {
                show_id_code: this.show_id_code,
                play_id_code: args.url,
                oid: 1,
                episode_id: 0
            }
            let t = new Date().getTime()
            let queryParams = {
                _ts: t,
                app_version: '1.0',
                platform: '3',
                market_id: 'web_nivod',
                device_code: 'web',
                versioncode: '1',
                oid: '38c90b7acba500f4002b6d189693712943099a094dc05143'
            }

            let sign = this.createSign(queryParams, body, '2x_Give_it_a_shot')
            queryParams.sign = sign
            let url =
                this.apiUrl +
                '/show/play/info/WEB/3.3?' +
                Object.keys(queryParams)
                    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
                    .join('&')
            let response = await this.request(url + '&_No_Encrypt_=1', body)
            backData.data = response.data.entity.plays[0].playUrl
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
            let t = new Date().getTime()
            let queryParams = {
                _ts: t,
                app_version: '1.0',
                platform: '3',
                market_id: 'web_nivod',
                device_code: 'web',
                versioncode: '1',
                oid: '1ee3fdfe5bd50a5bc932b4520de68686576a2f3cb7ddf1e2'
            }
            let body = {
                keyword: args.searchWord,
                start: (args.page - 1) * 20,
                keyword_type: 0
            }
            let sign = this.createSign(queryParams, body, '2x_Give_it_a_shot')
            queryParams.sign = sign
            let url =
                'https://api.nivodz.com/show/search/WEB/3.2?' +
                Object.keys(queryParams)
                    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
                    .join('&')
            let response = await this.request(url + '&_No_Encrypt_=1', body)
            backData.error = response.error
            let data = response.data.list
            let list = []
            data.forEach((e) => {
                let videoDet = new VideoDetail()
                videoDet.vod_id = e.showIdCode ?? ''
                videoDet.vod_pic = e.showImg ?? ''
                videoDet.vod_name = e.showTitle ?? ''
                videoDet.vod_remarks = e.episodesTxt ?? ''

                list.push(videoDet)
            })
            backData.data = list
        } catch (e) {
            backData.error = e.message
        }

        return JSON.stringify(backData)
    }

    async request(url, body) {
        try {
            const obj = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    Referer: 'https://www.nivod5.tv/',
                    Origin: 'https://www.nivod5.tv',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36 Edg/100.0.1185.29'
                }
            }
            if (body) {
                obj.method = 'POST'
                obj.data = body
            }
            const response = await req(url, obj)
            return response
        } catch (e) {}
    }

    ignoreClassName = []

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

    createSign(_0x3eaa13, _0x24626f, _0x1d383d) {
        let _SECRET_PREFIX = '__KEY::'
        let _QUERY_PREFIX = '__QUERY::'
        let _BODY_PREFIX = '__BODY::'
        var _0x5f56f2 = _QUERY_PREFIX
        _0x3eaa13 = this.objKeySort(_0x3eaa13)
        for (var _0x4488c9 in _0x3eaa13) {
            _0x5f56f2 += _0x4488c9 + '=' + _0x3eaa13[_0x4488c9] + '&'
        }
        var _0x583f4e = _BODY_PREFIX
        _0x24626f = this.objKeySort(_0x24626f)
        for (var _0x4488c9 in _0x24626f) {
            _0x583f4e += _0x4488c9 + '=' + _0x24626f[_0x4488c9] + '&'
        }
        return Crypto.MD5(_0x5f56f2 + _0x583f4e + _SECRET_PREFIX + _0x1d383d).toString()
    }

    objKeySort(_0x4948d6) {
        if (!_0x4948d6) return _0x4948d6
        var _0x16f1ea = Object['keys'](_0x4948d6)['sort'](),
            _0x4d9d67 = {}
        for (var _0x5c452c = 0x0; _0x5c452c < _0x16f1ea['length']; _0x5c452c++) {
            var _0xb0b2fb = _0x16f1ea[_0x5c452c],
                _0xdef92b = _0x4948d6[_0xb0b2fb]['toString']()
            if (_0xb0b2fb == '' || _0xdef92b == '' || _0xb0b2fb == 'sign') continue
            _0x4d9d67[_0xb0b2fb] = _0xdef92b
        }
        return _0x4d9d67
    }
}
var nivod20240625 = new nivodClass()
