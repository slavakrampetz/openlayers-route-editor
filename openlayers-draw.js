document.addEventListener("DOMContentLoaded", function() {

	var MAP = {

		// Source for vector layer
		source: null,
		// Vector layer
		vector: null,
		// Map object
		map: null,

		// Draw behaviour
		bv_draw: null,
		bv_modify: null,
		bv_snap: null,

		// Currently drawn feature
		sketch: null,
		// The help tooltip element.
		helpTooltipElement: null,
		// Overlay to show the help messages.
		helpTooltip: null,
		// The measure tooltip element.
		measureTooltipElement: null,
		// Overlay to show the measurement.
		measureTooltip: null,

		$route: null,
		$route_js: null,
		$save: null,
		$load: null,
		$apply: null,

		init: function(div, raster, ptCenter, zoom, rotation) {

			MAP.source = new ol.source.Vector();
			MAP.vector = new ol.layer.Vector({
				source: MAP.source,
				style: new ol.style.Style({
					fill: new ol.style.Fill({
						color: 'rgba(255, 255, 255, 0.2)'
					}),
					stroke: new ol.style.Stroke({
						color: '#ffcc33',
						width: 2
					}),
					image: new ol.style.Circle({
						radius: 7,
						fill: new ol.style.Fill({
							color: '#ffcc33'
						})
					})
				})
			});

			MAP.$route = document.getElementById('coordinates');
			MAP.$save =  document.getElementById('save');
			MAP.$load =  document.getElementById('load');
			MAP.$apply = document.getElementById('apply');
			MAP.$copy = document.getElementById('copy');

			// Trick from https://github.com/zenorocha/clipboard.js/blob/master/src/clipboard-action.js
			var yPosition = window.pageYOffset || document.documentElement.scrollTop;
			MAP.$route_js = document.createElement('textarea');
			MAP.$route_js.setAttribute('readonly', '');
			MAP.$route_js.value = '';
			MAP.$route_js.style.fontSize = '12pt';
			MAP.$route_js.style.border = '0';
			MAP.$route_js.style.padding = '0';
			MAP.$route_js.style.margin = '0';
			MAP.$route_js.style.position = 'absolute';
			MAP.$route_js.style.right = '-9999px';
			MAP.$route_js.style.top = '' + yPosition + 'px';
			MAP.$route.parentElement.appendChild(MAP.$route_js);

			// Create map
			MAP.map = new ol.Map({
				layers: [raster, MAP.vector],
				target: div,
				view: new ol.View({
					center: ptCenter,
					zoom: zoom,
					rotation: rotation
				})
			});

			// Bind events
			MAP.map.on('pointermove', MAP.pointerMoveHandler);
			MAP.map.getViewport().addEventListener('mouseout', function () {
				MAP.helpTooltipElement.classList.add('hidden');
			});

			// Create modify and snap
			MAP.bv_modify = new ol.interaction.Modify({
				source: MAP.source,
				fake: null
			});
			MAP.bv_snap = new ol.interaction.Snap({source: MAP.source});

			// Create draw
			MAP.bv_draw = new ol.interaction.Draw({
				source: MAP.source,
				type: 'LineString',
				freehand: false,
				style: new ol.style.Style({
					stroke: new ol.style.Stroke({
						color: 'rgba(0, 0, 0, 0.5)',
						lineDash: [10, 10],
						width: 2
					}),
					image: new ol.style.Circle({
						radius: 4,
						stroke: new ol.style.Stroke({color: 'rgba(0, 0, 0, 0.7)'}),
						fill: new ol.style.Fill({color: 'rgba(255, 255, 255, 0.2)'})
					})
				}),
				freehandCondition: ol.events.condition.never,
				fake: null
			});

			MAP.map.addInteraction(MAP.bv_draw);
			MAP.map.addInteraction(MAP.bv_modify);
			MAP.map.addInteraction(MAP.bv_snap);

			// MAP.createMeasureTooltip();

			MAP.helpTooltipElement = document.createElement('div');
			MAP.helpTooltipElement.className = 'tooltip hidden';
			MAP.helpTooltip = new ol.Overlay({
				element: MAP.helpTooltipElement,
				offset: [15, 0],
				positioning: 'center-left'
			});
			MAP.map.addOverlay(MAP.helpTooltip);

			MAP.bv_draw.on('drawstart',
				function (evt) {
					// set sketch
					MAP.sketch = evt.feature;
					MAP.route_tip_bind(MAP.sketch);
				}, this);

			MAP.bv_draw.on('drawend',function () {
				MAP.route_tip_fix(MAP.sketch);
				// unset sketch
				MAP.sketch = null;
			}, this);

			MAP.bv_modify.on('modifyend', function(e) {
//				console.log(e);
			});

			MAP.$save.addEventListener('click',function() {
				MAP.route_save();
			});
			MAP.$load.addEventListener('click',function() {
				MAP.route_load();
			});
			MAP.$apply.addEventListener('click',function() {
				MAP.route_apply();
			});
			MAP.$copy.addEventListener('click',function() {
				MAP.route_copy();
			});
		},

		route_tip_fix: function(feature) {
			var tip = MAP.getMeasureTooltip(feature);
			var elem = tip.getElement();
			elem.className = 'tooltip tooltip-static';

			tip.setOffset([0, -7]);
		},

		route_tip_bind: function(feature) {
			var geom = feature.getGeometry();

			var tip = MAP.getMeasureTooltip(feature);
			var elem = tip.getElement();

			geom.on('change', function (evt) {
				var geom = evt.target;
				var output = MAP.formatLength(geom);
				var coord = geom.getLastCoordinate();
				// elem.innerHTML = output;

				tip.__text.innerText = output;
				tip.setPosition(coord);
				MAP.route_text(geom);
			});
		},

		// Route from text -> map
		route_apply: function() {
			var val = MAP.$route.value.trim();
			if (!val.length) {
				return false;
			}
			var coords = [];
			var lines = val.split("\n");
			for(var i = 0, nof = lines.length; i < nof; i++) {
				var l = lines[i];
				var parts = l.split(',');
				if (parts.length < 2) {
					return false;
				}
				var lat = parseFloat(parts[0]),
					  lng = parseFloat(parts[1]);
				coords.push([lat, lng]);
			}
			if (coords.length < 1) {
				return false;
			}

			var route = null;
			// Current route not finished?
			if (MAP.sketch !== null) {
				route = MAP.sketch;
				console.log('Updating current sketch');
			} else {
				console.log('Look for existing route ...');

				var first = coords[0];
				var pixel = MAP.map.getPixelFromCoordinate(first);

				// Look for new
				var features = MAP.map.getFeaturesAtPixel(pixel);
				if (features && features.length) {
					route = features[0];
				} else {
					var g = new ol.geom.LineString(coords);
					var f = new ol.Feature({geometry: g});
					MAP.route_tip_bind(f);
					MAP.route_tip_fix(f);
					MAP.source.addFeature(f);
					route = f;
				}
			}
			console.log('Route:', route);
			if (route) {
				route.getGeometry().setCoordinates(coords);
			}
			return true;
		},

		// Save route to use later
		route_save: function() {
			var val = MAP.$route.value.trim();
			if (val.length) {
				console.log('Saving route to local storage ...');
				localStorage.setItem('route', val);
			}
		},

		// Save route to use later
		route_copy: function() {
			MAP.$route_js.select();
			document.execCommand('Copy');
		},

		// Route load from storage
		route_load: function() {
			var val = localStorage.getItem('route').trim();
			if (!val.length) {
				console.log('No route at local storage...');
				return false;
			}
			console.log('Load route from local storage', val);
			MAP.$route.value = val;
			MAP.route_apply();
		},

		route_text: function(geom) {
			var coords = geom.getCoordinates();
			if (coords) {
				console.log(coords);
				var txt = '';
				var last = null;
				for (var i = 0, nof = coords.length; i < nof; i++) {
					var c = coords[i];
					if (last !== null && c[0] === last[0] && c[1] === last[1]) {
						continue;
					}
					var lat = c[0], lng = c[1];
					txt += lat + ',' + lng + "\n";
					last = c;
				}
				MAP.$route.value = txt;
				MAP.$route_js.value = JSON.stringify(coords);
			}
		},

		route_delete: function (e) {
			if (!e.target.feature) {
				console.error('No feature attached...');
				return;
			}

			MAP.source.removeFeature(e.target.feature);
			MAP.map.removeOverlay(e.target.feature.__tooltip);
		},

		// Handle pointer move.
		pointerMoveHandler: function (evt) {
			if (evt.dragging) {
				return;
			}
			MAP.helpTooltipElement.innerHTML = (MAP.sketch) ? 'Click for next point' : 'Click for start';
			MAP.helpTooltip.setPosition(evt.coordinate);
			MAP.helpTooltipElement.classList.remove('hidden');
		},


		getMeasureTooltip: function(feature) {
			if (feature.__tooltip) {
				return feature.__tooltip;
			}

			var elem = document.createElement('div');
			elem.className = 'tooltip tooltip-measure';

			var len = document.createElement('span');
			elem.appendChild(len);

			var close = document.createElement('a');
			close.className = 'route-delete';
			close.innerText = 'X';
			close.feature = feature;

			elem.appendChild(close);

			close.addEventListener('click', MAP.route_delete)

			var tip = new ol.Overlay({
				element: elem,
				offset: [0, -15],
				positioning: 'bottom-center'
			});
			tip.__text = len;
			MAP.map.addOverlay(tip);

			feature.__tooltip = tip;
			return feature.__tooltip;
		},

		// Format length output.
		formatLength: function(line) {
			var length = ol.Sphere.getLength(line);

			var output;
			if (length > 100) {
				output = (Math.round(length / 1000 * 100) / 100) + ' ' + 'km';
			} else {
				output = (Math.round(length * 100) / 100) + ' ' + 'm';
			}
			return output;
		}
	};

	var centerTomsk = ol.proj.fromLonLat([84.9503, 56.4736]);
	var sourceBing = new ol.source.BingMaps({
		key: 'Aml8ZQ_ABQua7aNOB9RUuvLv_KWn3T_2E8ei10dTjy1IQF5lQk2yqgGG7JmB9ckS',
		imagerySet: 'RoadOnDemand', // 'Road'
		culture: 'ru-ru',
		// see stretched tiles instead of "no photos at this zoom level"
		maxZoom: 19,
		hidpi: false,
		transition: 0
	});
	var layerBing = new ol.layer.Tile({
		visible: true,
		opacity: 0.7,
		preload: Infinity,
		source: sourceBing
	});
	var zoom = 15;
	var rotation = -105 * Math.PI / 180;
	MAP.init('map', layerBing, centerTomsk, zoom, rotation);

});