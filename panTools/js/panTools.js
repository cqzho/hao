// ignore
import {} from '../../core/uzVideo.js'
import {} from '../../core/uzHome.js'
import {} from '../../core/uz3lib.js'
import {} from '../../core/uzUtils.js'
// ignore

/**
 * 网盘类型
 * 环境变量 key 为 PanType.xx + "Cookie",请在 json 文件中添加
 */
const PanType = {
    /**
     * 夸克
     **/
    Quark: '夸克',

    /**
     * UC
     **/
    UC: 'UC',

    /**
     * 阿里
     **/
    Ali: '阿里',
}

/**
 * 播放信息
 **/
class PanPlayInfo {
    constructor(url = '', error = '', playHeaders = {}) {
        this.url = url
        this.error = error
        this.playHeaders = playHeaders
    }
}

/**
 * 网盘视频项
 */
class PanVideoItem {
    constructor() {
        /**
         * 展示名称 例如 老友记
         */
        this.name = ''

        /**
         * 分组名称 例如 原画 、 普画  非必须
         */
        this.fromName = ''

        /**
         * 网盘类型 用于获取播放信息时
         * @type {PanType}
         **/
        this.panType = PanType.UC

        /**
         * 关键数据 用于获取播放信息时
         * @type {Object}
         */
        this.data
    }
}

/**
 * 网盘播放列表
 */
class PanListDetail {
    constructor() {
        /**
         * @type {PanVideoItem[]}
         * 视频列表
         */
        this.videos = []
        this.error = ''
    }
}

//MARK: - 夸克 UC 相关实现
// 抄自 https://github.com/jadehh/TVSpider

class QuarkUCVideoItem {
    constructor() {
        this.fileId = ''
        this.shareId = ''
        this.shareToken = ''
        this.shareFileToken = ''
        this.seriesId = ''
        this.name = ''
        this.type = ''
        this.formatType = ''
        this.size = ''
        this.parent = ''
        this.shareData = null
        this.lastUpdateAt = 0
        this.subtitle = null
    }
    static objectFrom(itemJson, shareId) {
        const item = new QuarkUCVideoItem()
        item.fileId = itemJson.fid || ''
        item.shareId = shareId
        item.shareToken = itemJson.stoken || ''
        item.shareFileToken = itemJson.share_fid_token || ''
        item.seriesId = itemJson.series_id || ''
        item.name = itemJson.file_name || ''
        item.type = itemJson.obj_category || ''
        item.formatType = itemJson.format_type || ''
        item.size = (itemJson.size || '').toString()
        item.parent = itemJson.pdir_fid || ''
        item.lastUpdateAt = itemJson.last_update_at || 0
        return item
    }
}

class QuarkClient {
    static apiUrl = 'https://drive-pc.quark.cn/1/clouddrive/'
    static pr = 'pr=ucpro&fr=pc'
    static httpHeaders = {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) quark-cloud-drive/2.5.20 Chrome/100.0.4896.160 Electron/18.3.5.4-b478491100 Safari/537.36 Channel/pckk_other_ch',
        Referer: 'https://pan.quark.cn/',
        'Content-Type': 'application/json',
    }
}

class UCClient {
    static apiUrl = 'https://pc-api.uc.cn/1/clouddrive/'
    static pr = 'pr=UCBrowser&fr=pc'
    static httpHeaders = {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) uc-cloud-drive/2.5.20 Chrome/100.0.4896.160 Electron/18.3.5.4-b478491100 Safari/537.36 Channel/pckk_other_ch',
        referer: 'https://drive.uc.cn',
        'Content-Type': 'application/json',
    }
}

class QuarkUC {
    constructor(isQuark) {
        this.isQuark = isQuark || false
        this.cookie = ''
        this.shareTokenCache = {}
        this.saveFileIdCaches = {}
        this.saveDirId = null
        this.saveDirName = 'uz影视'
        this.isVip = false
        this.updateCookie = function () {}
    }
    get panName() {
        if (this.isQuark) {
            return PanType.Quark
        } else {
            return PanType.UC
        }
    }
    get apiUrl() {
        if (this.isQuark) {
            return QuarkClient.apiUrl
        } else {
            return UCClient.apiUrl
        }
    }
    get pr() {
        if (this.isQuark) {
            return QuarkClient.pr
        } else {
            return UCClient.pr
        }
    }
    get headers() {
        const headers = this.isQuark
            ? QuarkClient.httpHeaders
            : UCClient.httpHeaders
        headers['Cookie'] = this.cookie
        return headers
    }
    /**
     * 获取文件列表
     * @param {string} shareUrl
     * @returns {@Promise<PanListDetail>}
     **/
    async getFilesByShareUrl(shareUrl) {
        const data = new PanListDetail()
        await this.getVip()
        const shareData = this.getShareData(shareUrl)
        if (shareData == null) {
            data.error = ''
            return data
        }

        await this.getShareToken(shareData)

        const videos = []
        const subtitles = []
        if (!this.shareTokenCache.hasOwnProperty(shareData.shareId)) {
            data.error = ''
            return data
        }

        await this.listFile(
            shareData,
            videos,
            subtitles,
            shareData.shareId,
            shareData.folderId
        )

        if (subtitles.length > 0) {
            for (const item of videos) {
                const matchSubtitle = this.findBestLCS(item, subtitles)
                if (matchSubtitle.bestMatch != null) {
                    item.subtitle = matchSubtitle.bestMatch.target
                }
            }
        }
        for (let index = 0; index < videos.length; index++) {
            const item = videos[index]
            // 复制 item
            const element = JSON.parse(JSON.stringify(item))
            const videoItem = new PanVideoItem()
            videoItem.data = element
            videoItem.panType = this.panName
            videoItem.name = element.name
            data.videos.push(videoItem)
        }

        return data
    }

