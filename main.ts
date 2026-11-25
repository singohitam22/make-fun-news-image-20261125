// THE WORLD IN ONE DAY — Wednesday 25 November 2026.
// Draws a one-page newspaper front page summing up the day's world news.
// Node 22 standard library only, no network, fully deterministic:
// the same bytes are written on every run.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const PAPER = [247, 242, 231];
const INK = [20, 20, 20];
const RED = [176, 30, 30];
const BLUE = [31, 78, 121];
const SKY = [178, 214, 235];
const SEA = [38, 92, 140];
const GOLD = [196, 148, 44];
const GREY = [110, 110, 105];
const LIGHT = [232, 226, 210];

// ------------------------------------------------------- 5x7 bitmap font
// Each glyph is 7 rows of 5 cells, "#" = ink, "." = empty. All copy is
// upper-case, so only upper-case letters, digits and punctuation are needed.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "+": ["00000", "00100", "00100", "01110", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "*": ["00000", "10101", "01110", "10101", "00000", "00000", "00000"],
};

function textWidth(text: string, scale: number): number {
  let w = 0;
  for (const ch of text) {
    w += 5 * scale + scale; // glyph + one scaled space
  }
  return w - scale;
}

function wrapText(text: string, maxWidth: number, scale: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const trial = line ? line + " " + word : word;
    if (textWidth(trial, scale) <= maxWidth || !line) {
      line = trial;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ------------------------------------------------------------------ canvas
class Canvas {
  data = new Uint8Array(W * H * 3);
  constructor() {
    for (let i = 0; i < W * H; i++) {
      this.data[i * 3] = PAPER[0];
      this.data[i * 3 + 1] = PAPER[1];
      this.data[i * 3 + 2] = PAPER[2];
    }
  }
  px(x: number, y: number, c: number[]) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
  }
  rect(x: number, y: number, w: number, h: number, c: number[]) {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) this.px(xx, yy, c);
  }
  hline(x: number, y: number, w: number, c: number[], t = 1) {
    this.rect(x, y, w, t, c);
  }
  vline(x: number, y: number, h: number, c: number[], t = 1) {
    this.rect(x, y, t, h, c);
  }
  outline(x: number, y: number, w: number, h: number, c: number[], t = 1) {
    this.hline(x, y, w, c, t);
    this.hline(x, y + h - t, w, c, t);
    this.vline(x, y, h, c, t);
    this.vline(x + w - t, y, h, c, t);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: number[]) {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.px(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }
  circle(cx: number, cy: number, r: number, c: number[]) {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++)
        if (x * x + y * y <= r * r) this.px(cx + x, cy + y, c);
  }
  ring(cx: number, cy: number, r: number, c: number[], t = 2) {
    for (let a = 0; a < 360; a += 1) {
      const rad = (a * Math.PI) / 180;
      for (let k = 0; k < t; k++)
        this.px(
          Math.round(cx + (r - k) * Math.cos(rad)),
          Math.round(cy + (r - k) * Math.sin(rad)),
          c,
        );
    }
  }
  // 8-point starburst (explosion / blast).
  star(cx: number, cy: number, r: number, c: number[]) {
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      const x2 = Math.round(cx + r * Math.cos(a));
      const y2 = Math.round(cy + r * Math.sin(a));
      this.line(cx, cy, x2, y2, c);
      const a2 = a + Math.PI / 8;
      const x3 = Math.round(cx + (r * 0.55) * Math.cos(a2));
      const y3 = Math.round(cy + (r * 0.55) * Math.sin(a2));
      this.line(cx, cy, x3, y3, c);
    }
    this.circle(cx, cy, Math.max(2, Math.round(r * 0.28)), c);
  }
  text(x: number, y: number, s: string, scale: number, c: number[]) {
    let cx = x;
    for (const ch of s.toUpperCase()) {
      const g = FONT[ch] ?? FONT["?"];
      for (let r = 0; r < 7; r++)
        for (let col = 0; col < 5; col++)
          if (g[r][col] === "1")
            this.rect(cx + col * scale, y + r * scale, scale, scale, c);
      cx += 6 * scale;
    }
  }
  textCentered(y: number, s: string, scale: number, c: number[], cx0 = 0, cx1 = W) {
    const w = textWidth(s.toUpperCase(), scale);
    this.text(cx0 + Math.floor((cx1 - cx0 - w) / 2), y, s, scale, c);
  }
}

