#!/usr/bin/env python3
"""Regenerate the seed fixtures in this directory.

The demo media is *generated*, never downloaded. Two reasons, both from
docs/mad/20260819-file-uploads.md: the app must seed on a machine with no
outbound internet, and anything committed to git is permanent — so the
fixtures have to be small, ours, and reproducible from this script.

Needs Pillow and ffmpeg. Nothing at runtime does: the committed output is
what `make seed` reads. Run from srcs/backend:

    python3 prisma/seed-assets/generate.py
"""

import math
import os
import shutil
import subprocess
import tempfile

from PIL import Image, ImageDraw

OUT = os.path.dirname(os.path.abspath(__file__))


def lerp(a, b, t):
	return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(size, top, bottom):
	width, height = size
	image = Image.new("RGB", size)
	draw = ImageDraw.Draw(image)
	for y in range(height):
		draw.line([(0, y), (width, y)], fill=lerp(top, bottom, y / max(height - 1, 1)))
	return image


def piece_arcs(size, palette):
	image = gradient(size, palette[0], palette[1])
	draw = ImageDraw.Draw(image, "RGBA")
	width, height = size
	for i in range(7):
		r = int(min(width, height) * (0.18 + i * 0.11))
		cx, cy = int(width * 0.32), int(height * 0.74)
		draw.arc(
			[cx - r, cy - r, cx + r, cy + r],
			start=200,
			end=340,
			fill=palette[2] + (70,),
			width=max(3, r // 14),
		)
	return image


def piece_bars(size, palette):
	image = gradient(size, palette[0], palette[1])
	draw = ImageDraw.Draw(image, "RGBA")
	width, height = size
	for i in range(14):
		x = int(width * (0.05 + i * 0.066))
		bar = int(height * (0.18 + 0.55 * abs(math.sin(i * 1.1))))
		draw.rectangle([x, height - bar, x + int(width * 0.038), height], fill=palette[2] + (200,))
	return image


def piece_orbits(size, palette):
	image = gradient(size, palette[0], palette[1])
	draw = ImageDraw.Draw(image, "RGBA")
	width, height = size
	cx, cy = width // 2, height // 2
	for i in range(9):
		angle = i * (2 * math.pi / 9)
		r = min(width, height) * 0.30
		x, y = cx + r * math.cos(angle), cy + r * math.sin(angle) * 0.62
		s = int(min(width, height) * (0.05 + 0.035 * (i % 3)))
		draw.ellipse([x - s, y - s, x + s, y + s], fill=palette[2] + (190,))
	draw.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], fill=palette[3] + (255,))
	return image


PIECES = [
	("portfolio-01.jpg", piece_arcs, [(26, 32, 66), (108, 61, 122), (240, 198, 116), (255, 255, 255)]),
	("portfolio-02.jpg", piece_bars, [(14, 58, 61), (36, 132, 112), (238, 241, 214), (255, 255, 255)]),
	("portfolio-03.jpg", piece_orbits, [(60, 18, 38), (168, 72, 63), (247, 224, 190), (255, 241, 214)]),
]

def write_images():
	for name, render, palette in PIECES:
		render((800, 600), palette).save(os.path.join(OUT, name), "JPEG", quality=72, optimize=True)


def write_video():
	width, height, frames = 480, 270, 75
	tmp = tempfile.mkdtemp(prefix="seed-frames-")
	try:
		for f in range(frames):
			t = f / frames
			image = Image.new("RGB", (width, height), (18, 20, 34))
			draw = ImageDraw.Draw(image, "RGBA")
			for y in range(height):
				k = y / height
				draw.line(
					[(0, y), (width, y)],
					fill=(int(18 + 40 * k), int(20 + 26 * k), int(34 + 70 * k)),
				)
			for i in range(6):
				angle = 2 * math.pi * (t + i / 6)
				x = width / 2 + (width * 0.30) * math.cos(angle)
				y = height / 2 + (height * 0.28) * math.sin(angle * 1.5)
				s = 14 + 8 * math.sin(angle * 2)
				colour = (240, 198, 116) if i % 2 else (236, 118, 118)
				draw.ellipse([x - s, y - s, x + s, y + s], fill=colour + (210,))
			draw.ellipse(
				[width / 2 - 9, height / 2 - 9, width / 2 + 9, height / 2 + 9],
				fill=(255, 255, 255, 230),
			)
			image.save(os.path.join(tmp, f"frame-{f:03d}.png"))

		#	+faststart moves the moov atom to the front, so the browser can
		#	start playing (and seeking) before the whole file has arrived.
		#	Without it the Range support in the /raw route buys nothing.
		subprocess.run(
			[
				"ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
				"-framerate", "15", "-i", os.path.join(tmp, "frame-%03d.png"),
				"-c:v", "libx264", "-profile:v", "baseline", "-pix_fmt", "yuv420p",
				"-crf", "30", "-movflags", "+faststart",
				os.path.join(OUT, "demo-reel.mp4"),
			],
			check=True,
		)
	finally:
		shutil.rmtree(tmp, ignore_errors=True)


def write_audio():
	subprocess.run(
		[
			"ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
			"-f", "lavfi", "-i", "sine=frequency=392:duration=1.2,volume=0.5",
			"-f", "lavfi", "-i", "sine=frequency=523:duration=1.2,volume=0.5",
			"-f", "lavfi", "-i", "sine=frequency=659:duration=1.6,volume=0.5",
			"-filter_complex",
			"[0][1][2]concat=n=3:v=0:a=1,afade=t=in:st=0:d=0.15,afade=t=out:st=3.6:d=0.4",
			"-c:a", "libmp3lame", "-b:a", "64k", "-ac", "1",
			os.path.join(OUT, "demo-track.mp3"),
		],
		check=True,
	)


if __name__ == "__main__":
	write_images()
	write_audio()
	write_video()
	total = 0
	for name in sorted(os.listdir(OUT)):
		if name.endswith((".py", ".md")):
			continue
		size = os.path.getsize(os.path.join(OUT, name))
		total += size
		print(f"{size:>8}  {name}")
	print(f"{total:>8}  total (budget: 1 MB)")
