// ignore
import { WebApiBase, VideoClass } from '../core/uzCode.js'
import { parse } from 'node-html-parser'
// ignore

class newvisionClass extends WebApiBase {
    url = 'https://www.6080yy3.com'
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
                let allClass = document.querySelectorAll('.nav-menu-items > .nav-menu-item > a')
                let list = []
                for (let index = 0; index < allClass.length; index++) {
                    const element = allClass[index]
                    let isIgnore = this.isIgnoreClassName(element.text)
                    if (isIgnore) {
                        continue
                    }
                    let type_name = element.text ?? ''
                    let url = element.getAttribute('href') ?? ''

                    if (url.length > 0 && type_name.length > 0) {
                        let videoClass = new VideoClass()
                        videoClass.type_id = url
                        videoClass.type_name = type_name.trim()
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
        let id = args.url.match(/vodtype\/(.+)\.html/)[1]
        let listUrl = this.removeTrailingSlash(this.webSite) + `/vodshow/${id}--------${args.page}---.html`
        let backData = new RepVideoList()
        try {
            let pro = await req(listUrl, { headers: this.headers })
            backData.error = pro.error
            let proData = pro.data
            if (proData) {
                let document = parse(proData)
                let allVideo = document.querySelector('.module-items').querySelectorAll('.module-item')
                let videos = []
                for (let index = 0; index < allVideo.length; index++) {
                    const element = allVideo[index]
                    let vodUrl = element.querySelector('.module-item-pic a')?.getAttribute('href') ?? ''
                    let vodPic = element.querySelector('.module-item-pic img')?.getAttribute('data-src') ?? ''
                    let vodName = element.querySelector('.module-item-pic a')?.getAttribute('title') ?? ''
                    // let vodDiJiJi = element.querySelectorAll('.module-item-caption span')?.map((e) => e.text).join('/') ?? ''
                    let vodDiJiJi = element.querySelector('.module-item-text').text ?? ''

                    let videoDet = {}
                    videoDet.vod_id = vodUrl
                    videoDet.vod_pic = vodPic
                    videoDet.vod_name = vodName
                    videoDet.vod_remarks = vodDiJiJi.trim()
                    videos.push(videoDet)
                }
                backData.data = videos
            }
        } catch (e) {
            backData.error = '获取列表失败～' + e.message
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
            let webUrl = this.combineUrl(args.url)
            let pro = await req(webUrl, { headers: this.headers })
            backData.error = pro.error
            let proData = pro.data
            if (proData) {
                let document = parse(proData)
                let vod_content = document.querySelector('.video-info-item.video-info-content.vod_content')?.text.replace('收起', '') ?? ''
                let vod_pic = document.querySelector('.module-item-pic img')?.getAttribute('data-src') ?? ''
                let vod_name = document.querySelector('.page-title')?.text ?? ''
                // let detList = document.querySelector('.moviedteail_list')?.querySelectorAll('li') ?? []
                let vod_year = ''
                let vod_director = document.querySelectorAll('.video-info-items')[0].querySelector('.video-info-actor').text.replace('\n', '').trim().slice(1, -1) ?? ''
                let vod_actor = document.querySelectorAll('.video-info-items')[1].querySelector('.video-info-actor').text.replace('\n', '').trim().slice(1, -1) ?? ''
                let vod_area = ''
                let vod_lang = ''
                let vod_douban_score = ''
                let type_name = ''

                // for (let index = 0; index < detList.length; index++) {
                //     const element = detList[index]
                //     if (element.text.includes('年份')) {
                //         vod_year = element.text.replace('年份：', '')
                //     } else if (element.text.includes('导演')) {
                //         vod_director = element.text.replace('导演：', '')
                //     } else if (element.text.includes('主演')) {
                //         vod_actor = element.text.replace('主演：', '')
                //     } else if (element.text.includes('地区')) {
                //         vod_area = element.text.replace('地区：', '')
                //     } else if (element.text.includes('语言')) {
                //         vod_lang = element.text.replace('语言：', '')
                //     } else if (element.text.includes('类型')) {
                //         type_name = element.text.replace('类型：', '')
                //     } else if (element.text.includes('豆瓣')) {
                //         vod_douban_score = element.text.replace('豆瓣：', '')
                //     }
                // }

                let play_from = []
                document.querySelectorAll('.module-tab-content > div').forEach((e) => {
                    play_from.push(e.querySelector('span').text)
                })

                let juJiDocment = document.querySelectorAll('.module-player-list')
                let vod_play_url = ''
                for (let i = 0; i < juJiDocment.length; i++) {
                    let playLinkList = juJiDocment[i]
                    let playLinks = playLinkList.querySelectorAll('.scroll-content a')

                    for (let j = 0; j < playLinks.length; j++) {
                        const element = playLinks[j]
                        vod_play_url += element.text
                        vod_play_url += '$'
                        vod_play_url += element.attributes['href']
                        vod_play_url += '#'
                    }
                    vod_play_url += '$$$'
                }

                let vod_play_from = play_from.join('$$$')

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
                detModel.vod_play_from = vod_play_from
                detModel.vod_id = webUrl

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
        let url = this.combineUrl(args.url)
        try {
            let html = await req(url, { headers: this.headers })
            backData.error = html.error

            let data = html.data
            if (data) {
                let document = parse(data)
                let playerUrl = document.querySelector('#bfurl').getAttribute('href')
                if (playerUrl.startsWith('http')) backData.data = playerUrl
                else {
                    let jx = 'https://jx3.xn--1lq90i13mxk5bolhm8k.xn--fiqs8s/player/ec.php?code=zj&if=1&url=' + playerUrl
                    let jxhtml = (await req(jx, { headers: this.headers })).data
                    let playConfig = JSON.parse(jxhtml.match(/let ConFig = (.*?),box =/)[1])
                    let playUrl = this.uic(playConfig.url, playConfig.config.uid)
                    backData.data = playUrl
                }
            } else backData.data = 'https://bit.ly/3BlS71b'
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
        let url = `http://123.207.150.253/zxapi/public/?service=App.F.Fetch&req_p=${args.searchWord}&type=6080`

        try {
            let pro = await req(url, { headers: this.headers })
            backData.error = pro.error
            let proData = pro.data
            if (proData) {
                let allVideo = proData.Data.result
                let videos = []
                for (let index = 0; index < allVideo.length; index++) {
                    const element = allVideo[index]
                    let vodUrl = element.vod_url ?? ''
                    let vodPic = element.vod_pic ?? ''
                    let vodName = element.vod_name ?? ''
                    let vodDiJiJi = ''

                    let videoDet = {}
                    videoDet.vod_id = vodUrl
                    videoDet.vod_pic = vodPic
                    videoDet.vod_name = vodName
                    videoDet.vod_remarks = vodDiJiJi
                    videos.push(videoDet)
                }
                backData.data = videos
            }
        } catch (e) {
            backData.error = e.message
        }

        return JSON.stringify(backData)
    }

    ignoreClassName = ['首页', '留言求片', '发布页', 'App']

    uic(url, uid) {
        let ut = Crypto.enc.Utf8.parse('2890' + uid + 'tB959C')
        let mm = Crypto.enc.Utf8.parse('2F131BE91247866E')
        let decrypted = Crypto.AES.decrypt(url, ut, { iv: mm, mode: Crypto.mode.CBC, padding: Crypto.pad.Pkcs7 })
        return Crypto.enc.Utf8.stringify(decrypted)
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
var newvision20240629 = new newvisionClass()