// ------------------------------------------------------------ PNG encoding
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePNG(cv: Canvas): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(cv.data.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------- pictograms
// Small flat pictograms, one per story. Each draws inside a 96x96 box
// whose top-left corner is (x, y).

function picTower(cv: Canvas, x: number, y: number) {
  cv.rect(x + 8, y + 8, 80, 80, LIGHT);
  cv.outline(x + 8, y + 8, 80, 80, INK, 2);
  // Riyadh's tallest tower: stepped skyscraper with a spire.
  cv.rect(x + 38, y + 22, 20, 58, BLUE);
  cv.rect(x + 32, y + 34, 32, 46, BLUE);
  cv.rect(x + 26, y + 48, 44, 32, BLUE);
  cv.line(x + 48, y + 22, x + 48, y + 12, INK);
  cv.circle(x + 48, y + 12, 2, RED);
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 2; c++) cv.rect(x + 40 + c * 5, y + 28 + r * 9, 3, 5, PAPER);
  cv.star(x + 74, y + 22, 12, RED);
  cv.circle(x + 74, y + 22, 4, GOLD);
}

function picMedal(cv: Canvas, x: number, y: number) {
  cv.rect(x + 8, y + 8, 80, 80, LIGHT);
  cv.outline(x + 8, y + 8, 80, 80, INK, 2);
  // Ribbon, then a gold medal with a star.
  cv.line(x + 40, y + 14, x + 48, y + 34, RED);
  cv.line(x + 56, y + 14, x + 48, y + 34, BLUE);
  cv.rect(x + 36, y + 12, 8, 12, RED);
  cv.rect(x + 52, y + 12, 8, 12, BLUE);
  cv.circle(x + 48, y + 56, 20, GOLD);
  cv.ring(x + 48, y + 56, 20, INK, 2);
  cv.star(x + 48, y + 56, 12, INK);
}

function picCourt(cv: Canvas, x: number, y: number) {
  cv.rect(x + 8, y + 8, 80, 80, LIGHT);
  cv.outline(x + 8, y + 8, 80, 80, INK, 2);
  // Courthouse: pediment, three columns, steps.
  cv.line(x + 20, y + 22, x + 48, y + 12, INK);
  cv.line(x + 76, y + 22, x + 48, y + 12, INK);
  cv.hline(x + 18, y + 22, 60, INK, 2);
  cv.rect(x + 26, y + 26, 6, 38, INK);
  cv.rect(x + 45, y + 26, 6, 38, INK);
  cv.rect(x + 64, y + 26, 6, 38, INK);
  cv.hline(x + 20, y + 66, 56, INK, 2);
  cv.hline(x + 16, y + 72, 64, INK, 2);
  cv.hline(x + 12, y + 78, 72, INK, 2);
  cv.star(x + 48, y + 18, 4, RED);
}

function picGlobe(cv: Canvas, x: number, y: number) {
  cv.rect(x + 8, y + 8, 80, 80, LIGHT);
  cv.outline(x + 8, y + 8, 80, 80, INK, 2);
  // Warming globe: blue earth, green land, red sun overhead.
  cv.circle(x + 48, y + 52, 24, SEA);
  cv.ring(x + 48, y + 52, 24, INK, 2);
  cv.rect(x + 34, y + 38, 12, 8, [74, 140, 74]);
  cv.rect(x + 52, y + 46, 14, 10, [74, 140, 74]);
  cv.rect(x + 40, y + 60, 10, 6, [74, 140, 74]);
  cv.circle(x + 74, y + 22, 9, RED);
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    cv.line(
      x + 74 + Math.round(12 * Math.cos(a)),
      y + 22 + Math.round(12 * Math.sin(a)),
      x + 74 + Math.round(16 * Math.cos(a)),
      y + 22 + Math.round(16 * Math.sin(a)),
      RED,
    );
  }
  cv.line(x + 30, y + 82, x + 66, y + 82, RED);
}

