manual-region.webm is original synthetic test media: 160×90, 20 VP9 frames at
10 fps, blue background with a yellow rectangle (x=40..99, y=20..64). No real
person or private media. Generated locally from an RGB PNG sequence using the
local ffmpeg encoder (`-f rawvideo -pixel_format rgb24 -video_size 160x90
-framerate 10 -vf loop=loop=19:size=1:start=0 -t 2 -c:v libvpx-vp9
-pix_fmt yuv420p`). It exercises actual browser decoding rather than mocked
HTMLMediaElement metadata. It is not a model detection or tracking benchmark.
