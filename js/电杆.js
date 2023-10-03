var rule = {
	title:'dygang',
	编码:'gb2312',
	搜索编码:'gb2312',
	host:'https://www.dygang.tv',
	homeUrl:'/',
	url: '/fyclass/index_fypage.htm?',
	filter_url:'{{fl.class}}',
	filter:{
	},
	searchUrl: '/e/search/index123.php#tempid=1&tbname=article&keyborad=**&show=title%2Csmalltext&Submit=%CB%D1%CB%F7;post',
	searchable:2,
	quickSearch:0,
	filterable:0,
	headers:{
		'User-Agent': 'MOBILE_UA',
		'Referer': 'https://www.dygang.tv/'
	},
	timeout:5000,
	class_name:'国剧&日韩剧&欧美剧&电影&经典&国配&港片&纪录片&动漫&综艺&4K',
	class_url:'dsj&dsj1&yx&ys&bd&gy&gp&jilupian&dmq&zy&4K',
	play_parse:true,
	play_json:[{
		re:'*',
		json:{
			parse:0,
			jx:0
		}
	}],
	lazy:'',
	limit:6,
	推荐:'div#tl tr:has(>td>table.border1>tbody>tr>td>a>img);table.border1 img&&alt;table.border1 img&&src;table:eq(2)&&Text;a&&href',
	一级:`js:
		pdfh=jsp.pdfh;pdfa=jsp.pdfa;pd=jsp.pd;
		let d = [];
		let turl = (MY_PAGE === 1)? '/' : '/index_'+ MY_PAGE + '.htm';
		input = rule.homeUrl + MY_CATE + turl;
		let html = request(input);
		let list = pdfa(html, 'tr:has(>td>table.border1)');
		list.forEach(it => {
			let title = pdfh(it, 'table.border1 img&&alt');
			if (title!==""){
				d.push({
					title: title,
					desc: pdfh(it, 'table:eq(1)&&Text'),
					pic_url: pd(it, 'table.border1 img&&src', HOST),
					url: pdfh(it, 'a&&href')
				});
			}
		})
		setResult(d);
	`,
	二级:{
		title:"div.title a&&Text",
		img:"#dede_content img&&src",
		desc:"#dede_content&&Text",
		content:"#dede_content&&Text",
		tabs:`js:
pdfh=jsp.pdfh;pdfa=jsp.pdfa;pd=jsp.pd;
TABS=[]
let d = pdfa(html, '#dede_content table tbody tr');
let tabsm = false;
let tabse = false;
d.forEach(function(it) {
	let burl = pd(it, 'a&&href',HOST);
	if (burl.startsWith("magnet")){
		tabsm = true;
	}else if (burl.startsWith("ed2k")){
		tabse = true;
	}
});
if (tabsm === true){
	TABS.push("磁力");
}
if (tabse === true){
	TABS.push("电驴");
}
log('dygang TABS >>>>>>>>>>>>>>>>>>' + TABS);
`,
		lists:`js:
log(TABS);
pdfh=jsp.pdfh;pdfa=jsp.pdfa;pd=jsp.pd;
LISTS = [];
let d = pdfa(html, '#dede_content table tbody tr');
let listm = [];
let liste = [];
d.forEach(function(it){
	let burl = pd(it, 'a&&href',HOST);
	let title = pdfh(it, 'a&&Text');
	log('dygang title >>>>>>>>>>>>>>>>>>>>>>>>>>' + title);
	log('dygang burl >>>>>>>>>>>>>>>>>>>>>>>>>>' + burl);
	let loopresult = title + '$' + burl;
	if (burl.startsWith("magnet")){
		listm.push(loopresult);
	}else if (burl.startsWith("ed2k")){
		liste.push(loopresult);
	}
});
if (listm.length>0){
	LISTS.push(listm);
}
if (liste.length>0){
	LISTS.push(liste);
}
`,
	},
	搜索:`js:
pdfh=jsp.pdfh;pdfa=jsp.pdfa;pd=jsp.pd;
let params = 'tempid=1&tbname=article&keyboard=' + KEY + '&show=title%2Csmalltext&Submit=%CB%D1%CB%F7';
let _fetch_params = JSON.parse(JSON.stringify(rule_fetch_params));
let postData = {
    method: "POST",
    body: params
};
delete(_fetch_params.headers['Content-Type']);
Object.assign(_fetch_params, postData);
log("dygang search postData>>>>>>>>>>>>>>>" + JSON.stringify(_fetch_params));
let search_html = request( HOST + '/e/search/index123.php', _fetch_params, true);
let d=[];
let dlist = pdfa(search_html, 'table.border1');
dlist.forEach(function(it){
	let title = pdfh(it, 'img&&alt');
	if (searchObj.quick === true){
		if (false && title.includes(KEY)){
			title = KEY;
		}
	}
	let img = pd(it, 'img&&src', HOST);
	let content = pdfh(it, 'img&&alt');
	let desc = pdfh(it, 'img&&alt');
	let url = pd(it, 'a&&href', HOST);
	d.push({
		title:title,
		img:img,
		content:content,
		desc:desc,
		url:url
		})
});
setResult(d);
`,
}