    /**
     * 获取播放信息
     * @param {{flag:string,shareId:string,shareToken:string,fileId:string,shareFileToken:string }} data
     * @returns {@Promise<PanPlayInfo>}
     */
    async getPlayUrl(data) {
        if (this.cookie.length === 0) {
            const info = new PanPlayInfo()
            info.error =
                '请在 设置 -> 数据管理 -> 环境变量 中为' +
                this.panName +
                'Cookie 添加值'
            return info
        }
        await this.getVip()
        let playData
        try {
            const { flag, shareId, shareToken, fileId, shareFileToken } = data
            if (false === this.isQuark) {
                playData = await this.getDownload(
                    shareId,
                    shareToken,
                    fileId,
                    shareFileToken,
                    true
                )
            } else {
                playData = await this.getLiveTranscoding(
                    shareId,
                    shareToken,
                    fileId,
                    shareFileToken,
                    flag
                )
            }
        } catch (error) {
            playData = new PanPlayInfo()
            playData.error = error.toString()
        }
        playData.playHeaders = {
            Cookie: this.cookie,
            Referer: this.headers.Referer,
        }
        return playData
    }
    async api(url, data, retry, method) {
        retry || (retry = 3)
        let leftRetry = retry
        method || (method = 'post')

        while (leftRetry > 0) {
            try {
                const response = await req(this.apiUrl + url, {
                    method: method,
                    headers: this.headers,
                    data: JSON.stringify(data),
                })
                if (response.code === 401) {
                    this.cookie = ''
                    return {}
                }
                const resp = response.data
                if (response.headers['set-cookie']) {
                    const puus = [response.headers['set-cookie']]
                        .join(';;;')
                        .match(/__puus=([^;]+)/)
                    if (puus) {
                        if (this.cookie.match(/__puus=([^;]+)/)[1] != puus[1]) {
                            this.cookie = this.cookie.replace(
                                /__puus=[^;]+/,
                                `__puus=${puus[1]}`
                            )
                            this.updateCookie()
                        }
                    }
                }
                return resp
            } catch (e) {}
            leftRetry--
            await new Promise((resolve) => setTimeout(resolve, 1000))
        }
        return resp
    }
    /**
     * 根据链接获取分享ID和文件夹ID
     * @param {string} url
     * @returns {null|{shareId: string, folderId: string}}
     **/
    getShareData(url) {
        let regex = /https:\/\/pan\.quark\.cn\/s\/([^\\|#/]+)/
        if (!this.isQuark) {
            regex = /https:\/\/drive\.uc\.cn\/s\/([^\\|#/]+)/
        }
        const matches = regex.exec(url)
        if (matches != null) {
            return { shareId: matches[1], folderId: '0' }
        }
        return null
    }
    /**
     * 获取分享token
     * @param {{shareId: string, sharePwd: string}} shareData
     **/
    async getShareToken(shareData) {
        if (!this.shareTokenCache.hasOwnProperty(shareData.shareId)) {
            delete this.shareTokenCache[shareData.shareId]
            const shareToken = await this.api(
                `share/sharepage/token?${this.pr}`,
                {
                    pwd_id: shareData.shareId,
                    passcode: shareData.sharePwd || '',
                }
            )
            if (shareToken.data != null && shareToken.data.stoken != null) {
                this.shareTokenCache[shareData.shareId] = shareToken.data
            }
        }
    }
    async getVip() {
        if (this.cookie == '') {
            this.isVip = false
            return
        }
        const listData = await this.api(
            `member?${this.pr}&uc_param_str=&fetch_subscribe=true&_ch=home&fetch_identity=true`,
            null,
            3,
            'get'
        )
        this.isVip =
            listData.data?.member_type === 'EXP_SVIP' ||
            listData.data?.member_type === 'SUPER_VIP'
    }

    async listFile(shareData, videos, subtitles, shareId, folderId, page) {
        if (page == null) page = 1
        const prePage = 200
        const listData = await this.api(
            `share/sharepage/detail?${
                this.pr
            }&pwd_id=${shareId}&stoken=${encodeURIComponent(
                this.shareTokenCache[shareId].stoken
            )}&pdir_fid=${folderId}&force=0&_page=${page}&_size=${prePage}&_sort=file_type:asc,file_name:asc`,
            null,
            3,
            'get'
        )
        if (listData.data == null) return []
        const items = listData.data.list || []
        if (items.length === 0) return []
        const subDir = []
        for (const item of items) {
            if (item.dir === true) {
                subDir.push(item)
            } else if (item.file === true && item.obj_category === 'video') {
                if (parseInt(item.size.toString()) < 1024 * 1024 * 5) continue
                item.stoken = this.shareTokenCache[shareData.shareId].stoken
                videos.push(
                    QuarkUCVideoItem.objectFrom(item, shareData.shareId)
                )
            } else if (
                item.type === 'file' &&
                this.subtitleExts.some((x) => item.file_name.endsWith(x))
            ) {
                subtitles.push(
                    QuarkUCVideoItem.objectFrom(item, shareData.shareId)
                )
            }
        }
        if (page < Math.ceil(listData.metadata._total / prePage)) {
            const nextItems = await this.listFile(
                shareData,
                videos,
                subtitles,
                shareId,
                folderId,
                page + 1
            )
            items.push(...nextItems)
        }
        for (const dir of subDir) {
            const subItems = await this.listFile(
                shareData,
                videos,
                subtitles,
                shareId,
                dir.fid
            )
            items.push(...subItems)
        }
        return items
    }
    findBestLCS(mainItem, targetItems) {
        const results = []
        let bestMatchIndex = 0
        for (let i = 0; i < targetItems.length; i++) {
            const currentLCS = UZUtils.lcs(mainItem.name, targetItems[i].name)
            results.push({ target: targetItems[i], lcs: currentLCS })
            if (currentLCS.length > results[bestMatchIndex].lcs.length) {
                bestMatchIndex = i
            }
        }
        const bestMatch = results[bestMatchIndex]
        return {
            allLCS: results,
            bestMatch: bestMatch,
            bestMatchIndex: bestMatchIndex,
        }
    }
    clean() {
        this.saveFileIdCaches = {}
    }
    async clearSaveDir() {
        const listData = await this.api(
            `file/sort?${this.pr}&pdir_fid=${this.saveDirId}&_page=1&_size=200&_sort=file_type:asc,updated_at:desc`,
            null,
            3,
            'get'
        )
        if (
            listData.data != null &&
            listData.data.list != null &&
            listData.data.list.length > 0
        ) {
            await this.api(`file/delete?${this.pr}`, {
                action_type: 2,
                filelist: listData.data.list.map((v) => v.fid),
                exclude_fids: [],
            })
        }
    }
    async createSaveDir(clean) {
        await this.clearSaveDir()
        const listData = await this.api(
            `file/sort?${this.pr}&pdir_fid=0&_page=1&_size=200&_sort=file_type:asc,updated_at:desc`,
            null,
            3,
            'get'
        )
        if (listData.data != null && listData.data.list != null) {
            for (const item of listData.data.list) {
                if (item.file_name === this.saveDirName) {
                    this.saveDirId = item.fid
                    await this.clearSaveDir()
                    break
                }
            }
        }
        if (this.saveDirId == null) {
            const create = await this.api(`file?${this.pr}`, {
                pdir_fid: '0',
                file_name: this.saveDirName,
                dir_path: '',
                dir_init_lock: false,
            })
            if (create.data != null && create.data.fid != null) {
                this.saveDirId = create.data.fid
            }
        }
    }
    async save(shareId, stoken, fileId, fileToken, clean) {
        clean || (clean = false)
        await this.createSaveDir(clean)
        if (clean) {
            this.clean()
        }
        if (this.saveDirId == null) return null
        if (stoken == null) {
            await this.getShareToken({ shareId })
            if (!this.shareTokenCache.hasOwnProperty(shareId)) return null
        }
        const saveResult = await this.api(`share/sharepage/save?${this.pr}`, {
            fid_list: [fileId],
            fid_token_list: [fileToken],
            to_pdir_fid: this.saveDirId,
            pwd_id: shareId,
            stoken: stoken || this.shareTokenCache[shareId].stoken,
            pdir_fid: '0',
            scene: 'link',
        })
        if (saveResult.data != null && saveResult.data.task_id != null) {
            let retry = 0
            while (true) {
                const taskResult = await this.api(
                    `task?${this.pr}&task_id=${saveResult.data.task_id}&retry_index=${retry}`,
                    null,
                    3,
                    'get'
                )
                if (
                    taskResult.data != null &&
                    taskResult.data.save_as != null &&
                    taskResult.data.save_as.save_as_top_fids != null &&
                    taskResult.data.save_as.save_as_top_fids.length > 0
                ) {
                    return taskResult.data.save_as.save_as_top_fids[0]
                }
                retry++
                if (retry > 2) break
                await new Promise((resolve) => setTimeout(resolve, 1000))
            }
        }
        return null
    }
    async getLiveTranscoding(shareId, stoken, fileId, fileToken, flag) {
        if (!this.saveFileIdCaches.hasOwnProperty(fileId)) {
            const saveFileId = await this.save(
                shareId,
                stoken,
                fileId,
                fileToken,
                true
            )
            if (saveFileId == null) {
                const info = new PanPlayInfo()
                info.error = 'Live 转存失败！'
                return info
            }

            this.saveFileIdCaches[fileId] = saveFileId
        }
        const transcoding = await this.api(`file/v2/play?${this.pr}`, {
            fid: this.saveFileIdCaches[fileId],
            resolutions: 'normal,low,high,super,2k,4k',
            supports: 'fmp4',
        })
        var playUrl = ''
        if (transcoding.data != null && transcoding.data.video_list != null) {
            const flagId = flag
            for (const video of transcoding.data.video_list) {
                if (video.resolution === '4k') {
                    playUrl = video.video_info.url
                    break
                } else if (video.resolution === '2k') {
                    playUrl = video.video_info.url
                    break
                } else if (video.resolution === 'super') {
                    playUrl = video.video_info.url
                    break
                } else if (video.resolution === 'high') {
                    playUrl = video.video_info.url
                    break
                } else if (video.resolution === 'low') {
                    playUrl = video.video_info.url
                    break
                } else if (video.resolution === 'normal') {
                    playUrl = video.video_info.url
                    break
                }
            }
        }
        var errorStr = ''
        if (playUrl.length > 0) {
            playUrl = playUrl
        } else {
            errorStr = '获取播放链接失败'
        }
        const info = new PanPlayInfo()
        info.url = playUrl
        info.error = errorStr
        return info
    }
    async getDownload(shareId, shareToken, fileId, fileToken, clean) {
        clean || (clean = false)
        try {
            if (!this.saveFileIdCaches.hasOwnProperty(fileId)) {
                const saveFileId = await this.save(
                    shareId,
                    shareToken,
                    fileId,
                    fileToken,
                    clean
                )
                if (saveFileId == null) {
                    const info = new PanPlayInfo()
                    info.error = '转存失败，可能空间不足～'
                    return info
                }
                this.saveFileIdCaches[fileId] = saveFileId
            }
            const down = await this.api(
                `file/download?${this.pr}&uc_param_str=`,
                {
                    fids: [this.saveFileIdCaches[fileId]],
                }
            )
            if (
                down.data != null &&
                down.data.length > 0 &&
                down.data[0].download_url != null
            ) {
                const info = new PanPlayInfo()
                info.url = down.data[0].download_url
                info.error = ''
                info.playHeaders = { Cookie: this.cookie }
                return info
            }
        } catch (error) {
            const info = new PanPlayInfo()
            info.error = error.toString()
            return info
        }
        const info = new PanPlayInfo()
        info.error = '获取播放链接失败~2'
        return info
    }
}

//MARK: - 阿里 相关实现
class Ali {
    constructor() {
        this.shareTokenCache = {}
        this.saveFileIdCaches = {}
        this.saveDirId = null
        ;(this.userDriveId = null), (this.saveDirName = 'uz影视')
        this.user = {}
        this.oauth = {}
        this.isSVip = true
        this.token = ''
        this.apiUrl = 'https://api.aliyundrive.com/'
        this.openApiUrl = 'https://open.aliyundrive.com/adrive/v1.0/'
        this.updateToken = () => {}
        this.baseHeaders = {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) uc-cloud-drive/2.5.20 Chrome/100.0.4896.160 Electron/18.3.5.4-b478491100 Safari/537.36 Channel/pckk_other_ch',
            referer: 'https://www.aliyundrive.com',
            'Content-Type': 'application/json',
        }
    }

    get panName() {
        return PanType.Ali
    }

    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    //验证时间戳
    verifyTimestamp(timestamp) {
        // 时间为了保证任意时区都一致 所以使用格林威治时间
        const currentTimeString = new Date().toISOString()
        const currentTime = new Date(currentTimeString).getTime()
        const requestTime = new Date(timestamp).getTime()
        const timeDifference = Math.abs(currentTime - requestTime)
        // 检查时间差是否小于2分钟（120000毫秒）
        return timeDifference < 120000
    }

    async api(url, data, headers, retry) {
        headers = headers || {}
        const auth = url.startsWith('adrive/')
        Object.assign(headers, this.baseHeaders)
        if (auth) {
            Object.assign(headers, {
                Authorization: this.user.auth,
            })
        }

        const leftRetry = retry || 3
        while (leftRetry > 0) {
            try {
                const response = await req(this.apiUrl + url, {
                    method: 'post',
                    headers: headers,
                    data: JSON.stringify(data),
                })
                if (response.code === 401) {
                    this.cookie = ''
                    return {}
                }
                const resp = response.data
                return resp
            } catch (e) {}
            leftRetry--
            await this.delay(1000)
        }
        return resp
    }

    async openApi(url, data, headers, retry) {
        headers = headers || {}
        Object.assign(headers, {
            Authorization: this.oauth.auth,
        })

        const leftRetry = retry || 3
        while (leftRetry > 0) {
            try {
                const response = await req(this.openApiUrl + url, {
                    method: 'post',
                    headers: headers,
                    data: JSON.stringify(data),
                })
                if (response.code === 401) {
                    this.cookie = ''
                    return {}
                }
                const resp = response.data
                return resp
            } catch (e) {}
            leftRetry--
            await this.delay(1000)
        }
        return resp
    }

    //用户登陆
    async login() {
        if (
            !this.user.user_id ||
            !this.verifyTimestamp(this.user.expire_time)
        ) {
            try {
                const loginResp = await req(
                    'https://auth.aliyundrive.com/v2/account/token',
                    {
                        method: 'post',
                        headers: this.baseHeaders,
                        data: {
                            refresh_token: this.token,
                            grant_type: 'refresh_token',
                        },
                    }
                )

                if (loginResp.code == 200) {
                    this.user = loginResp.data
                    this.user.expire_time = new Date().toISOString()
                    this.user.auth = `${loginResp.data.token_type} ${loginResp.data.access_token}`
                    this.user.token = loginResp.data.refresh_token
                    this.updateToken()
                }
            } catch (e) {}
        }
    }

    //授权第三方Alist
    async openAuth() {
        if (
            !this.oauth.access_token ||
            !this.verifyTimestamp(this.oauth.expire_time)
        ) {
            try {
                const openToken =
                    this.oauth.token || (await this.getOpenToken())
                const openResp = await req(
                    'https://api-cf.nn.ci/alist/ali_open/token',
                    {
                        method: 'post',
                        headers: this.baseHeaders,
                        data: {
                            refresh_token: openToken,
                            grant_type: 'refresh_token',
                        },
                    }
                )

                if (openResp.code == 200) {
                    this.oauth = openResp.data
                    this.oauth.expire_time = new Date().toISOString()
                    this.oauth.auth = `${openResp.data.token_type} ${openResp.data.access_token}`
                    this.oauth.token = openResp.data.refresh_token
                }
            } catch (e) {}
        }
    }

    //根据授权码获取token
    async getOpenToken() {
        try {
            let code = await this.getOpenCode()
            let openResp = await req(
                'https://api-cf.nn.ci/alist/ali_open/code',
                {
                    method: 'post',
                    headers: this.baseHeaders,
                    data: {
                        code: code,
                        grant_type: 'authorization_code',
                    },
                }
            )
            let openToken = openResp.data.refresh_token
            return openToken
        } catch (e) {}
    }

    //用户授权，获取授权码code
    async getOpenCode() {
        let url =
            'https://open.aliyundrive.com/oauth/users/authorize?client_id=76917ccccd4441c39457a04f6084fb2f&redirect_uri=https://alist.nn.ci/tool/aliyundrive/callback&scope=user:base,file:all:read,file:all:write&state='
        let headers = this.baseHeaders
        Object.assign(headers, {
            Authorization: this.user.auth,
        })

        try {
            let openResp = await req(url, {
                method: 'post',
                headers: headers,
                data: {
                    authorize: 1,
                    scope: 'user:base,file:all:read,file:all:write',
                },
            })
            let uri = openResp.data.redirectUri
            let regex = /http.*code=(.*)/
            let matches = regex.exec(uri)
            let code = matches[1]
            return code
        } catch (e) {}
    }

    /**
     * 根据链接获取分享ID和文件夹ID
     * @param {string} url
     * @returns {null|{shareId: string, folderId: string}}
     **/
    getShareData(url) {
        let regex =
            /https:\/\/www\.alipan\.com\/s\/([^\\/]+)(\/folder\/([^\\/]+))?|https:\/\/www\.aliyundrive\.com\/s\/([^\\/]+)(\/folder\/([^\\/]+))?/
        let matches = regex.exec(url)
        if (matches) {
            return {
                shareId: matches[1] || matches[4],
                folderId: matches[3] || matches[6] || 'root',
            }
        }
        return null
    }

    /**
     * 获取分享token
     * @param {{shareId: string, sharePwd: string}} shareData
     **/
    async getShareToken(shareData) {
        if (!this.shareTokenCache.hasOwnProperty(shareData.shareId)) {
            delete this.shareTokenCache[shareData.shareId]
            const shareToken = await this.api(`v2/share_link/get_share_token`, {
                share_id: shareData.shareId,
                share_pwd: shareData.sharePwd || '',
            })
            if (shareToken.expire_time) {
                this.shareTokenCache[shareData.shareId] = shareToken
            }
        }
    }

    clean() {
        this.saveFileIdCaches = {}
    }

    async clearSaveDir() {
        const listData = await this.openApi(`openFile/list`, {
            drive_id: this.userDriveId,
            parent_file_id: this.saveDirId,
            limit: 100,
            order_by: 'updated_at',
            order_direction: 'DESC',
        })
        if (listData.items) {
            for (const item of listData.items) {
                const del = await this.openApi(`openFile/delete`, {
                    drive_id: this.userDriveId,
                    file_id: item.file_id,
                })
            }
        }
    }

    async createSaveDir(clean = false) {
        if (!this.user.device_id) return
        if (this.saveDirId) {
            // 删除所有子文件
            if (clean) await this.clearSaveDir()
            return
        }
        let driveInfo = await this.openApi(`user/getDriveInfo`, {})

        if (driveInfo.resource_drive_id) {
            this.userDriveId = driveInfo.resource_drive_id
            const listData = await this.openApi(`openFile/list`, {
                drive_id: this.userDriveId,
                parent_file_id: 'root',
                limit: 100,
                order_by: 'updated_at',
                order_direction: 'DESC',
            })
            if (listData.items) {
                for (const item of listData.items) {
                    if (item.name === this.saveDirName) {
                        this.saveDirId = item.file_id
                        await this.clearSaveDir()
                        break
                    }
                }
                if (!this.saveDirId) {
                    const create = await this.openApi(`openFile/create`, {
                        check_name_mode: 'refuse',
                        drive_id: this.userDriveId,
                        name: this.saveDirName,
                        parent_file_id: 'root',
                        type: 'folder',
                    })

                    if (create.file_id) {
                        this.saveDirId = create.file_id
                    }
                }
            }
        }
    }

    async save(shareId, fileId, clean) {
        await this.login()
        await this.openAuth()
        await this.createSaveDir(clean)
        if (clean) {
            this.clean()
        }
        if (this.saveDirId == null) return null
        await this.getShareToken({ shareId })
        if (!this.shareTokenCache.hasOwnProperty(shareId)) return null
        const saveResult = await this.api(
            `adrive/v2/file/copy`,
            {
                file_id: fileId,
                share_id: shareId,
                auto_rename: true,
                to_parent_file_id: this.saveDirId,
                to_drive_id: this.userDriveId,
            },
            {
                'X-Share-Token': this.shareTokenCache[shareId].share_token,
            }
        )
        if (saveResult.file_id) return saveResult.file_id
        return false
    }

    async getLiveTranscoding(shareId, fileId) {
        if (!this.saveFileIdCaches[fileId]) {
            const saveFileId = await this.save(shareId, fileId, true)
            if (!saveFileId) return new PanPlayInfo('', 'Live 转存失败～')
            this.saveFileIdCaches[fileId] = saveFileId
        }
        const transcoding = await this.openApi(
            `openFile/getVideoPreviewPlayInfo`,
            {
                file_id: this.saveFileIdCaches[fileId],
                drive_id: this.userDriveId,
                category: 'live_transcoding',
                url_expire_sec: '14400',
            }
        )
        if (
            transcoding.video_preview_play_info &&
            transcoding.video_preview_play_info.live_transcoding_task_list
        ) {
            let liveList =
                transcoding.video_preview_play_info.live_transcoding_task_list
            liveList.sort((a, b) => b.template_width - a.template_width)
            const p = ['超清', '高清', '标清', '普画', '极速']
            const arr = ['QHD', 'FHD', 'HD', 'SD', 'LD']
            return new PanPlayInfo(liveList[0].url, '')
        }
        return new PanPlayInfo('', '获取播放链接失败~1')
    }

    async getDownload(shareId, fileId) {
        if (!this.saveFileIdCaches[fileId]) {
            const saveFileId = await this.save(shareId, fileId, true)
            if (!saveFileId) return new PanPlayInfo('', 'Download 转存失败～')
            this.saveFileIdCaches[fileId] = saveFileId
        }
        const down = await this.openApi(`openFile/getDownloadUrl`, {
            file_id: this.saveFileIdCaches[fileId],
            drive_id: this.userDriveId,
        })
        if (down.url) {
            return new PanPlayInfo(down.url, '')
        }
        return new PanPlayInfo('', '获取播放链接失败~2')
    }

    findBestLCS(mainItem, targetItems) {
        const results = []
        let bestMatchIndex = 0
        for (let i = 0; i < targetItems.length; i++) {
            const currentLCS = UZUtils.lcs(mainItem.name, targetItems[i].name)
            results.push({ target: targetItems[i], lcs: currentLCS })
            if (currentLCS.length > results[bestMatchIndex].lcs.length) {
                bestMatchIndex = i
            }
        }
        const bestMatch = results[bestMatchIndex]
        return {
            allLCS: results,
            bestMatch: bestMatch,
            bestMatchIndex: bestMatchIndex,
        }
    }

    async listFile(shareId, folderId, videos, subtitles, nextMarker) {
        const subtitleExts = ['srt', 'ass', 'scc', 'stl', 'ttml']
        const listData = await this.api(
            `adrive/v2/file/list_by_share`,
            {
                share_id: shareId,
                parent_file_id: folderId,
                limit: 200,
                order_by: 'name',
                order_direction: 'ASC',
                marker: nextMarker || '',
            },
            {
                'X-Share-Token': this.shareTokenCache[shareId].share_token,
            }
        )

        const items = listData.items
        if (!items) return []

        if (listData.next_marker) {
            const nextItems = await this.listFile(
                shareId,
                folderId,
                videos,
                subtitles,
                listData.next_marker
            )
            for (const item of nextItems) {
                items.push(item)
            }
        }

        const subDir = []

        for (const item of items) {
            if (item.type === 'folder') {
                subDir.push(item)
            } else if (item.type === 'file' && item.category === 'video') {
                if (item.size < 1024 * 1024 * 5) continue
                item.name = item.name.replace(/玩偶哥.*【神秘的哥哥们】/g, '')
                videos.push(item)
            } else if (
                item.type === 'file' &&
                subtitleExts.some((x) => item.file_extension.endsWith(x))
            ) {
                subtitles.push(item)
            }
        }

        for (const dir of subDir) {
            const subItems = await this.listFile(
                dir.share_id,
                dir.file_id,
                videos,
                subtitles
            )
            for (const item of subItems) {
                items.push(item)
            }
        }

        return items
    }

    /**
     * 获取文件列表
     * @param {string} shareUrl
     * @returns {@Promise<PanListDetail>}
     **/
    async getFilesByShareUrl(shareUrl) {
        const data = new PanListDetail()
        const shareData =
            typeof shareUrl === 'string'
                ? this.getShareData(shareUrl)
                : shareUrl
        if (!shareData) {
            data.error = '分享链接无效'
            return data
        }
        await this.getShareToken(shareData)
        if (!this.shareTokenCache[shareData.shareId]) {
            data.error = '分享失效'
            return data
        }

        const videos = []
        const subtitles = []

        await this.listFile(
            shareData.shareId,
            shareData.folderId,
            videos,
            subtitles
        )

        videos.forEach((item) => {
            // 复制 item
            const element = JSON.parse(JSON.stringify(item))
            const videoItem = new PanVideoItem()
            videoItem.data = element
            videoItem.panType = this.panName
            videoItem.name = element.name
            videoItem.fromName = '原画'
            data.videos.push(videoItem)
        })

        if (subtitles.length > 0) {
            videos.forEach((item) => {
                var matchSubtitle = this.findBestLCS(item, subtitles)
                if (matchSubtitle.bestMatch) {
                    item.subtitle = matchSubtitle.bestMatch.target
                }
            })
        }

        return data
    }

    /**
     * 获取播放信息
     * @param {{flag:string,shareId:string,shareToken:string,fileId:string,shareFileToken:string }} data
     * @returns {@Promise<PanPlayInfo>}
     */
    async getPlayUrl(data) {
        let playData
        try {
            const shareId = data.share_id
            const fileId = data.file_id
            if (this.isSVip) {
                playData = await this.getDownload(shareId, fileId)
            } else {
                playData = await this.getLiveTranscoding(shareId, fileId)
            }
        } catch (error) {
            playData = new PanPlayInfo()
            playData.error = error.toString()
        }
        return playData
    }
}

//MARK: 网盘扩展统一入口
/**
 * 网盘工具
 */
class PanTools {
    constructor() {
        //MARK: 1. 在这里初始化 对应网盘的具体实现对象

        this.quark = new QuarkUC(true)
        this.uc = new QuarkUC(false)
        this.ali = new Ali()

        /**
         * 扩展运行标识 ** uzApp 运行时自动赋值，请勿修改 **
         */
        this._uzTag = ''
    }

    /**
     * 扩展运行标识 ** uzApp 运行时自动赋值，请勿修改 **
     */
    set uzTag(value) {
        this._uzTag = value

        this.setSaveDirName()
    }

    get uzTag() {
        return this._uzTag
    }

    /**
     * 获取 夸克 UC cookie  ** 无法在 PanTools 外部操作**
     * 环境变量 key 为 PanType.xx + "Cookie",请在 json 文件中添加
     * @param {PanType} panType
     * @returns {@Promise<string>}
     */
    async getQuarkUCCookie(panType) {
        const cookie = await getEnv(this.uzTag, panType + 'Cookie')
        return cookie
    }

    /**
     * 更新 夸克 UC cookie ** 无法在 PanTools 外部操作**
     * @param {PanType} panType
     * @param {string} cookie
     */
    async updateQuarkUCCookie(panType, cookie) {
        await setEnv(this.uzTag, panType + 'Cookie', cookie)
    }

    /**
     * 获取 Alitoken  ** 无法在 PanTools 外部操作**
     * 环境变量 key 为 PanType.xx + keyWord关键字,请在 json 文件中添加
     * @param {PanType} panType
     * @returns {@Promise<string>}
     */
    async getAliDataEnv(panType) {
        const token = await getEnv(this.uzTag, panType + 'Token')
        return token
    }

    /**
     * 更新 Alitoken  ** 无法在 PanTools 外部操作**
     * @param {PanType} panType
     * @param {string} data
     */
    async updateAliDataEnv(panType, token) {
        await setEnv(this.uzTag, panType + 'Token', token)
    }

    /**
     * 设置用户指定的转存文件夹名称
     */
    async setSaveDirName() {
        var dirName = await getEnv(this.uzTag, '转存文件夹名称')

        if (dirName == null || dirName === '') {
            dirName = 'uz影视'
            await setEnv(this.uzTag, '转存文件夹名称', dirName)
        }
        //MARK: 2. 请补充自定义转存文件夹名称
        this.quark.saveDirName = dirName
        this.uc.saveDirName = dirName
        this.ali.saveDirName = dirName
    }

    /**
     * 清理转存文件夹
     */
    async cleanSaveDir() {
        //MARK: 3. 请实现清理转存文件夹
        await this.quark.createSaveDir()
        await this.uc.createSaveDir()
        await this.ali.createSaveDir()
    }

    /**
     * 获取网盘资源列表
     * @param {string} shareUrl
     * @returns {@Promise<PanListDetail>}
     */
    async getShareVideos(shareUrl) {
        //MARK: 4. 请实现获取网盘资源列表
        if (shareUrl.includes('https://pan.quark.cn')) {
            const data = await this.quark.getFilesByShareUrl(shareUrl)
            return JSON.stringify(data)
        } else if (shareUrl.includes('https://drive.uc.cn')) {
            shareUrl = shareUrl.split('?')[0]
            const data = await this.uc.getFilesByShareUrl(shareUrl)
            return JSON.stringify(data)
        } else if (shareUrl.includes('https://www.alipan.com')) {
            const data = await this.ali.getFilesByShareUrl(shareUrl)
            return JSON.stringify(data)
        }

        const data = new PanListDetail()
        data.error = ''
        return JSON.stringify(data)
    }

    /**
     * 获取播放信息
     * @param {PanVideoItem} item
     * @returns {@Promise<PanPlayInfo>}
     */
    async getPlayInfo(item) {
        //MARK: 5. 请实现获取播放信息
        if (item.panType === PanType.Quark) {
            /// 如果需要 cookie 请在这里获取
            this.quark.cookie = await this.getQuarkUCCookie(PanType.Quark)
            /// 更新 Quark cookie
            const that = this
            this.quark.updateCookie = function () {
                that.updateQuarkUCCookie(PanType.Quark, this.cookie)
            }
            if (this.quark.cookie === '') {
                const data = new PanPlayInfo()
                data.error = '获取 ' + PanType.Quark + ' cookie 失败~'
                return JSON.stringify(data)
            }
            const data = await this.quark.getPlayUrl(item.data)
            return JSON.stringify(data)
        } else if (item.panType === PanType.UC) {
            /// 如果需要 cookie 请在这里获取
            this.uc.cookie = await this.getQuarkUCCookie(PanType.UC)
            /// 更新 UC cookie
            const that = this
            this.uc.updateCookie = function () {
                that.updateQuarkUCCookie(PanType.UC, this.cookie)
            }
            if (this.uc.cookie === '') {
                const data = new PanPlayInfo()
                data.error = '获取 ' + PanType.UC + ' cookie 失败~'
                return JSON.stringify(data)
            }
            const data = await this.uc.getPlayUrl(item.data)
            return JSON.stringify(data)
        } else if (item.panType === PanType.Ali) {
            /// 如果需要 data 请在这里获取
            this.ali.token = await this.getAliDataEnv(PanType.Ali)
            /// 更新 token
            const that = this
            this.ali.updateToken = function () {
                that.updateAliDataEnv(PanType.Ali, this.ali.token)
            }

            if (this.ali.token === '') {
                const data = new PanPlayInfo()
                data.error = '获取 ' + PanType.Ali + ' token 失败~'
                return JSON.stringify(data)
            }
            const data = await this.ali.getPlayUrl(item.data)
            return JSON.stringify(data)
        }

        const data = new PanPlayInfo()
        data.error = '暂不支持 ' + item.panType + ' 网盘~'
        return JSON.stringify(data)
    }
}

// 固定实例名称
const uzPanToolsInstance = new PanTools()
