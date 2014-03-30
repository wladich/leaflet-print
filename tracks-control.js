/* global L */
"use strict";

L.Control.TrackList = L.Control.extend({
    options: {position: 'topright'},
    
    parsers: {
        'gpx': L.Util.parseGpx,
        'plt': L.Util.parseOziPlt
    },

    colors: ['#77f', '#f95', '#0ff', '#f77', '#f7f', '#ee5'],

    onAdd: function(map){
        this._map = map;
        this._tracks = [];
        var container = L.DomUtil.create('div', 'leaflet-control leaflet-control-tracklist');
        container.innerHTML = '\
            <div class="leaflet-control-tracklist-row">\
                        <a class="leaflet-control-button leaflet-control-tracklist-openfile" title="Open file"></a>\
                        <input type="text" class="leaflet-control-tracklist-url" placeholder="Track URL">\
                        <a class="leaflet-control-button leaflet-control-tracklist-downloadfile right" title="Download URL"></a>\
                        <div class="leaflet-control-progress-unknown right hidden"></div>\
            </div>\
         ';

        L.DomEvent.disableClickPropagation(container);
        var openButton = container.querySelector('.leaflet-control-tracklist-openfile');
        this.fileInput = L.DomUtil.create('input', undefined, document.body);
        this.fileInput.type = 'file';
        this.fileInput.style.left = '-100000px';
        L.DomEvent.on(openButton, 'click', this.fileInput.click, this.fileInput);
        L.DomEvent.on(this.fileInput, 'change', this.onFileSelected, this);

        this.download_button = container.querySelector('.leaflet-control-tracklist-downloadfile');
        this.url_field = container.querySelector('.leaflet-control-tracklist-url');
        L.DomEvent.on(this.download_button, 'click', this.onDownloadButtonPressed, this);
        this.progress_unknown_icon = container.querySelector('.leaflet-control-progress-unknown');
        this.elements_grid = container;
        return container;
    },
    
    getTracks: function() {
        return this._tracks;
    },

    onFileSelected: function() {
        this.addTrackFromFile(this.fileInput.files[0]);
        this.fileInput.value = '';
        },
    
    onDownloadButtonPressed: function() {
        var url = this.url_field.value.trim();
        var hideSpinner = function() {
            L.DomUtil.removeClass(this.download_button, 'hidden');
            L.DomUtil.addClass(this.progress_unknown_icon, 'hidden');
        }.bind(this);
        var showSpinner = function() {
            L.DomUtil.addClass(this.download_button, 'hidden');
            L.DomUtil.removeClass(this.progress_unknown_icon, 'hidden');
        }.bind(this);
        if (url) {
            showSpinner();
            this.addTrackFromUrl(url).done(
                hideSpinner,
                function(err) {
                    alert(L.Util.template('Failed to download track from url "{url}"', {url: url}));
                    hideSpinner();
                });
        }
        this.url_field.value = '';
    },

    addTrackFromFileData: function(name, url, text) {
        var geo_data = L.Util.parseTrackFile(text, name);
        var color = this.getNextColor();
        if (geo_data.tracks) {
            var track = new L.Control.TrackList.Track(geo_data.tracks, this._map, color);
            var list_item = new L.Control.TrackList.ListItem(this.elements_grid, name, url, color);
            this._tracks.push(track);
            list_item.on('visibilitychanged', function(e){track.setVisibility(e.visible);});
            list_item.on('remove', function(){this.removeTrack(track, list_item);}, this);
            list_item.on('focus', track.focusMap, track);
        }
    },

    getNextColor: function() {
        this._color_index = ((this._color_index | 0) + 1) % this.colors.length;
        return this.colors[this._color_index];
    },
    
    removeTrack: function(track, list_item) {
        track.remove();
        this.elements_grid.removeChild(list_item.getElement());
        var i = this._tracks.indexOf(track);
        this._tracks.splice(i, 1);
    },

    addTrackFromUrl: function(url) {
        // TODO: first try direct request, fallback to proxy if CORS not available
        // FIXME: error if https and using proxy and with other schemas
        url = url.replace(/^http:\/\//, 'http://www.corsproxy.com/');
        var name = url.split('/').pop();
        var _this = this;
        get(url).done(function(xhr){
            var data = xhr.responseText;
            _this.addTrackFromFileData(name, url, data);
        });
    },

    // file -- js file object as retrievd from file input`s property "files"'
    addTrackFromFile: function(file) {
        var _this = this;
        readFile(file).done(
                function(resp){
                    _this.addTrackFromFileData(resp.name, null, resp.data);
                }.bind(this));
    }
});


L.Control.TrackList.ListItem = L.Class.extend({
    includes: L.Mixin.Events,

    initialize: function(parent, name, url, color) {
        var el = this.element = L.DomUtil.create('div', 'leaflet-control-tracklist-row', parent);
        el.innerHTML = '\
            <div class="leaflet-control-tracklist-item-row">\
                <input type="checkbox" checked="checked" class="leaflet-control-tracklist-visibility">\
                <div class="leaflet-control-tracklist-color" style="background-color: #f00"></div>\
                <span class="leaflet-control-tracklist-trackname" title="' + (url || name) + '">' + name + '</span>\
                <a class="leaflet-control-tracklist-delete" title="Remove track">X</a>\
            </div>\
            ';

        this.visibility_checkbox = el.querySelector('input');
        this.color_legend =  el.querySelector('.leaflet-control-tracklist-color');
        var delete_button = el.querySelector('a.leaflet-control-tracklist-delete');
        var track_name = el.querySelector('.leaflet-control-tracklist-trackname');
        this.setColor(color);

        L.DomEvent.on(this.visibility_checkbox, 'click', this.onVisibilityCheckboxClicked, this);
        L.DomEvent.on(delete_button, 'click', this.onRemoveButtonClicked, this);
        L.DomEvent.on(track_name, 'click', this.onNameClicked, this);
        return el;
    },

    onVisibilityCheckboxClicked: function() {
        this.visible = this.visibility_checkbox.checked;
        this.fire('visibilitychanged', {visible: this.visible});
    },

    onRemoveButtonClicked: function() {
        this.fire('remove');
    },

    onNameClicked: function() {
        this.fire('focus');
    },

    setColor: function(color) {
        this.color_legend.style.backgroundColor = color;
    },

    setVisibility: function(visible) {
        visible = !!visible;
        var was_visible = !!this.visible;
        if (was_visible !== visible) {
            this.visibility_checkbox.checked = visible;
        }
        this.visible = visible;
    },

    getElement: function() {
        return this.element;
    }
});

L.Control.TrackList.Track = L.Class.extend({
    includes: L.Mixin.Events,

    initialize: function(segments, map, color) {
        this.segments = segments.map(this._simplifySegment);
        this._map = map;
        this.polylines = this.segments.map(
            function(l) {
                return L.polyline(l, {color: color});
            });
        this.feature = L.featureGroup(this.polylines);
        this.setVisibility(true);
        this.color = color;
    },

    _simplifySegment: function(segment) {
        var segment_filtered;

        function latlngToXy(p) {
            return  {x: p.lng, y: p.lat};
        }
        function xyToLatlng(p) {
            return  {lat: p.y, lng: p.x};
        }
        segment = segment.map(latlngToXy);
        segment = L.LineUtil.simplify(segment, 0.0002).
        segment = segment.map(xyToLatlng);
        return segment;
    },

    setVisibility: function (visible) {
        var was_visible = !!this.visible;
        visible = !!visible;
        if (was_visible !== visible) {
            if (visible) {
                this._map.addLayer(this.feature);
            } else {
                this._map.removeLayer(this.feature);
            }
        }
        this.visible = visible;
    },

    remove: function() {
        this._map.removeLayer(this.feature);
    },

    setColor: function(color) {
        if (color !== this.color) {
            this.color = color;
            this.polylines.forEach(
                function(polyline) {
                    polyline.setStyle({color: color});
                });
        }
    },

    focusMap: function() {
        this._map.fitBounds(this.feature.getBounds());
    }
});
