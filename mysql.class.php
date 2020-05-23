<?php
class mysql {
	/**
	* 数据库配置信息
	*/
	private $config = null;

	/**
	* 数据库连接资源句柄
	*/
	public $link = null;

	/**
	* 最近一次查询资源句柄
	*/
	public $queryid = null;

	/**
	*  统计数据库查询次数
	*/
	public $querycount = 0;

	public function __construct($data = array()) {
		if(empty($data)) {
			$data = array(
				'hostname'=>'localhost',
				'database'=>'boc',
				'username'=>'boc',
				'password'=>'boc@123',
				'tablepre'=>'boc_',
				'charset'=>'utf8',
				'type'=>'mysql',
				'debug'=>true,
				'pconnect'=>0,
				'autoconnect'=>1
			);
		}
		$this->open($data);
	}

	/**
	* 打开数据库连接,有可能不真实连接数据库
	* @param $config	数据库连接参数
	*
	* @return void
	*/
	public function open($config) {
		$this->config = $config;

		if($config['autoconnect'] == 1) {
			$this->connect();
		}
	}

	/**
	* 真正开启数据库连接
	*
	* @return void
	*/
	public function connect() {
		$func = $this->config['pconnect'] == 1 ? 'mysql_pconnect' : 'mysql_connect';
		//mysql_connect()执行的时候，任何解释错误、语法错误、执行错误都会在页面中显示出来。前面加@可以隐藏所有上述错误信息。
		if(!$this->link = @$func($this->config['hostname'], $this->config['username'], $this->config['password'], 1)) {
			$this->halt('Can not connect to MySQL server');
			return false;
		}

		if($this->version() > '4.1') {
			$charset = isset($this->config['charset']) ? $this->config['charset'] : '';
			$serverset = $charset ? "character_set_connection='$charset', character_set_results='$charset', character_set_client=binary" : '';
			$serverset .= $this->version() > '5.0.1' ? ((empty($serverset) ? '' : ',')." sql_mode='' ") : '';
			$serverset && mysql_query("SET $serverset", $this->link);
		}

		if($this->config['database'] && !@mysql_select_db($this->config['database'], $this->link)) {
			$this->halt('Cannot use database '.$this->config['database']);
			return false;
		}

		$this->database = $this->config['database'];
		return $this->link;
	}

	/**
	* 数据库查询执行方法
	* @param $sql 要执行的sql语句
	* @return 查询资源句柄
	*/
	private function execute($sql) {
		if(!is_resource($this->link)) $this->connect();
		$charset = isset($this->config['charset']) ? $this->config['charset'] : '';
		mysql_query('set names '.$charset);
		mysql_query('set character set '.$charset);
		mysql_query('set character_set_results="'.$charset.'"');

		$sql = str_replace('@#_', $this->config['tablepre'], $sql);
		$this->queryid = mysql_query($sql, $this->link) or $this->halt(mysql_error(), $sql);
		$this->querycount++;
		return $this->queryid;
	}

	/**
	* 释放查询资源
	* @return void
	*/
	public function free_result() {
		if(is_resource($this->queryid)) {
			mysql_free_result($this->queryid);
			$this->queryid = null;
		}
	}

	/**
	* 直接执行sql查询
	* @param $sql							查询sql语句
	* @return	boolean/query resource		如果为查询语句，返回资源句柄，否则返回true/false
	*/
	public function query($sql) {
		return $this->execute($sql);
	}

	private function fetch_array($query, $result_type = MYSQL_ASSOC) {
		$res = @mysql_fetch_array($query, $result_type);
		if(!$res) {
			$this->free_result();
		}
		return $res;
		return $this->gbk2utf8($res);

		//$result_type是一个常量，可以接受以下值：MYSQL_ASSOC，MYSQL_NUM 和 MYSQL_BOTH。
		//如果用了 MYSQL_BOTH，将得到一个同时包含关联和数字索引的数组。
		//用 MYSQL_ASSOC 只得到关联索引（如同 mysql_fetch_assoc() 那样）$row["id"]
		//用 MYSQL_NUM 只得到数字索引（如同 mysql_fetch_row() 那样）$row[0]
		//注: 该函数返回的字段名是大小写敏感的。
	}

	public function row_array($sql){
		$queryid = $this->query($sql);
		$array = $this->fetch_array($queryid);
		return $array;
	}

	public function result_array($sql){
		$array = array();
		$queryid = $this->query($sql);

		while($row = $this->fetch_array($queryid)){
			$array[] = $row;
		}
		return $array;
	}

	public function result($sql, $row) {
		$this->queryid = $this->execute($sql);
		return @mysql_result($this->queryid, $row);
	}

	public function error() {
		return @mysql_error($this->link);
	}

	public function errno() {
		return intval(@mysql_errno($this->link)) ;
	}

	public function version() {
		if(!is_resource($this->link)) {
			$this->connect();
		}
		return mysql_get_server_info($this->link);
	}

	public function close() {
		if (is_resource($this->link)) {
			@mysql_close($this->link);
		}
	}

