"use strict";
L.Control.PrintPages = L.Control.extend({
    includes: [L.Mixin.Events, L.Mixin.HashState],
    options: {position: 'bottomleft'},
    
    hashStateChangeEvents: ['change'],
    
    onAdd: function(map) {
        this._map = map;
        this.sheets = [];
        var dialogContainer = L.DomUtil.create('div', 'leaflet-control leaflet-control-printpages');
        dialogContainer.innerHTML = '\
            <table class="form">\
                <tr><td colspan="2">\
                    <div class="positioned">\
                        <a title="Add page in portrait orientation" class="leaflet-control-button leaflet-control-printpages-addportrait"></a>\
                        <a title="Add page in landscape orientation" class="leaflet-control-button leaflet-control-printpages-addlandscape"></a>\
                        <a title="Remove all pages" class="leaflet-control-button leaflet-control-printpages-removeall">X</a>\
                    </div>\
                </td></tr>\
                <tr>\
                    <td>Map scale</td>\
                    <td>\
                        <p class="leaflet-control-values-list">\
                            <a class="leaflet-control-setvalue-link" mapscale=100000>1:100 000</a>\
                            <a class="leaflet-control-setvalue-link" mapscale=50000>1:50 000</a>\
                        </p>\
                        1:<input type="text" size="6" pattern="\\d+" maxlength="6" name="mapscale" value="50000">\
                    </td>\
                </tr>\
                <tr>\
                    <td>Page size</td>\
                    <td>\
                        <p class="leaflet-control-values-list">\
                            <a class="leaflet-control-setvalue-link" pagewidth="297" pageheight="420">A3</a>\
                            <a class="leaflet-control-setvalue-link" pagewidth="210" pageheight="297">A4</a>\
                            <a class="leaflet-control-setvalue-link" pagewidth="148" pageheight="210">A5</a>\
                        </p>\
                        <input type="text" size="3" pattern="\\d+" maxlength="3" placeholder="width" name="pagewidth" value="210">\
                        x <input type="text" size="3" pattern="\\d+" maxlength="3" placeholder="height" name="pageheight" value="297"> mm\
                    </td>\
                </tr>\
                <tr>\
                    <td>Margin</td>\
                    <td>\
                        <table>\
                            <tr><td></td><td><input name="margin-top" "type="text" size="1" pattern="\\d+" maxlength="2" placeholder="top" value="3"></td><td></td></tr>\
                            <tr>\
                                <td><input name="margin-left" type="text" size="1" pattern="\\d+" maxlength="2" placeholder="left" value="3"></td>\
                                <td></td><td><input name="margin-right" type="text" size="1" pattern="\\d+" maxlength="2" placeholder="right" value="3"> mm</td>\
                            </tr>\
                            <tr><td></td><td><input name="margin-bottom" type="text" size="1" pattern="\\d+" maxlength="2" placeholder="bottom" value="3"></td><td></td></tr>\
                        </table>\
                    </td>\
                </tr>\
                <tr>\
                    <td>Resolution</td>\
                    <td><input type="text" size="4" pattern="\\d+" maxlength="4" value=300 name="resolution"> dpi</td>\
                </tr>\
                <tr>\
                    <td>Source zoom<br />level</td>\
                    <td>\
                        <select name="srczoom">\
                            <option value="auto">auto</option>\
                            <option value="7">7</option>\
                            <option value="8">8</option>\
                            <option value="9">9</option>\
                            <option value="10">10</option>\
                            <option value="11">11</option>\
                            <option value="12">12</option>\
                            <option value="13">13</option>\
                            <option value="14">14</option>\
                            <option value="15">15</option>\
                            <option value="16">16</option>\
                            <option value="17">17</option>\
                            <option value="18">18</option>\
                        </select>\
                    </td>\
                </tr>\
                <tr>\
                    <td colspan="2">\
                        <div class="positioned leaflet-control-printpages-downloadpdf-row">\
                            <a class="leaflet-control-text-button" name="download-pdf">Download PDF</a>\
                            <div class="leaflet-control-progress-unknown hidden"></div>\
                            <div class="leaflet-control-progress hidden">\
                                <div class="leaflet-control-progress-bkg">\
                                    <div class="leaflet-control-progress-bar"></div>\
                                </div>\
                            </div>\
                        </div>\
                    </td>\
                </tr>\
            </table>\
        ';
        var this_control = this;
        this.page_width_field = dialogContainer.querySelector('input[name="pagewidth"]');
        this.page_height_field = dialogContainer.querySelector('input[name="pageheight"]');
        this.map_scale_field = dialogContainer.querySelector('input[name="mapscale"]');
        this.resolution_field = dialogContainer.querySelector('input[name="resolution"]');
        this.src_zoom_field = dialogContainer.querySelector('select[name="srczoom"]');
        this.download_button = dialogContainer.querySelector('a[name="download-pdf"]');
        this.progress_unknown_icon = dialogContainer.querySelector('.leaflet-control-progress-unknown');
        this.progress_container = dialogContainer.querySelector('.leaflet-control-progress');
        this.progress_bar = dialogContainer.querySelector('.leaflet-control-progress-bar');
        this.margin_fields = [
            dialogContainer.querySelector('input[name="margin-top"]'),
            dialogContainer.querySelector('input[name="margin-right"]'),
            dialogContainer.querySelector('input[name="margin-bottom"]'),
            dialogContainer.querySelector('input[name="margin-left"]')
            ];
        var page_format_links = dialogContainer.querySelectorAll('p.print-page-sizes a');
        var map_scale_links = dialogContainer.querySelectorAll('p.print-page-scales a');

        for (var i=0; i<page_format_links.length; i++) {
            page_format_links[i].onclick = function() {
                this_control.page_width_field.value = this.getAttribute('pagewidth');
                this_control.page_height_field.value = this.getAttribute('pageheight');
                this_control._changePaperSize();
            };
        };
        for (var i=0; i<map_scale_links.length; i++) {
            map_scale_links[i].onclick = function(){
                this_control.map_scale_field.value = this.getAttribute('mapscale');
                this_control._changeMapScale();
            };
        };
        dialogContainer.querySelector('.leaflet-control-printpages-addportrait').onclick = this._addSheetPortrait.bind(this);
        dialogContainer.querySelector('.leaflet-control-printpages-addlandscape').onclick = this._addSheetLandscape.bind(this);
        dialogContainer.querySelector('.leaflet-control-printpages-removeall').onclick = this._removeAllPages.bind(this);        
        this.download_button.onclick = this._downloadPDF.bind(this);
        this.page_width_field.onchange = this._changePaperSize.bind(this);
        this.page_height_field.onchange = this._changePaperSize.bind(this);
        this.map_scale_field.onchange = this._changeMapScale.bind(this);
        this.margin_fields[0].onchange = this._changePaperSize.bind(this);
        this.margin_fields[1].onchange = this._changePaperSize.bind(this);
        this.margin_fields[2].onchange = this._changePaperSize.bind(this);
        this.margin_fields[3].onchange = this._changePaperSize.bind(this);
        this.resolution_field.onchange = function(){this.fire('change')}.bind(this);
        this.src_zoom_field.onchange = function(){this.fire('change')}.bind(this);

        L.DomEvent.disableClickPropagation(dialogContainer);
        
        this.tracks = new L.Control.TrackList();
        this.tracks.addTo(map);
        return dialogContainer;
    },
    
    getPaperSize: function() {
        var margins = this.getMargins();
        var width = (this.page_width_field.value|0)  - margins.left - margins.right;
        var height = (this.page_height_field.value|0) - margins.top - margins.bottom;
        if (width < 10)
            width = 10;
        if (height < 10)
            heigh = 10;
        return [width, height];
    },
    getMargins: function() {
        return {
            top: this.margin_fields[0].value|0,
            right: this.margin_fields[1].value|0,
            bottom: this.margin_fields[2].value|0,
            left: this.margin_fields[3].value|0,
            }
    },
    
    getResolution: function() {
        return (this.resolution_field.value|0) || 100;
    },

    getMapScale: function(){
        return (this.map_scale_field.value|0) || 50000;
    },
    
    getSourceZoom: function(){
        return this.src_zoom_field.value;
    },
    
    getPagesNum: function(){
        return this.sheets.length;    
    },
    
    changePageIndex: function(old_n, new_n) {
        var sheet = this.sheets.splice(old_n, 1)[0];
        this.sheets.splice(new_n, 0, sheet);
        this._updateLabels();
        this.fire('change');        
    },
    
    _addSheet: function(latlng, rotated) {
        var paper_size = this.getPaperSize();
        var sheet = new L.PaperSheet(latlng, 
                                     {label: this.sheets.length + 1, 
                                      map_scale_denominator: this.getMapScale(),
                                      paper_width: paper_size[0], paper_height: paper_size[1],
                                      rotated: rotated},
                                      this);
        sheet.addTo(this._map);
        this.sheets.push(sheet);
        sheet.on('remove', this._onSheetRemove, this);
        sheet.on('rotate', this._onSheetChanged, this);
        sheet.on('dragend', this._onSheetChanged, this);
        this.fire('change');
        return sheet;
    },
    
    _addSheetPortrait: function() {
        return this._addSheet(this._map.getCenter(), false);
    },

    _addSheetLandscape: function(latlng) {
        return this._addSheet(this._map.getCenter(), true);
    },
    
    _changePaperSize: function() {
        var size = this.getPaperSize();
        for (var i=0; i<this.sheets.length; i++){
            this.sheets[i].setPaperSize(size[0], size[1]);
        };
        this.fire('change');
    },

    _changeMapScale: function() {
        var scale = this.getMapScale();
        for (var i=0; i<this.sheets.length; i++){
            this.sheets[i].setMapScale(scale);
        };
        this.fire('change');
    },
    
    _removeAllPages: function() {
        while (this.sheets.length) 
            this.sheets[0].remove();
    },
    
    _onSheetChanged: function() {
        this.fire('change');
    },
    
    _onSheetRemove: function(e) {
        var sheet = e.target;
        this.sheets.splice(this.sheets.indexOf(e.target), 1);
        sheet.removeFrom();
        this._updateLabels();
        this.fire('change');
    },

    _updateLabels: function(){
        for (var i=0; i<this.sheets.length; i++) {
            this.sheets[i].setLabel(i+1);
        }
    },
    
    notifyProgress: function(progress_inc, total_inc){
        this._progress_total += total_inc || 0;
        this._progress_done += progress_inc || 0;
        if (this._progress_done) {
            L.DomUtil.addClass(this.progress_unknown_icon, 'hidden');
            L.DomUtil.removeClass(this.progress_container, 'hidden');
            this.progress_bar.style.setProperty('width', this._progress_done * 100 / this._progress_total + '%')
        }
    },

    startProgress: function(){
        this._progress_done = 0;
        this._progress_total = 0;
        L.DomUtil.addClass(this.download_button, 'hidden');
        L.DomUtil.removeClass(this.progress_unknown_icon, 'hidden');
    },
    
    stopProgress: function(){
        L.DomUtil.addClass(this.progress_container, 'hidden');
        L.DomUtil.addClass(this.progress_unknown_icon, 'hidden');
        L.DomUtil.removeClass(this.download_button, 'hidden');
    },
    
    getBestZooms: function() {
        var reference_lat;
        if (this.sheets.length > 0) {
            var reference_lat = 1e20;
            for (var i=0; i < this.sheets.length; i++) {
                var sheet = this.sheets[i];
                var sheet_lat = Math.abs(sheet.getCenter().lat);
                if (Math.abs(sheet_lat < reference_lat)) {
                    reference_lat = sheet_lat;
                }
            }
        } else {
            reference_lat = this._map.getCenter().lat;
        };
        var target_meters_per_pixel = this.getMapScale() / 100 / (this.getResolution() / 2.54) ;
        var map_units_per_pixel = target_meters_per_pixel / Math.cos(reference_lat * Math.PI / 180);
        var zoom_sat = Math.ceil(Math.log(40075016.4 / 256 / map_units_per_pixel)/Math.LN2);

        target_meters_per_pixel = this.getMapScale() / 100 / (90 / 2.54) ;
        map_units_per_pixel = target_meters_per_pixel / Math.cos(reference_lat * Math.PI / 180);
        var zoom_map = Math.round(Math.log(40075016.4 / 256 / map_units_per_pixel)/Math.LN2);
        return [zoom_sat, zoom_map];
    },
    
    _downloadPDF: function(){
        this.startProgress();
        var resolution = this.getResolution();
        var paper_size = this.getPaperSize();
        var paper_width_pixels = Math.round(paper_size[0] * resolution / 25.4);
        var paper_height_pixels = Math.round(paper_size[1] * resolution / 25.4);
        var this_ = this;
        var zoom = this.getSourceZoom();
        var zooms;
        if (zoom == 'auto') {
            zooms = this.getBestZooms();
        } else {
            zooms = [zoom, zoom];
        }

        function makeImageForSheet(sheet) {
            var image_width, image_height;
            if (sheet.isRotated()) {
                 image_width = paper_height_pixels;
                 image_height  = paper_width_pixels;
             } else {
                 image_width = paper_width_pixels;
                 image_height  = paper_height_pixels;
             }
            var strict_zoom = zoom != 'auto';
            return makeMapRectangleImage(
                this_._map,
                sheet.getLatLngBounds(),
                zooms, strict_zoom,
                image_width, image_height,
                this_.notifyProgress.bind(this_));
        }

        var images_data = this.sheets.map(function(sheet){
            return makeImageForSheet(sheet).then(
                function(image){
                    image = drawTracks(image, sheet.getLatLngBounds(), this_.tracks.getTracks(), this_._map, resolution);
                    return {width: image.width, height: image.height, data: canvasToData(image)};
                });
        });

        Promise.all(images_data).done(
            function(images){
                console.log('Data ready')
                var pdf_data = buildPDF(images, resolution);
                downloadFile('map.pdf', 'application/pdf', pdf_data);
                this_.stopProgress();
            });
        
    },
    
    _serializeState: function(){
        var state = [];
        state.push(this.page_width_field.value);
        state.push(this.page_height_field.value);
        state.push(this.margin_fields[0].value);
        state.push(this.margin_fields[1].value);        
        state.push(this.margin_fields[2].value);        
        state.push(this.margin_fields[3].value);        
        state.push(this.getResolution());
        state.push(this.getMapScale());
        var zoom = this.getSourceZoom();
        state.push(zoom == 'auto' ? -1 : zoom);
        for (var i=0; i < this.sheets.length; i++){
            var ll = this.sheets[i].getCenter();
            state.push(ll.lat.toFixed(5));
            state.push(ll.lng.toFixed(5));
            state.push(this.sheets[i].isRotated() ? 1 : 0);
        }
        return state;
    },
    
    _unserializeState: function(values) {
        if (!values )
            return false;
        var width = parseInt(values.shift()),
            height = parseInt(values.shift()),
            margin0 = parseInt(values.shift()),
            margin1 = parseInt(values.shift()),
            margin2 = parseInt(values.shift()),
            margin3 = parseInt(values.shift()),
            resolution = parseInt(values.shift()),
            scale = parseInt(values.shift()),
            zoom = parseInt(values.shift()),
            pages = [];
        while (values.length > 2) {
            var lat = parseFloat(values.shift()),
                lng = parseFloat(values.shift()),
                rotated = parseInt(values.shift());
            pages.push([lat, lng, rotated]);
        }
            
        if (isNaN(width) || isNaN(height) || 
            isNaN(margin0) || isNaN(margin1) || isNaN(margin2) || isNaN(margin3) ||
            isNaN(resolution), isNaN(scale), isNaN(zoom))
                return false;
        this._updating_state = true;
        this._removeAllPages();
        this.page_width_field.value = width;
        this.page_height_field.value = height;
        this.margin_fields[0].value = margin0;
        this.margin_fields[1].value = margin1;
        this.margin_fields[2].value = margin2;
        this.margin_fields[3].value = margin3;
        this.resolution_field.value = resolution;
        this.map_scale_field.value = scale;
        this.src_zoom_field.value = zoom < 0 ? 'auto' : zoom;
        for (var i=0; i< pages.length; i++) {
            var lat = pages[i][0],
                lng = pages[i][1],
                rotated = pages[i][2];
            if (isNaN(lat) || isNaN(lng) || isNaN(rotated)){
                this._updating_state = false;
                return false;
            }
            this._addSheet([lat, lng], rotated);
        }
        this._updating_state = false;
        return true;
    }
});

