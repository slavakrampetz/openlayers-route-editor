# openlayers-route-editor

## How it can be helpful for you. 

If you, like me, need a simple tool for create a rotated map with routes, it can be helpful.


## How to run

1. Just clone/download and launch under any web-server. Not sure it will work from local file, never tested.
   OR just open https://openlayers-route-editor.netlify.com
2. Click at map, create / edit route. Route points will be shown in textarea below map.
3. Commands: 
  - Save - save current route to local storage
  - Copy - copy JSON array with coordinates of current route to clipboard
  - Load - load route from local storage and show it on map


## What to change

A. File ``openlayers-draw.js``. Go to very bottom of file, there is initializing of map. 
1. There is mine Bing maps API key. Do not use it at production.
2. Change language of map labels by changing field ``culture``.
3. Change zoom and rotation variables

B. TBC...


## Snippets

#### Convert map coordinates to Latitude/Longitude
``
coord = ol.proj.transform(coord, 'EPSG:3857', 'EPSG:4326');
var lon = coord[0];
var lat = coord[1];
``

## Useful examples of OpenLayers

OpenLayers examples page is quite large. There is more useful ones.

1. Animation
  http://openlayers.org/en/latest/examples/feature-move-animation.html
2. Measure
  http://openlayers.org/en/latest/examples/measure.html
3. Icon
  http://openlayers.org/en/latest/examples/icon.html
4. Color manipulation -- works very slow on Bing map
  http://openlayers.org/en/master/examples/color-manipulation.html
5. Image filters: sloow too
  http://openlayers.org/en/latest/examples/image-filter.html?mode=raw
6. HereMaps: TerrainDay
  http://openlayers.org/en/latest/examples/here-maps.html
7. Vector layer
  http://openlayers.org/en/latest/examples/image-vector-layer.html
8. Transform
  http://openlayers.org/en/master/examples/layer-extent.html?q=tile
