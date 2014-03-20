L.Control.PrintPages = L.Control.extend({
    includes: L.Mixin.Events,
    
    initialize: function() {
        this.sheets = [];
        this._container =  L.DomUtil.create('div', 'leaflet-bottom leaflet-left');
        var dialogContainer = L.DomUtil.create('div', 'leaflet-control leaflet-printpages-dialog', this._container);
        dialogContainer.innerHTML = '\
        <table class="form">\
            <tr>\
                <td colspan="2">\
                    <div class="print-page-bar">\
                        <a class="print-page-add-portrait"></a>\
                        <a class="print-page-add-landscape"></a>\
                    </div>\
                </td>\
            </tr>\
            <tr>\
                <td>Page size</td>\
                <td>\
                    <p class="print-page-sizes">\
                        <a class="print-page-dialog-template-link" pagewidth="297" pageheight="420">A3</a>\
                        <a class="print-page-dialog-template-link" pagewidth="210" pageheight="297">A4</a>\
                        <a class="print-page-dialog-template-link" pagewidth="148" pageheight="210">A5</a>\
                    </p>\
                    <input type="text" size="3" pattern="\\d+" maxlength="3" placeholder="width" name="pagewidth" value="210">\
                    x <input type="text" size="3" pattern="\\d+" maxlength="3" placeholder="height" name="pageheight" value="297"> mm\
                </td>\
            </tr>\
<!--\
            <tr>\
                <td>Margin</td>\
                <td>\
                    <table class="margincells">\
                        <tr><td></td><td><input type="text" size="1" pattern="\\d+" maxlength="2" placeholder="top" value="3"></td><td></td></tr>\
                        <tr>\
                            <td><input type="text" size="1" pattern="\\d+" maxlength="2" placeholder="left" value="3"></td>\
                            <td></td><td><input type="text" size="1" pattern="\\d+" maxlength="2" placeholder="right" value="3"> mm</td>\
                        </tr>\
                        <tr><td></td><td><input type="text" size="1" pattern="\\d+" maxlength="2" placeholder="bottom" value="3"></td><td></td></tr>\
                    </table>\
                </td>\
            </tr>\
-->\
            <tr>\
                <td>Resolution</td>\
                <td><input type="text" size="4" pattern="\\d+" maxlength="4" value=300 name="resolution"> dpi</td>\
            </tr>\
            <tr>\
                <td>Map scale</td>\
                <td>\
                    <p class="print-page-scales">\
                        <a class="print-page-dialog-template-link" mapscale=100000>1:100 000</a>\
                        <a class="print-page-dialog-template-link" mapscale=50000>1:50 000</a>\
                    </p>\
                    1:<input type="text" size="6" pattern="\\d+" maxlength="6" name="mapscale" value="50000">\
                </td>\
            </tr>\
            <tr>\
                <td>Source zoom level</td>\
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
                    <div class="print-page-dialog-download-pane">\
                        <a class="print-page-dialog-download-link" name="download-pdf">Download PDF</a>\
                        <div class="progress-unknown hidden"><div class="progress-unknown-bar">|</div></div>\
                        <div class="progress hidden"><div class="progress-bar-bkg"><div class="progress-bar"></div></div>\
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
        var page_format_links = dialogContainer.querySelectorAll('p.print-page-sizes a');
        this.progress_unknown_icon = dialogContainer.querySelector('.progress-unknown');
        this.progress_container = dialogContainer.querySelector('.progress');
        this.progress_bar = dialogContainer.querySelector('.progress-bar');
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
        dialogContainer.querySelector('.print-page-add-portrait').onclick = this._addSheetPortrait.bind(this);
        dialogContainer.querySelector('.print-page-add-landscape').onclick = this._addSheetLandscape.bind(this);
        this.download_button.onclick = this._downloadPDF.bind(this);
        this.page_width_field.onchange = this._changePaperSize.bind(this);
        this.page_height_field.onchange = this._changePaperSize.bind(this);
        this.map_scale_field.onchange = this._changeMapScale.bind(this);                
    },
    
    addTo: function(map){
        map._controlContainer.appendChild(this._container);
        this._map = map;
        var stop = L.DomEvent.stopPropagation;
         L.DomEvent
            .on(this._container, 'click', stop)
            .on(this._container, 'mousedown', stop)
            .on(this._container, 'touchstart', stop)
            .on(this._container, 'dblclick', stop)
            .on(this._container, 'mousewheel', stop)
            .on(this._container, 'MozMousePixelScroll', stop);
        return this;
    },
    
    getPaperSize: function() {
        return [this.page_width_field.value, this.page_height_field.value];
    },
    getMargins: function() {},
    getResolution: function() {
        return this.resolution_field.value;
    },

    getMapScale: function(){
        return this.map_scale_field.value;
    },
    
    getSourceZoom: function(){
        return this.src_zoom_field.value;
    },
    
    _addSheetPortrait: function() {
        var paper_size = this.getPaperSize();
        var sheet = new L.PaperSheet(this._map.getCenter(), 
                                     {label: this.sheets.length + 1, 
                                      map_scale_denominator: this.getMapScale(),
                                      paper_width: paper_size[0], paper_height: paper_size[1]});
        sheet.addTo(this._map);
        this.sheets.push(sheet);
        sheet.on('remove', this._onSheetRemove, this)
        return sheet;
    },

    _addSheetLandscape: function() {
        this._addSheetPortrait().rotate();
    },
    
    _changePaperSize: function() {
        var size = this.getPaperSize();
        var width = size[0];
        var height = size[1];
        for (var i=0; i<this.sheets.length; i++){
            this.sheets[i].setPaperSize(width, height);
        }
    },

    _changeMapScale: function() {
        var scale = this.getMapScale();
        for (var i=0; i<this.sheets.length; i++){
            this.sheets[i].setMapScale(scale);
        }
    },
    
    _onSheetRemove: function(e) {
        var sheet = e.target;
        this.sheets.splice(this.sheets.indexOf(e.target), 1);
        sheet.removeFrom();
        this._updateLabels();
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
                sheet = this.sheets[i];
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
        var images_data = this.sheets.map(
            function(sheet){
                var image_width, image_height;
                if (sheet.isRotated()) {
                     image_width = paper_height_pixels;
                     image_height  = paper_width_pixels;
                 } else {
                     image_width = paper_width_pixels;
                     image_height  = paper_height_pixels;
                 }
                return makeMapRectangleImage(this_._map, sheet.getLatLngBounds(), 
                    zooms, zoom != 'auto',
                    image_width, image_height, this_.notifyProgress.bind(this_));
            });                
        Promise.all(images_data).done(function(images){
            console.log('Data ready')
            var pdf_data = buildPDF(images, resolution);
            downloadFile('map.pdf', 'application/pdf', pdf_data);
            this_.stopProgress();
            });
        
    }
    
});

