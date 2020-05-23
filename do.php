<?php
/**
 * 防注入
 * 数组不返回直接修改，数值返回
 * @param $arr
 */
function SafeFilter(&$arr)
{
    if (is_array($arr))
    {
        foreach ($arr as $key => $value)
        {
            if (!is_array($value))
            {
                if (!get_magic_quotes_gpc())    //不对magic_quotes_gpc转义过的字符使用addslashes(),避免双重转义。
                {
                    $value = addslashes($value);    //给单引号（'）、双引号（"）、反斜线（\）与 NUL（NULL 字符）加上反斜线转义
                }
                $value = str_replace('_','\_',$value);
                $value = str_replace('%','\%',$value);
                $value = nl2br($value);
                $arr[$key] = htmlspecialchars($value,ENT_QUOTES);   //&,",',> ,< 转为html实体 &amp;,&quot;&#039;,&gt;,&lt;
            }
            else
            {
                SafeFilter($arr[$key]);
            }
        }
    }else{
        if (!get_magic_quotes_gpc())    //不对magic_quotes_gpc转义过的字符使用addslashes(),避免双重转义。
        {
            $arr = addslashes($arr);    //给单引号（'）、双引号（"）、反斜线（\）与 NUL（NULL 字符）加上反斜线转义
        }
        $arr = str_replace('_','\_',$arr);
        $arr = str_replace('%','\%',$arr);
        $arr = nl2br($arr);
        $arr = htmlspecialchars($arr,ENT_QUOTES);   //&,",',> ,< 转为html实体 &amp;,&quot;&#039;,&gt;,&lt;

        return $arr;
    }
}
if ($_POST['dosubmit']) {
	header('Content-type:application/json;charset=utf-8');
	$info = $_POST['info'];
    SafeFilter($info);
	$info['createtime'] = time();
	$info['track'] = $_POST['track'];
	
	$retCode = 0;
	$retDesc = '';
	$retUrl = '';
	
	if (!$info['realname'] || preg_match("[^\x80-\xff]", $info['realname']) || strlen($info['realname']) < 4 || strlen($info['realname']) > 12) {
		$retDesc = '姓名格式错误';
	} else if (!preg_match("/^((((19|20)(([02468][048])|([13579][26]))-02-29))|((20[0-9][0-9])|(19[0-9][0-9]))-((((0[1-9])|(1[0-2]))-((0[1-9])|(1\d)|(2[0-8])))|((((0[13578])|(1[02]))-31)|(((01,3-9])|(1[0-2]))-(29|30)))))$/", $info['birthday'])) {
		$retDesc = '生日格式错误';
	} else if (!preg_match("/^1[34578]{1}\d{9}$/", $info['mobile'])) {
		$retDesc = '手机号码格式错误';
	} else if (!isset($_POST['access'])) {
		$retDesc = '请勾选我同意中国平安致电确认免费保障生效事宜及保险咨询';
	} else if (empty($info['city'])) {
        $retDesc = '请选择城市';
    } else {
		include "mysql.class.php";
		$db = new mysql();
		$db->insert($info, '@#_loan_apply');
		
		$retCode = 1;
		$retUrl = 'success.html';
		//同步到loanreg表
        $data = array();
        $data['ctime'] = time();
        $data['track'] = $_POST['track'];
        $data['LoanAmount'] = $info['income'];
        $data['Name'] = $info['realname'];
        $data['Phone'] = $info['mobile'];
        $data['Birthday'] = $info['birthday'];
        $data['Sex'] = $info['sex'];
        if(!empty($info['city'])){
                $city = trim($info['city']);
                $temp = explode(' ',$city);
                foreach($temp as $k2=>$v2){
                    if(strpos($v2,'市')){
                        $city = $v2;
                        break;
                    }
                }
                $data['cityName'] = $city;
            $ret = $db->insert($data, 'boc_loanreg');
        }
	}
	die(json_encode(array(
		'retCode'=>$retCode,
		'retDesc'=>$retDesc,
		'retUrl'=>$retUrl
	)));
}
?>