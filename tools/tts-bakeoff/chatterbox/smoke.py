"""Chatterbox smoke test on watson-1 (CPU-only). Loads the model, renders one
short sentence, reports wall-clock and real-time factor."""
import os, time, torch, torchaudio
t0 = time.time()
from chatterbox.tts import ChatterboxTTS
print(f"[{time.time()-t0:6.1f}s] import done; torch {torch.__version__} cuda={torch.cuda.is_available()} threads={torch.get_num_threads()}", flush=True)
m = ChatterboxTTS.from_pretrained(device="cpu")
print(f"[{time.time()-t0:6.1f}s] model loaded (sr={m.sr})", flush=True)
text = "We moved to the city."
t1 = time.time()
torch.manual_seed(1234)
wav = m.generate(text, temperature=0.1)
gen = time.time() - t1
dur = wav.shape[-1] / m.sr
print(f"[{time.time()-t0:6.1f}s] generated {dur:.2f}s audio in {gen:.1f}s  RTF={gen/dur:.1f}x realtime", flush=True)
os.makedirs("/home/tomcassidy/.chatterbox-trial/out", exist_ok=True)
torchaudio.save("/home/tomcassidy/.chatterbox-trial/out/smoke.wav", wav, m.sr)
print("SMOKE OK", flush=True)
