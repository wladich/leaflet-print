"use strict";
(function(window) {

    function arrayItemsEqual(l1, l2) {
        l1 = l1 || [];
        l2 = l2 || [];
        if (l1.length != l2.length)
            return false;
        for (var i=0; i < l1.length; i++) 
            if (l1[i] != l2[i]) 
                return false;
        return true
    };
    
    window.hashState = {
        _listeners: [],
        _prevState: {},
        _updating: false,
        
        on: function(key, callback, fields) {
            this._listeners.push([key, callback]);
        },
        
        off: function(key, callback) {
            for (var i=0; i < this._listeners.length; i++){
                var listener = this._listeners[i];
                if (listener[0] == key && listener[1] == callback){
                    this._listeners.splice(i, 1);
                    return true;
                }
            }
        },

        _parseHash: function(fields){
            var hash = location.hash;
            var args = {};

            var i = hash.indexOf('#');
            if (hash.indexOf('#') < 0) {
                return args;
            }
            hash = hash.substr(i+1).trim();
            if ('' == hash) return {};

            var pairs = hash.split('&');
            for (var i = 0; i < pairs.length; i++) {
                var parts = pairs[i].split('=');
                args[parts[0]] = (null == parts[1]) ? [] : decodeURIComponent(parts[1]).split('/');
            }
            return args;
        },
        
        
        updateState: function(key, values){
            this._prevState[key] = values;
            var hash = [];
            for (var key in this._prevState) {
                var values = this._prevState[key];
                values = values.join('/');
                hash.push(key + '=' + values);
            }
            hash = '#' + hash.join('&');
            location.replace(hash);
        },
        
        getState: function(key){
            return this._prevState[key];
        },
        
        onHashChanged: function() {
            var state = this._parseHash();
            var changed_keys = {};
            for (var key in state) 
                if (!arrayItemsEqual(state[key], this._prevState[key]))
                    changed_keys[key] = 1;
            for (var key in this._prevState)
                if (!(key in state))
                    changed_keys[key] = 1;
            for (var i=0; i < this._listeners.length; i++) {
                var key = this._listeners[i][0],
                    callback = this._listeners[i][1];
                if (key in changed_keys) {
                    setTimeout(callback.bind(null, state[key]), 0);
                }
            }
            this._prevState = state;
        }
    };

    window.addEventListener('hashchange', window.hashState.onHashChanged.bind(window.hashState));
    window.hashState.onHashChanged();

})(window);
