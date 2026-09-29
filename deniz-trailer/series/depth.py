"""Estimates a depth map (MiDaS v2.1 small) for each illustration; writes <name>.depth.png next to a copy."""
import sys, numpy as np, onnxruntime as ort
from PIL import Image
sess = ort.InferenceSession(sys.argv[1], providers=['CPUExecutionProvider'])
inp = sess.get_inputs()[0]
for src, dst in zip(sys.argv[2::2], sys.argv[3::2]):
    im = Image.open(src).convert('RGB'); W, H = im.size
    x = np.asarray(im.resize((256, 256), Image.BICUBIC), dtype=np.float32) / 255.
    x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    x = x.transpose(2, 0, 1)[None].astype(np.float32)
    d = sess.run(None, {inp.name: x})[0][0]
    d = (d - d.min()) / (d.max() - d.min() + 1e-6)
    Image.fromarray((d * 255).astype(np.uint8)).resize((W // 2, H // 2), Image.BICUBIC).save(dst)
    print(dst)
