// 搜索验证
var rule={
title:'骚火电影',
host:'https://shdy3.com',
// url:'/list/fyclass-fypage.html',
url:'/list/fyfilter-fypage.html',
filterable:1,//是否启用分类筛选,
filter_url:'{{fl.cateId}}',
filter: {"1":[{"key":"cateId","name":"类型","value":[{"v":"1","n":"全部"},{"v":"6","n":"喜剧"},{"v":"7","n":"爱情"},{"v":"8","n":"恐怖"},{"v":"9","n":"动作"},{"v":"10","n":"科幻"},{"v":"11","n":"战争"},{"v":"12","n":"犯罪"},{"v":"13","n":"动画"},{"v":"14","n":"奇幻"},{"v":"15","n":"剧情"},{"v":"16","n":"冒险"},{"v":"17","n":"悬疑"},{"v":"18","n":"惊悚"},{"v":"19","n":"其它"}]}],"2":[{"key":"cateId","name":"类型","value":[{"v":"2","n":"全部"},{"v":"20","n":"大陆"},{"v":"21","n":"TVB"},{"v":"22","n":"韩剧"},{"v":"23","n":"美剧"},{"v":"24","n":"日剧"},{"v":"25","n":"英剧"},{"v":"26","n":"台剧"},{"v":"27","n":"其它"}]}]},
filter_def:{
	1:{cateId:'1'},
	2:{cateId:'2'}
},
searchUrl:'/search.php?searchword=**',
searchable:2,
quickSearch:0,

headers:{'User-Agent':'MOBILE_UA', },
class_name:'电影&电视剧',
class_url:'1&2',
// 推荐:'.v_list li;a&&title;.lazyload&&data-original;.v_note&&Text;a&&href',
推荐:'*',
一级:'.v_list li;a&&title;.lazyload&&data-original;.v_note&&Text;a&&href',
二级:{
    "title":"h1&&Text;",
    "img":".lazyload&&data-original",
    "desc":";;;.v_info_box&&p&&Text",
    "content":".p_txt.show_part&&Text",
    "tabs":".from_list li",
    "lists":"#play_link:eq(#id) li a"
},
// 搜索:'.v_list li;a&&title;.lazyload&&data-original;.v_note&&Text;a&&href',
搜索:'*',
}
