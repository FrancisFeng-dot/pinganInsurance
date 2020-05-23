
;(function($, document) {
	//创建 DOM
	$.dom = function(str) {
		if (typeof(str) !== 'string') {
			if ((str instanceof Array) || (str[0] && str.length)) {
				return [].slice.call(str);
			} else {
				return [str];
			}
		}
		if (!$.__create_dom_div__) {
			$.__create_dom_div__ = document.createElement('div');
		}
		$.__create_dom_div__.innerHTML = str;
		return [].slice.call($.__create_dom_div__.childNodes);
	};

	var CLASS_BACKDROP = 'ui-backdrop';

	/**
	 * setTimeout封装
	 * @param {Object} fn
	 * @param {Object} when
	 * @param {Object} context
	 * @param {Object} data
	 */
	$.later = function(fn, when, context, data) {
		when = when || 0;
		var m = fn;
		var d = data;
		var f;
		var r;

		if (typeof fn === 'string') {
			m = context[fn];
		}

		f = function() {
			m.apply(context, $.isArray(d) ? d : [d]);
		};

		r = setTimeout(f, when);

		return {
			id: r,
			cancel: function() {
				clearTimeout(r);
			}
		};
	};

	$.createMask = function(callback) {
		var element = document.createElement('div');
		element.classList.add(CLASS_BACKDROP);
		element.addEventListener($.EVENT_MOVE, $.preventDefault);
		element.addEventListener('tap', function() {
			mask.close();
		});
		var mask = [element];
		mask._show = false;
		mask.show = function() {
			mask._show = true;
			element.setAttribute('style', 'opacity:1');
			document.body.appendChild(element);
			return mask;
		};
		mask._remove = function() {
			if (mask._show) {
				mask._show = false;
				element.setAttribute('style', 'opacity:0');
				$.later(function() {
					var body = document.body;
					element.parentNode === body && body.removeChild(element);
				}, 350);
			}
			return mask;
		};
		mask.close = function() {
			if (callback) {
				if (callback() !== false) {
					mask._remove();
				}
			} else {
				mask._remove();
			}
		};
		return mask;
	};

	var domBuffer = '<div class="ui-dtpicker" data-type="datetime">\
		<div class="ui-dtpicker-header">\
			<button data-id="btn-cancel" class="ui-btn">取消</button>\
			<button data-id="btn-ok" class="ui-btn ui-btn-blue">确定</button>\
		</div>\
		<div class="ui-dtpicker-title"><h5 data-id="title-y">年</h5><h5 data-id="title-m">月</h5><h5 data-id="title-d">日</h5><h5 data-id="title-h">时</h5><h5 data-id="title-i">分</h5></div>\
		<div class="ui-dtpicker-body">\
			<div data-id="picker-y" class="ui-picker">\
				<div class="ui-picker-inner">\
					<div class="ui-pciker-rule ui-pciker-rule-ft"></div>\
					<ul class="ui-pciker-list">\
					</ul>\
					<div class="ui-pciker-rule ui-pciker-rule-bg"></div>\
				</div>\
			</div>\
			<div data-id="picker-m" class="ui-picker">\
				<div class="ui-picker-inner">\
					<div class="ui-pciker-rule ui-pciker-rule-ft"></div>\
					<ul class="ui-pciker-list">\
					</ul>\
					<div class="ui-pciker-rule ui-pciker-rule-bg"></div>\
				</div>\
			</div>\
			<div data-id="picker-d" class="ui-picker">\
				<div class="ui-picker-inner">\
					<div class="ui-pciker-rule ui-pciker-rule-ft"></div>\
					<ul class="ui-pciker-list">\
					</ul>\
					<div class="ui-pciker-rule ui-pciker-rule-bg"></div>\
				</div>\
			</div>\
			<div data-id="picker-h" class="ui-picker">\
				<div class="ui-picker-inner">\
					<div class="ui-pciker-rule ui-pciker-rule-ft"></div>\
					<ul class="ui-pciker-list">\
					</ul>\
					<div class="ui-pciker-rule ui-pciker-rule-bg"></div>\
				</div>\
			</div>\
			<div data-id="picker-i" class="ui-picker">\
				<div class="ui-picker-inner">\
					<div class="ui-pciker-rule ui-pciker-rule-ft"></div>\
					<ul class="ui-pciker-list">\
					</ul>\
					<div class="ui-pciker-rule ui-pciker-rule-bg"></div>\
				</div>\
			</div>\
		</div>\
	</div>';


	var DtPicker = $.DtPicker = function(options) {
		var self = this;
		self.options = $.extend(options) || {};
		self.init();
	};

	DtPicker.prototype.init = function() {
		var self = this;
		var _picker = $.dom(domBuffer)[0];
		document.body.appendChild(_picker);
		$('[data-id*="picker"]', _picker).picker();
		var ui = self.ui = {
			picker: _picker,
			mask: $.createMask(),
			ok: $('[data-id="btn-ok"]', _picker)[0],
			cancel: $('[data-id="btn-cancel"]', _picker)[0],
			y: $('[data-id="picker-y"]', _picker)[0],
			m: $('[data-id="picker-m"]', _picker)[0],
			d: $('[data-id="picker-d"]', _picker)[0],
			h: $('[data-id="picker-h"]', _picker)[0],
			i: $('[data-id="picker-i"]', _picker)[0],
			labels: $('[data-id*="title-"]', _picker),
		};
		ui.cancel.addEventListener('tap', function() {
			self.hide();
		}, false);
		ui.ok.addEventListener('tap', function() {
			var rs = self.callback(self.getSelected());
			if (rs !== false) {
				self.hide();
			}
		}, false);
		ui.y.addEventListener('change', function(e) { //目前的change事件容易导致级联触发
			if (self.options.beginMonth || self.options.endMonth) {
				self._createMonth();
			} else {
				self._createDay();
			}
		}, false);
		ui.m.addEventListener('change', function(e) {
			self._createDay();
		}, false);
		ui.d.addEventListener('change', function(e) {
			if (self.options.beginMonth || self.options.endMonth) { //仅提供了beginDate时，触发day,hours,minutes的change
				self._createHours();
			}
		}, false);
		ui.h.addEventListener('change', function(e) {
			if (self.options.beginMonth || self.options.endMonth) {
				self._createMinutes();
			}
		}, false);
		ui.mask[0].addEventListener('tap', function() {
			self.hide();
		}, false);
		self._create(self.options);
		//防止滚动穿透
		self.ui.picker.addEventListener($.EVENT_START, function(event) {
			event.preventDefault();
		}, false);
		self.ui.picker.addEventListener($.EVENT_MOVE, function(event) {
			event.preventDefault();
		}, false);
	}

	DtPicker.prototype.getSelected = function() {
		var self = this;
		var ui = self.ui;
		var type = self.options.type;
		var selected = {
			type: type,
			y: ui.y.picker.getSelectedItem(),
			m: ui.m.picker.getSelectedItem(),
			d: ui.d.picker.getSelectedItem(),
			h: ui.h.picker.getSelectedItem(),
			i: ui.i.picker.getSelectedItem(),
			toString: function() {
				return this.value;
			}
		};
		switch (type) {
			case 'datetime':
				selected.value = selected.y.value + '-' + selected.m.value + '-' + selected.d.value + ' ' + selected.h.value + ':' + selected.i.value;
				selected.text = selected.y.text + '-' + selected.m.text + '-' + selected.d.text + ' ' + selected.h.text + ':' + selected.i.text;
				break;
			case 'date':
				selected.value = selected.y.value + '-' + selected.m.value + '-' + selected.d.value;
				selected.text = selected.y.text + '-' + selected.m.text + '-' + selected.d.text;
				break;
			case 'time':
				selected.value = selected.h.value + ':' + selected.i.value;
				selected.text = selected.h.text + ':' + selected.i.text;
				break;
			case 'month':
				selected.value = selected.y.value + '-' + selected.m.value;
				selected.text = selected.y.text + '-' + selected.m.text;
				break;
			case 'hour':
				selected.value = selected.y.value + '-' + selected.m.value + '-' + selected.d.value + ' ' + selected.h.value;
				selected.text = selected.y.text + '-' + selected.m.text + '-' + selected.d.text + ' ' + selected.h.text;
				break;
		}
		return selected;
	}
	DtPicker.prototype.setSelectedValue = function(value) {
		var self = this;
		var ui = self.ui;
		var parsedValue = self._parseValue(value);
		//TODO 嵌套过多，因为picker的change时间是异步(考虑到性能)的，所以为了保证change之后再setSelected，目前使用回调处理
		ui.y.picker.setSelectedValue(parsedValue.y, 0, function() {
			ui.m.picker.setSelectedValue(parsedValue.m, 0, function() {
				ui.d.picker.setSelectedValue(parsedValue.d, 0, function() {
					ui.h.picker.setSelectedValue(parsedValue.h, 0, function() {
						ui.i.picker.setSelectedValue(parsedValue.i, 0);
					});
				});
			});
		});
	}
	DtPicker.prototype.isLeapYear = function(year) {
		return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
	}
	DtPicker.prototype._inArray = function(array, item) {
		for (var index in array) {
			var _item = array[index];
			if (_item === item) return true;
		}
		return false;
	}
	DtPicker.prototype.getDayNum = function(year, month) {
		var self = this;
		if (self._inArray([1, 3, 5, 7, 8, 10, 12], month)) {
			return 31;
		} else if (self._inArray([4, 6, 9, 11], month)) {
			return 30;
		} else if (self.isLeapYear(year)) {
			return 29;
		} else {
			return 28;
		}
	}
	DtPicker.prototype._fill = function(num) {
		num = num.toString();
		if (num.length < 2) {
			num = 0 + num;
		}
		return num;
	}
	DtPicker.prototype._isBeginYear = function() {
		return this.options.beginYear === parseInt(this.ui.y.picker.getSelectedValue());
	}
	DtPicker.prototype._isBeginMonth = function() {
		return this.options.beginMonth && this._isBeginYear() && this.options.beginMonth === parseInt(this.ui.m.picker.getSelectedValue());
	}
	DtPicker.prototype._isBeginDay = function() {
		return this._isBeginMonth() && this.options.beginDay === parseInt(this.ui.d.picker.getSelectedValue());
	}
	DtPicker.prototype._isBeginHours = function() {
		return this._isBeginDay() && this.options.beginHours === parseInt(this.ui.h.picker.getSelectedValue());
	}
	DtPicker.prototype._isEndYear = function() {
		return this.options.endYear === parseInt(this.ui.y.picker.getSelectedValue());
	}
	DtPicker.prototype._isEndMonth = function() {
		return this.options.endMonth && this._isEndYear() && this.options.endMonth === parseInt(this.ui.m.picker.getSelectedValue());
	}
	DtPicker.prototype._isEndDay = function() {
		return this._isEndMonth() && this.options.endDay === parseInt(this.ui.d.picker.getSelectedValue());
	}
	DtPicker.prototype._isEndHours = function() {
		return this._isEndDay() && this.options.endHours === parseInt(this.ui.h.picker.getSelectedValue());
	}
	DtPicker.prototype._setLabels = function() {
		var self = this;
		var options = self.options;
		var ui = self.ui;
		ui.labels.each(function(i, label) {
			label.innerText = options.labels[i];
		});
	}
	DtPicker.prototype._setButtons = function() {
		var self = this;
		var options = self.options;
		var ui = self.ui;
		ui.cancel.innerText = options.buttons[0];
		ui.ok.innerText = options.buttons[1];
	}
	DtPicker.prototype._createYear = function(current) {
		var self = this;
		var options = self.options;
		var ui = self.ui;
		//生成年列表
		var yArray = [];
		if (options.customData.y) {
			yArray = options.customData.y;
		} else {
			var yBegin = options.beginYear;
			var yEnd = options.endYear;
			for (var y = yBegin; y <= yEnd; y++) {
				yArray.push({
					text: y + '',
					value: y
				});
			}
		}
		ui.y.picker.setItems(yArray);
		//ui.y.picker.setSelectedValue(current);
	}
	DtPicker.prototype._createMonth = function(current) {
		var self = this;
		var options = self.options;
		var ui = self.ui;

		//生成月列表
		var mArray = [];
		if (options.customData.m) {
			mArray = options.customData.m;
		} else {
			var m = options.beginMonth && self._isBeginYear() ? options.beginMonth : 1;
			var maxMonth = options.endMonth && self._isEndYear() ? options.endMonth : 12;
			for (; m <= maxMonth; m++) {
				var val = self._fill(m);
				mArray.push({
					text: val,
					value: val
				});
			}
		}
		ui.m.picker.setItems(mArray);
		//ui.m.picker.setSelectedValue(current);
	}
	DtPicker.prototype._createDay = function(current) {
		var self = this;
		var options = self.options;
		var ui = self.ui;

		//生成日列表
		var dArray = [];
		if (options.customData.d) {
			dArray = options.customData.d;
		} else {
			var d = self._isBeginMonth() ? options.beginDay : 1;
			var maxDay = self._isEndMonth() ? options.endDay : self.getDayNum(parseInt(this.ui.y.picker.getSelectedValue()), parseInt(this.ui.m.picker.getSelectedValue()));
			for (; d <= maxDay; d++) {
				var val = self._fill(d);
				dArray.push({
					text: val,
					value: val
				});
			}
		}
		ui.d.picker.setItems(dArray);
		current = current || ui.d.picker.getSelectedValue();
		//ui.d.picker.setSelectedValue(current);
	}
	DtPicker.prototype._createHours = function(current) {
		var self = this;
		var options = self.options;
		var ui = self.ui;
		//生成时列表
		var hArray = [];
		if (options.customData.h) {
			hArray = options.customData.h;
		} else {
			var h = self._isBeginDay() ? options.beginHours : 0;
			var maxHours = self._isEndDay() ? options.endHours : 23;
			for (; h <= maxHours; h++) {
				var val = self._fill(h);
				hArray.push({
					text: val,
					value: val
				});
			}
		}
		ui.h.picker.setItems(hArray);
		//ui.h.picker.setSelectedValue(current);
	}
	DtPicker.prototype._createMinutes = function(current) {
		var self = this;
		var options = self.options;
		var ui = self.ui;

		//生成分列表
		var iArray = [];
		if (options.customData.i) {
			iArray = options.customData.i;
		} else {
			var i = self._isBeginHours() ? options.beginMinutes : 0;
			var maxMinutes = self._isEndHours() ? options.endMinutes : 59;
			for (; i <= maxMinutes; i++) {
				var val = self._fill(i);
				iArray.push({
					text: val,
					value: val
				});
			}
		}
		ui.i.picker.setItems(iArray);
		//ui.i.picker.setSelectedValue(current);
	}
	DtPicker.prototype._parseValue = function(value) {
		var self = this;
		var rs = {};
		if (value) {
			var parts = value.replace(":", "-").replace(" ", "-").split("-");
			rs.y = parts[0];
			rs.m = parts[1];
			rs.d = parts[2];
			rs.h = parts[3];
			rs.i = parts[4];
		} else {
			var now = new Date();
			rs.y = now.getFullYear();
			rs.m = now.getMonth() + 1;
			rs.d = now.getDate();
			rs.h = now.getHours();
			rs.i = now.getMinutes();
		}
		return rs;
	}
	DtPicker.prototype._create = function(options) {
		var self = this;
		options = options || {};
		options.labels = options.labels || ['年', '月', '日', '时', '分'];
		options.buttons = options.buttons || ['取消', '确定'];
		options.type = options.type || 'datetime';
		options.customData = options.customData || {};
		self.options = options;
		var now = new Date();
		var beginDate = options.beginDate;
		if (beginDate instanceof Date && !isNaN(beginDate.valueOf())) { //设定了开始日期
			options.beginYear = beginDate.getFullYear();
			options.beginMonth = beginDate.getMonth() + 1;
			options.beginDay = beginDate.getDate();
			options.beginHours = beginDate.getHours();
			options.beginMinutes = beginDate.getMinutes();
		}
		var endDate = options.endDate;
		if (endDate instanceof Date && !isNaN(endDate.valueOf())) { //设定了结束日期
			options.endYear = endDate.getFullYear();
			options.endMonth = endDate.getMonth() + 1;
			options.endDay = endDate.getDate();
			options.endHours = endDate.getHours();
			options.endMinutes = endDate.getMinutes();
		}
		options.beginYear = options.beginYear || (now.getFullYear() - 5);
		options.endYear = options.endYear || (now.getFullYear() + 5);
		var ui = self.ui;
		//设定label
		self._setLabels();
		self._setButtons();
		//设定类型
		ui.picker.setAttribute('data-type', options.type);
		//生成
		self._createYear();
		self._createMonth();
		self._createDay();
		self._createHours();
		self._createMinutes();
		//设定默认值
		self.setSelectedValue(options.value);
	}
	DtPicker.prototype.show = function(callback) {
		var self = this;
		var ui = self.ui;
		self.callback = callback || $.noop;
		ui.mask.show();
		document.body.classList.add('ui-dtpicker-active-for-page');
		ui.picker.classList.add('ui-active');
		//处理物理返回键
		self.__back = $.back;
		$.back = function() {
			self.hide();
		};
	}
	DtPicker.prototype.hide = function() {
		var self = this;
		if (self.disposed) return;
		var ui = self.ui;
		ui.picker.classList.remove('ui-active');
		ui.mask.close();
		document.body.classList.remove('ui-dtpicker-active-for-page');
		//处理物理返回键
		$.back = self.__back;
	}
	DtPicker.prototype.dispose = function() {
		var self = this;
		self.hide();
		setTimeout(function() {
			self.ui.picker.parentNode.removeChild(self.ui.picker);
			for (var name in self) {
				self[name] = null;
				delete self[name];
			};
			self.disposed = true;
		}, 300);
	}
})(Zepto, document);