	public function halt($message = '', $sql = '') {
		if($this->config['debug']) {
			$error = array_filter(array(
				'MySQL Query'=>$sql,
				'Time'=>date('Y-m-d H:i:s'),
				'Script'=>$_SERVER['PHP_SELF'],
				'MySQL Error'=>@mysql_error($this->link),
				'MySQL Errno'=>intval(@mysql_errno($this->link)),
				'Message'=>$message
			));

			$msg = array();
			foreach($error as $k=>$v) {
				$msg[] = $k . ': ' . $v;
			}
			echo '<div style="font-size:12px; line-height:20px; text-align:left; border:1px solid #9cc9e0; padding:5px; color:#000; font-family:Verdana"><span>' . implode('<br />', $msg) . '</span></div>';
			@$fp = fopen('dberror.log', 'ab');
			@flock($fp, 3);
			@fwrite($fp, implode(PHP_EOL, $msg) . "\r\n---------\r\n");
			@fclose($fp);
			$this->close();
			exit;
		} else {
			return false;
		}
	}

	public function gbk2utf8($data){
		if(is_array($data)){
			return array_map(array($this, "gbk2utf8"), $data);
		} else {
			return iconv('gbk', 'utf-8', $data);
		}
	}

	/**
	* 执行添加记录操作
	* @param $data 		要增加的数据，参数为数组。数组key为字段值，数组值为数据取值
	* @param $table 	数据表
	* @return boolean
	*/
	public function insert($data, $table, $replace = false) {
		if(!is_array($data) || $table == '' || count($data) == 0) {
			return false;
		}

		$fielddata = array_keys($data);
		$valuedata = array_values($data);
		array_walk($fielddata, array($this, 'add_special_char'));
		array_walk($valuedata, array($this, 'escape_string'));

		$field = implode (',', $fielddata);
		$value = implode (',', $valuedata);

		$cmd = $replace ? 'replace into' : 'insert into';
		$sql = $cmd.' `'.$this->config['database'].'`.`'.$table.'`('.$field.') values ('.$value.')';
		$this->execute($sql);
		return mysql_insert_id($this->link);
	}
	
	/**
	 * 执行更新记录操作
	 * @param $data 	要更新的数据内容，参数可以为数组也可以为字符串，建议数组。
	 * 					为数组时数组key为字段值，数组值为数据取值
	 * 					为字符串时[例：`name`='phpcms',`hits`=`hits`+1]。
	 *					为数组时[例: array('name'=>'phpcms','password'=>'123456')]
	 *					数组可使用array('name'=>'+=1', 'base'=>'-=1');程序会自动解析为`name` = `name` + 1, `base` = `base` - 1
	 * @param $table 	数据表
	 * @param $where 	更新数据时的条件
	 * @return boolean
	 */
	public function update($data, $table, $where = '') {
		if($table == '' or $where == '') {
			return false;
		}

		$where = ' where ' . $where;
		$field = '';
		if(is_string($data) && $data != '') {
			$field = $data;
		} elseif (is_array($data) && count($data) > 0) {
			$fields = array();
			foreach($data as $k=>$v) {
				switch (substr($v, 0, 2)) {
					case '+=':
						$v = substr($v,2);
						if (is_numeric($v)) {
							$fields[] = $this->add_special_char($k) . '=' . $this->add_special_char($k) . '+' . $this->escape_string($v, '', false);
						} else {
							continue;
						}

						break;
					case '-=':
						$v = substr($v,2);
						if (is_numeric($v)) {
							$fields[] = $this->add_special_char($k) . '=' . $this->add_special_char($k) . '-' . $this->escape_string($v, '', false);
						} else {
							continue;
						}
						break;
					default:
						$fields[] = $this->add_special_char($k) . '=' . $this->escape_string($v);
				}
			}
			$field = implode(',', $fields);
		} else {
			return false;
		}

		$sql = 'update `' . $this->config['database'] . '`.`' . $table . '` set ' . $field . $where;
		$this->execute($sql);
		$ret = $this->affected_rows();
		return $ret;
	}
	
	/**
	 * 获取最后数据库操作影响到的条数
	 * @return int
	 */
	public function affected_rows() {
		return mysql_affected_rows($this->link);
	}
	
	/**
	* 对字段两边加反引号，以保证数据库安全
	* @param $value 数组值
	*/
	public function add_special_char(&$value) {
		if('*' == $value || false !== strpos($value, '(') || false !== strpos($value, '.') || false !== strpos ( $value, '`')) {

		} else {
			$value = '`'.trim($value).'`';
		}
		if (preg_match("/\b(select|insert|update|delete)\b/i", $value)) {
			$value = preg_replace("/\b(select|insert|update|delete)\b/i", '', $value);
		}
		return $value;
	}
	
	/**
	* 对字段值两边加引号，以保证数据库安全
	* @param $value 数组值
	* @param $key 数组key
	* @param $quotation
	*/
	public function escape_string(&$value, $key='', $quotation = 1) {

		if ($quotation) {
			$q = '\'';
		} else {
			$q = '';
		}
		$value = $q.$value.$q;
		return $value;
	}
}
?>
