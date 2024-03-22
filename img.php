<?php 
//获取图片地址文件的绝对路径
$path = dirname(__FILE__);
$file = file($path."/img.txt");
//随机读取一行
$arr = mt_rand( 0, count( $file ) - 1 );
$imgpath  = trim($file[$arr]);
//编码判断，用于输出相应的响应头部编码
if (isset($_GET['charset']) && !empty($_GET['charset'])) {
    $charset = $_GET['charset'];
    if (strcasecmp($charset,"gbk") == 0 ) {
        $imgpath = mb_convert_encoding($imgpath,'gbk', 'utf-8');
    }
} else {
    $charset = 'utf-8';
}
header("Content-Type: text/html; charset=$charset");
die(header("Location: $imgpath"));
?>