function picTanker(cv: Canvas, x: number, y: number) {
  cv.rect(x + 8, y + 8, 80, 80, LIGHT);
  cv.outline(x + 8, y + 8, 80, 80, INK, 2);
  // Sea, tanker with containers, a spiked naval mine.
  cv.rect(x + 10, y + 52, 76, 34, SEA);
  cv.rect(x + 18, y + 40, 52, 12, INK);
  cv.rect(x + 22, y + 30, 14, 10, RED);
  cv.rect(x + 40, y + 30, 14, 10, GOLD);
  cv.rect(x + 56, y + 30, 10, 10, PAPER);
  cv.rect(x + 70, y + 34, 6, 6, INK);
  cv.circle(x + 74, y + 72, 7, INK);
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    cv.line(
      x + 74 + Math.round(7 * Math.cos(a)),
      y + 72 + Math.round(7 * Math.sin(a)),
      x + 74 + Math.round(11 * Math.cos(a)),
      y + 72 + Math.round(11 * Math.sin(a)),
      INK,
    );
  }
  cv.hline(x + 14, y + 60, 20, PAPER, 2);
  cv.hline(x + 44, y + 66, 20, PAPER, 2);
}

function picCyber(cv: Canvas, x: number, y: number) {
  cv.rect(x + 8, y + 8, 80, 80, LIGHT);
  cv.outline(x + 8, y + 8, 80, 80, INK, 2);
  // Laptop with a cracked shield on its screen.
  cv.rect(x + 20, y + 22, 56, 38, INK);
  cv.rect(x + 24, y + 26, 48, 30, SKY);
  cv.rect(x + 16, y + 60, 64, 6, INK);
  cv.circle(x + 48, y + 41, 11, RED);
  cv.ring(x + 48, y + 41, 11, PAPER, 2);
  cv.line(x + 48, y + 32, x + 44, y + 40, PAPER);
  cv.line(x + 44, y + 40, x + 50, y + 46, PAPER);
  cv.line(x + 50, y + 46, x + 48, y + 52, PAPER);
  cv.text(x + 28, y + 70, "0 1 1 0", 1, INK);
}

// Lead picture: the Baltic at dawn — a Russian cargo ship, a Ukrainian
// drone above it, a blast at the mast, and a NATO early-warning aircraft.
function picLead(cv: Canvas, x: number, y: number, w: number, h: number) {
  cv.rect(x, y, w, h, SKY);
  cv.outline(x, y, w, h, INK, 2);
  const seaY = y + 108;
  cv.rect(x, seaY, w, h - 108, SEA);
  // Sun low over the sea.
  cv.circle(x + 90, y + 34, 20, GOLD);
  cv.ring(x + 90, y + 34, 20, INK, 2);
  // Waves.
  for (let i = 0; i < 12; i++) {
    const wx = x + 20 + i * 80;
    cv.hline(wx, seaY + 18 + (i % 3) * 14, 34, PAPER, 2);
  }
  // Cargo ship, centre-left.
  const sx = x + 300;
  const sy = seaY - 8;
  cv.rect(sx, sy - 26, 210, 26, INK); // hull
  cv.rect(sx + 20, sy - 52, 70, 26, RED); // superstructure
  cv.rect(sx + 110, sy - 44, 46, 18, PAPER); // containers
  cv.rect(sx + 160, sy - 44, 40, 18, GOLD);
  cv.rect(sx + 100, sy - 72, 10, 20, INK); // funnel
  cv.line(sx + 30, sy - 52, sx + 30, sy - 84, INK); // mast
  // Blast at the mast.
  cv.star(sx + 30, sy - 84, 26, RED);
  cv.circle(sx + 30, sy - 84, 8, GOLD);
  // Drone above the ship.
  const dx = x + 640;
  const dy = y + 34;
  cv.rect(dx - 14, dy - 5, 28, 10, INK);
  cv.line(dx - 26, dy - 10, dx + 26, dy - 10, INK);
  cv.circle(dx - 26, dy - 10, 4, INK);
  cv.circle(dx + 26, dy - 10, 4, INK);
  cv.line(dx - 26, dy + 8, dx + 26, dy + 8, INK);
  cv.circle(dx - 26, dy + 8, 4, INK);
  cv.circle(dx + 26, dy + 8, 4, INK);
  cv.circle(dx, dy, 3, RED);
  // NATO early-warning aircraft, top right.
  const px = x + 800;
  const py = y + 30;
  cv.rect(px, py - 3, 90, 7, INK);
  cv.line(px + 20, py - 3, px + 45, py - 22, INK);
  cv.line(px + 55, py + 4, px + 70, py + 18, INK);
  cv.circle(px + 45, py - 26, 12, INK); // radar dome
  cv.ring(px + 45, py - 26, 12, PAPER, 1);
  // Labels.
  cv.rect(x + 330, seaY + 42, textWidth("RUSSIAN CARGO SHIP", 2), 16, SEA);
  cv.text(x + 330, seaY + 44, "RUSSIAN CARGO SHIP", 2, PAPER);
  cv.text(dx - 34, dy + 22, "DRONE", 2, INK);
  cv.text(px - 8, py + 28, "NATO AIRCRAFT", 2, INK);
}

