// ignore
import { WebApiBase, VideoClass } from '../core/uzCode.js'
import { parse } from 'node-html-parser'
// ignore

class www1080eeClass extends WebApiBase {
    webSite = 'http://www.1080.ee'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'
    }
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
            const pro = await req(webUrl, { headers: this.headers })
            backData.error = pro.error
            let proData = pro.data
            if (proData) {
                let document = parse(proData)
                let allClass = document.querySelectorAll('ul.stui-header__menu a')
                let list = []
                for (let index = 0; index < allClass.length; index++) {
                    const element = allClass[index]
                    let isIgnore = this.isIgnoreClassName(element.text)
                    if (isIgnore) {
                        continue
                    }
                    let type_name = element.text
                    let url = element.attributes['href']

                    url = this.combineUrl(url)
                    url = url.slice(0, -5)

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
            backData.error = error.message
        }

        return JSON.stringify(backData)
    }

    /**
     * 获取分类视频列表
     * @param {UZArgs} args
     * @returns {Promise<RepVideoList>}
     */
    async getVideoList(args) {
        let listUrl = this.removeTrailingSlash(args.url) + '-' + args.page + '.html'
        let backData = new RepVideoList()
        try {
            let pro = await req(listUrl, { headers: this.headers })
            backData.error = pro.error
            let proData = pro.data
            if (proData) {
                let document = parse(proData)
                let allVideo = document.querySelectorAll('.stui-vodlist > li')
                let videos = []
                for (let index = 0; index < allVideo.length; index++) {
                    const element = allVideo[index]
                    let vodUrl = element.querySelector('a.stui-vodlist__thumb')?.attributes['href'] ?? ''
                    let vodPic = element.querySelector('a.stui-vodlist__thumb')?.attributes['data-original'] ?? ''
                    let vodName = element.querySelector('a.stui-vodlist__thumb')?.attributes['title'] ?? ''
                    let vodDiJiJi = element.querySelector('.pic-text')?.text

                    vodUrl = this.combineUrl(vodUrl)
                    if (!vodPic.includes('http')) vodPic = this.combineUrl(vodPic)

                    let videoDet = new VideoDetail()
                    videoDet.vod_id = vodUrl
                    videoDet.vod_pic = vodPic
                    videoDet.vod_name = vodName
                    videoDet.vod_remarks = vodDiJiJi
                    videos.push(videoDet)
                }
                backData.data = videos
            }
        } catch (error) {
            backData.error = error.message
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
            let webUrl = args.url
            let pro = await req(webUrl, { headers: this.headers })
            backData.error = pro.error
            let proData = pro.data
            if (proData) {
                let document = parse(proData)
                let vod_content = document.querySelector('.detail-content')?.text ?? ''
                let vod_pic = document.querySelector('.stui-content__thumb img')?.attributes['data-original'] ?? ''
                let vod_name = document.querySelector('h1.title')?.text ?? ''
                let detList = document.querySelectorAll('.stui-content__detail p') ?? ''
                let vod_year = ''
                let vod_director = ''
                let vod_actor = ''
                let vod_area = ''
                let vod_lang = ''
                let vod_douban_score = ''
                let type_name = ''

                let newDetList = []
                detList.forEach((e) => {
                    if (e.text.includes('/')) {
                        let temp = e.text.split('/')
                        newDetList = newDetList.concat(temp)
                    } else newDetList.push(e.text)
                })

                for (let index = 0; index < newDetList.length; index++) {
                    const element = newDetList[index].trim()
                    if (element.includes('年份')) {
                        vod_year = element.replace('年份：', '')
                    } else if (element.includes('导演')) {
                        vod_director = element.replace('导演：', '')
                    } else if (element.includes('主演')) {
                        vod_actor = element.replace('主演：', '')
                    } else if (element.includes('地区')) {
                        vod_area = element.replace('地区：', '')
                    } else if (element.includes('语言')) {
                        vod_lang = element.replace('语言：', '')
                    } else if (element.includes('类型')) {
                        type_name = element.replace('类型：', '')
                    } else if (element.includes('豆瓣')) {
                        vod_douban_score = element.replace('豆瓣：', '')
                    }
                }

                let juJiDocment = document.querySelectorAll('.stui-vodlist__head')

                let vod_play_from = ''
                let vod_play_url = ''
                for (let index = 0; index < juJiDocment.length; index++) {
                    const element = juJiDocment[index]
                    let play_from = element.querySelector('h3').text ?? ''
                    let eps = element.querySelectorAll('.stui-content__playlist li')

                    eps.forEach((e) => {
                        let ep = e.querySelector('a')
                        vod_play_url += ep.text
                        vod_play_url += '$'
                        vod_play_url += ep.getAttribute('href')
                        vod_play_url += '#'
                    })
                    vod_play_from += play_from.trim() + '$$$'
                    vod_play_url += '$$$'
                }

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
                detModel.vod_id = webUrl
                detModel.vod_play_from = vod_play_from

                backData.data = detModel
            }
        } catch (error) {
            backData.error = error.message
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
        let reqUrl = this.combineUrl(args.url)

        try {
            let html = await req(reqUrl, { headers: this.headers })
            let data = html.data
            backData.error = html.error
            data = JSON.parse(data.match(/r player_.*?=(.*?)</)[1])

            let url = data.url

            let config = {}
            let jscode = await req(this.webSite + '/static/js/playerconfig.js', { headers: this.headers })

            backData.error = jscode.error
            eval(jscode.data + '\nconfig=MacPlayerConfig;')
            let jx = config.player_list[data.from].parse ?? ''
            if (jx == '') {
                jx = config.parse
            }
            jx = jx.replace('///', '//')

            let p = 'url=' + url
            let video = await req(jx.replace('?url=', 'API.php'), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Referer: this.webSite
                },
                data: p,
                method: 'POST'
            })
            if (!video.data.url) backData.error = video.data.msg
            let play_url = video.data.url

            backData.data = play_url
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
        let webUrl = `${this.webSite}/vodsearch/${args.searchWord}----------${args.page}---.html`
        try {
            let pro = await req(webUrl, { headers: this.headers })
            backData.error = pro.error
            let proData = pro.data
            if (proData) {
                let document = parse(proData)
                let allVideo = document.querySelectorAll('.stui-vodlist > li')
                let videos = []
                for (let index = 0; index < allVideo.length; index++) {
                    const element = allVideo[index]
                    let vodUrl = element.querySelector('a.stui-vodlist__thumb')?.attributes['href'] ?? ''
                    let vodPic = element.querySelector('a.stui-vodlist__thumb')?.attributes['data-original'] ?? ''
                    let vodName = element.querySelector('a.stui-vodlist__thumb')?.attributes['title'] ?? ''
                    let vodDiJiJi = element.querySelector('.pic-text')?.text

                    vodUrl = this.combineUrl(vodUrl)
                    if (!vodPic.includes('http')) vodPic = this.combineUrl(vodPic)

                    let videoDet = new VideoDetail()
                    videoDet.vod_id = vodUrl
                    videoDet.vod_pic = vodPic
                    videoDet.vod_name = vodName
                    videoDet.vod_remarks = vodDiJiJi
                    videos.push(videoDet)
                }
                backData.data = videos
            }
        } catch (error) {
            backData.error = error.message
        }
        return JSON.stringify(backData)
    }

    ignoreClassName = ['首页', '专题']

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
var www1080ee20240626 = new www1080eeClass()
