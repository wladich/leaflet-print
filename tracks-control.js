/* global L, Promise, readFile, get */
"use strict";

L.Control.TrackList = L.Control.extend({
    options: {position: 'bottomright'},
    
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
            <div class="leaflet-control-tracklist-row leaflet-control-tracklist-hint">\
                GPX Ozi GoogleEarth ZIP YandexMaps\
            </div>\
            <div class="leaflet-control-tracklist-row">\
                        <a class="leaflet-control-button leaflet-control-tracklist-openfile" title="Open file"></a>\
                        <input type="text" class="leaflet-control-tracklist-url" placeholder="Track URL">\
                        <a class="leaflet-control-button leaflet-control-tracklist-downloadfile right" title="Download URL"></a>\
                        <div class="leaflet-control-progress-unknown right hidden"></div>\
            </div>\
         ';

        L.DomEvent.disableClickPropagation(container);
        var openButton = container.querySelector('.leaflet-control-tracklist-openfile');
        this.fileInput = L.DomUtil.create('input', '', document.body);
        this.fileInput.type = 'file';
        this.fileInput.multiple = 'true';
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
        var this_ = this;
        var files = Array.prototype.slice.apply(this.fileInput.files);
        var files_contents = files.map(readFile);
        Promise.all(files_contents).done(function(files_contents) {
            var geodata_array = [];
            for (var i=0; i < files.length; i++) {
                geodata_array.push.apply(geodata_array, L.Util.parseGeoFile(files[i].name, files_contents[i]));
            }
            this_.addTracksFromGeodataArray(geodata_array);
        });

    },
    
    onDownloadButtonPressed: function() {
        var url = this.url_field.value.trim();
        if (url) {
            var geodata = L.Util.parseGeoFile('', url, true);
            if (geodata) {
              this.addTracksFromGeodataArray(geodata);
            } else {
                var this_ = this;
                this.showDownloadSpinner();
                // TODO: first try direct request, fallback to proxy if CORS not available
                // FIXME: error if https and using proxy and with other schemas
                var url_for_request = url.replace(/^http:\/\//, 'http://www.corsproxy.com/');
                var name = url
                           .split('#')[0]
                           .split('?')[0]
                           .replace(/\/*$/, '')
                           .split('/')
                           .pop();
                get(url_for_request, 'arraybuffer').done(function(xhr) {
                    var geodata;
                    if (xhr.status === 200) {
                        var data = arrayBufferToString(xhr.response);
                        geodata = L.Util.parseGeoFile(name, data);

                    } else {
                        geodata = [{name: url, error: 'NETWORK'}];
                    }
                    this_.hideDownloadSpinner();
                    this_.addTracksFromGeodataArray(geodata);

                }, function() {
                    var geodata = [{name: url, error: 'NETWORK'}];
                    this_.hideDownloadSpinner();
                    this_.addTracksFromGeodataArray(geodata);
                });
            }
        }
        this.url_field.value = '';
    },

    hideDownloadSpinner: function() {
        L.DomUtil.removeClass(this.download_button, 'hidden');
        L.DomUtil.addClass(this.progress_unknown_icon, 'hidden');
    },

    showDownloadSpinner: function() {
        L.DomUtil.addClass(this.download_button, 'hidden');
        L.DomUtil.removeClass(this.progress_unknown_icon, 'hidden');
    },

    addTracksFromGeodataArray: function(geodata_array) {
        var messages = [];
        geodata_array.forEach(function(geodata) {
        //for (var i=0; i < geodata_array.length; i++) {
          //  var geodata = geodata_array[i];
            if (geodata.tracks && geodata.tracks.length) {
                var color = this.getNextColor();
                var track = new L.Control.TrackList.Track(geodata.tracks, this._map, color);
                var list_item = new L.Control.TrackList.ListItem(this.elements_grid, geodata.name, color);
                this._tracks.push(track);
                list_item.on('visibilitychanged', function(e) {track.setVisibility(e.visible)});
                list_item.on('remove', function() {this.removeTrack(track, list_item)}, this);
                list_item.on('focus', track.zoomMapToTrack, track);
                list_item.on('colorchanged', function(e) {track.setColor(e.color);}, track);
            }

            var data_empty = !geodata.tracks;
            var error_messages = {
                'CORRUPT': 'File "{name}" is corrupt',
                'UNSUPPORTED': 'File "{name}" has unsupported format or is badly corrupt',
                'NETWORK': 'Could not download file from url "{name}"'
            };
            var message;
            if (geodata.error) {
                message = error_messages[geodata.error] || geodata.error;
                if (data_empty) {
                    message += ', no data could be loaded';
                } else {
                    message += ', loaded data can be invalid or incomplete';
                }
            } else if (data_empty) {
                message = 'File "{name}" contains no data';
            }
            if (message) {
                message = format(message, {name: geodata.name});
                messages.push(message);
            }
        }.bind(this));
        if (messages.length) {
            alert(messages.join('\n'));
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
});


L.Control.TrackList.ListItem = L.Class.extend({
    includes: L.Mixin.Events,

    initialize: function(parent, name, color) {
        var el = this.element = L.DomUtil.create('div', 'leaflet-control-tracklist-row', parent);
        el.innerHTML = '\
            <div class="leaflet-control-tracklist-item-row">\
                <input type="checkbox" checked="checked" class="leaflet-control-tracklist-visibility">\
                <div class="leaflet-control-tracklist-color" style="background-color: #f00"></div>\
                <span class="leaflet-control-tracklist-trackname" title="' + name + '">' + name + '</span>\
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
        new L.Contextmenu(this.color_legend, this._getContextmenuItems(), true, false);
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
    },

    onSelectNewColor: function(color) {
        this.setColor(color);
        this.fire('colorchanged', {color: color});
    },

    _getContextmenuItems: function() {
        var colors = L.Control.TrackList.prototype.colors;
        return colors.map(function(color) {
            return {text: '<div style="display: inline-block; vertical-align: middle; width: 50px; height: 4px; background-color: ' + color + '"></div>', callback: this.onSelectNewColor.bind(this, color)};
        }.bind(this));
    }
});

L.Control.TrackList.Track = L.Class.extend({
    includes: L.Mixin.Events,

    initialize: function(segments, map, color) {
        this.segments = segments.map(this._simplifySegment);
        this._map = map;
//// uncomment for debugging or tuning lines simplification
/*
        segments.forEach(function(segment){
            L.polyline(segment, {color: 'red'}).addTo(this._map);
        }.bind(this));
*/
        this.polylines = this.segments.map(
            function(l) {
                return L.polyline(l, {color: color});
            });
        this.feature = L.featureGroup(this.polylines);
        this.setVisibility(true);
        this.color = color;
    },

    _simplifySegment: function(segment) {
        function latlngToXy(p) {
            return  {x: p.lng, y: p.lat};
        }
        function xyToLatlng(p) {
            return  {lat: p.y, lng: p.x};
        }
        segment = segment.map(latlngToXy);
        segment = L.LineUtil.simplify(segment, 0.0002);
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

    zoomMapToTrack: function() {
        this._map.fitBounds(this.feature.getBounds());
    },

});
