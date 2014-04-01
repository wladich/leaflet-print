L.Contextmenu = L.Class.extend({

	initialize: function (activate_element, items, show_on_left, show_on_right) {
		this._visible = false;
		this.activator = activate_element;
		this._items = items;
		this._show_on_left = show_on_left  === undefined ? false : true;
		this._show_on_right = show_on_right === undefined ? true : false;

		this._container = L.DomUtil.create('div', 'leaflet-contextmenu');
		this._container.style.zIndex = 10000;
		this._container.style.position = 'fixed';

		if (activate_element.on) {
			this.on_activator = activate_element.on.bind(activate_element);
			this.off_activator = activate_element.off.bind(activate_element);
		} else {
			this.on_activator = function(type, fn, ctx) {
				L.DomEvent.on(activate_element, type, fn, ctx);
			};
			this.off_activator = function(type, fn) {
				L.DomEvent.off(activate_element, type, fn);
			};
		}
		
		if (this._show_on_right) {
			this.on_activator('contextmenu', this._onActivatorClick, this);
		}
		if (this._show_on_left) {
			this.on_activator('click', this._onActivatorClick, this);
		}
	},

	show: function(position, el){
		if (this.visible) {
			return;
		}
		this._createItems();
		document.body.appendChild(this._container);
		
		L.DomEvent.on(document, 'keydown', this._onKeyDown, this);
		document.body.addEventListener('mousedown', this, true);
		this._setPosition(position);
		this.visible = true;
	},

	hide: function() {
		if (!this.visible) {
			return;
		}
		document.body.removeChild(this._container);
		var rows = this._container.children;
		while (rows.length) {
			this._container.removeChild(rows[0]);
		}
		L.DomEvent.off(document, 'keydown', this._onKeyDown);
		document.body.removeEventListener('mousedown', this, true);
		this.visible = false;
	},

	_createItems: function () {
		var items = this._items,
			itemOptions;
		if (typeof items === 'function') {
			items = items();
		}
		for (var i = 0; i < items.length; i++) {
			itemOptions = items[i];
			if (itemOptions === '-' || itemOptions.separator) {
				this._createSeparator(itemOptions);
			} else {
				this._createItem(itemOptions);
			}
		}
	},

	_createItem: function (itemOptions) {
		var el = L.DomUtil.create('a', 'leaflet-contextmenu-item', this._container);
		el.innerHTML = itemOptions.text;
		if (itemOptions.callback) {
			L.DomEvent.on(el, 'click', function() {
				itemOptions.callback();
				this.hide();
			}.bind(this));
		}
	},


	_createSeparator: function (itemOptions) {
		var el = L.DomUtil.create('div', 'leaflet-contextmenu-separator', this._container);
		if (itemOptions.text)
			el.innerHTML = '<span>' + itemOptions.text + '</span>';
	},


	_setPosition: function (mouse_position) {
		var window_width = window.innerWidth;
		var window_height = window.innerHeight;
		var menu_width = this._container.offsetWidth;
		var menu_height  = this._container.offsetHeight;
		var x = (mouse_position.x + menu_width < window_width) ? mouse_position.x : mouse_position.x - menu_width;
		var y = (mouse_position.y + menu_height < window_height) ? mouse_position.y : mouse_position.y - menu_height;

		this._container.style.left = x + 'px';
		this._container.style.top = y + 'px';
	},

	_getSize: function () {
		return {
			x: this._container.offsetWidth,
			y: this._container.offsetWidth
		};
	},

	handleEvent: function(e) {
		var el = e.target;
		while (el.parentNode) {
			if (el.parentNode === this._container) {
				return
			}
			el = el.parentNode;
		}
		this.hide();
	},

	_onActivatorClick: function(e) {
		if (e.originalEvent) {
			e = e.originalEvent;
		}
		this.show({x: e.clientX, y: e.clientY}, e.target);
		L.DomEvent.preventDefault(e);
	},

	_onKeyDown: function (e) {
		var key = e.keyCode;

		// If ESC pressed and context menu is visible hide it 
		if (key === 27) {
			this.hide();
		}
	}
});

L.Mixin.Contextmenu = {
	bindContextmenu: function(items, show_on_left, show_on_right) {
		this._contextMenu = new L.Contextmenu(this, items, show_on_left, show_on_right);
		this.on('remove', this.hideContextmenu, this);
	},

	hideContextmenu: function() {
		this._contextMenu.hide();
	}
};


L.Marker.include(L.Mixin.Contextmenu);