// ------------------------------------------------------------------ layout
interface Story {
  head: string;
  deck: string;
  pic: (cv: Canvas, x: number, y: number) => void;
}

const STORIES: Story[] = [
  {
    head: "HOUTHIS HIT RIYADH'S TALLEST TOWER",
    deck: "11 wounded in the strike on the capital.",
    pic: picTower,
  },
  {
    head: "GIULIANI GETS MEDAL OF FREEDOM",
    deck: "Trump awards Rudy Giuliani the Presidential Medal of Freedom.",
    pic: picMedal,
  },
  {
    head: "HUAWEI CONVICTED IN US TRIAL",
    deck: "Guilty over Iran business and trade secrets.",
    pic: picCourt,
  },
  {
    head: "COP31 COLLAPSES WITH NO DEAL",
    deck: "Antalya summit ends empty as oil states block a fossil-fuel phaseout.",
    pic: picGlobe,
  },
  {
    head: "THREE TANKERS 'HIT BY MINES'",
    deck: "Iran's Guard Navy claims strikes in the Strait of Hormuz.",
    pic: picTanker,
  },
  {
    head: "CIA AND ODNI HIT BY CYBER BREACH",
    deck: "Some unclassified information taken, agencies say.",
    pic: picCyber,
  },
];

function drawPage(cv: Canvas) {
  const M = 28; // margin
  // Masthead.
  cv.textCentered(30, "THE WORLD IN ONE DAY", 5, INK);
  cv.hline(M, 78, W - 2 * M, INK, 3);
  cv.hline(M, 84, W - 2 * M, INK, 1);
  cv.textCentered(96, "WEDNESDAY 25 NOVEMBER 2026", 2, RED);
  cv.hline(M, 122, W - 2 * M, INK, 2);
  // Lead headline (DeepSeek draft, trimmed to fit).
  cv.textCentered(138, "UKRAINE DRONE STRIKES HIT", 3, INK);
  cv.textCentered(166, "RUSSIAN SHIPS IN BALTIC, LIBYA", 3, INK);
  // Deck.
  const deck =
    "Zelenskiy confirms a cargo ship hit in the Gulf of Finland. " +
    "Moscow calls the strikes terrorism after attacks in the Baltic " +
    "and off Benghazi. NATO will send early-warning aircraft to Poland.";
  const deckLines = wrapText(deck, W - 2 * M, 2);
  deckLines.forEach((ln, i) => cv.text(M, 202 + i * 18, ln, 2, INK));
  // Lead picture.
  picLead(cv, M, 258, W - 2 * M, 178);
  // Six stories, two columns x three rows.
  const colW = 468;
  const rowH = 142;
  const top = 452;
  STORIES.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * (colW + 32);
    const y = top + row * rowH;
    if (row > 0) cv.hline(M, y - 8, W - 2 * M, GREY, 1);
    s.pic(cv, x, y);
    const tx = x + 110;
    const tw = colW - 110;
    const headLines = wrapText(s.head, tw, 2);
    headLines.forEach((ln, j) => cv.text(tx, y + 4 + j * 18, ln, 2, INK));
    const deckY = y + 4 + headLines.length * 18 + 6;
    const deck2 = wrapText(s.deck, tw, 2);
    deck2.forEach((ln, j) => cv.text(tx, deckY + j * 18, ln, 2, GREY));
  });
  // Footer: sport and the lighter story.
  const fy = top + 3 * rowH + 8;
  cv.hline(M, fy, W - 2 * M, INK, 2);
  cv.textCentered(
    fy + 14,
    "SPORT: ENGLAND BEAT AUSTRALIA BY 8 WICKETS IN THE SECOND T20I",
    2,
    INK,
  );
  cv.textCentered(
    fy + 38,
    "AND FINALLY: TRUMP PARDONS THANKSGIVING TURKEYS FREEDOM AND FEATHERS",
    2,
    INK,
  );
  cv.hline(M, fy + 66, W - 2 * M, INK, 1);
}

// -------------------------------------------------------------------- main
function main() {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const cv = new Canvas();
  drawPage(cv);
  const png = encodePNG(cv);
  writeFileSync(join(outDir, "entry.png"), png);
}

main();
