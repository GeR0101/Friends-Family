import { geoContains } from "d3-geo";
import { feature } from "topojson-client";
import { readFileSync } from "node:fs";

const topo = JSON.parse(
  readFileSync(new URL("../public/land-110m.json", import.meta.url))
);
const land = feature(topo, topo.objects.land);

const GRID_COLS = 168;
const GRID_ROWS = 78;
const LAT_TOP = 83;
const LAT_BOTTOM = -58;
const LAT_SPAN = LAT_TOP - LAT_BOTTOM;

const colToLon = (c) => -180 + (c / (GRID_COLS - 1)) * 360;
const rowToLat = (r) => LAT_TOP - (r / (GRID_ROWS - 1)) * LAT_SPAN;

const total = GRID_COLS * GRID_ROWS;
const bytes = new Uint8Array(Math.ceil(total / 8));

let idx = 0;
for (let row = 0; row < GRID_ROWS; row++) {
  const lat = rowToLat(row);
  for (let col = 0; col < GRID_COLS; col++) {
    const lon = colToLon(col);
    if (geoContains(land, [lon, lat])) {
      bytes[idx >> 3] |= 1 << (idx & 7);
    }
    idx++;
  }
}

const b64 = Buffer.from(bytes).toString("base64");
console.log(b64);
