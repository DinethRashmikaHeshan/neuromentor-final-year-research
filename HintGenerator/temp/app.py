import math
import torch
import torch.nn as nn
from fastapi import FastAPI
from pydantic import BaseModel
from tokenizers import ByteLevelBPETokenizer

# ---------- PATHS ----------
MODEL_PATH = "saved/best_seq2seq_transformer.pt"
TOKENIZER_DIR = "tokenizer"

# ---------- MUST MATCH TRAINING ----------
D_MODEL = 256
NHEAD = 4
NUM_LAYERS = 3
DIM_FF = 512
DROPOUT = 0.1
MAX_INP_LEN = 512
MAX_OUT_LEN = 96
# --------------------------------------

device = "cuda" if torch.cuda.is_available() else "cpu"

# Load tokenizer
tokenizer = ByteLevelBPETokenizer(
    f"{TOKENIZER_DIR}/vocab.json",
    f"{TOKENIZER_DIR}/merges.txt"
)

def tid(tok: str) -> int:
    return tokenizer.token_to_id(tok)

PAD_ID = tid("<pad>")
BOS_ID = tid("<bos>")
EOS_ID = tid("<eos>")

def encode(text: str, max_len: int):
    ids = tokenizer.encode(text).ids
    ids = [BOS_ID] + ids[: max_len - 2] + [EOS_ID]
    return ids

def decode(ids):
    out = []
    for t in ids:
        if t == EOS_ID:
            break
        if t not in (BOS_ID, PAD_ID):
            out.append(t)
    return tokenizer.decode(out)

class PositionalEncoding(nn.Module):
    def __init__(self, d_model, dropout=0.1, max_len=2048):
        super().__init__()
        self.dropout = nn.Dropout(dropout)
        pe = torch.zeros(max_len, d_model)
        pos = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(pos * div)
        pe[:, 1::2] = torch.cos(pos * div)
        self.register_buffer("pe", pe.unsqueeze(0))

    def forward(self, x):
        return self.dropout(x + self.pe[:, :x.size(1), :])

class Seq2SeqTransformer(nn.Module):
    def __init__(self, vocab_size, d_model=256, nhead=4, num_layers=3, dim_ff=512, dropout=0.1):
        super().__init__()
        self.d_model = d_model
        self.src_emb = nn.Embedding(vocab_size, d_model, padding_idx=PAD_ID)
        self.tgt_emb = nn.Embedding(vocab_size, d_model, padding_idx=PAD_ID)
        self.pos = PositionalEncoding(d_model, dropout)
        self.tf = nn.Transformer(
            d_model=d_model,
            nhead=nhead,
            num_encoder_layers=num_layers,
            num_decoder_layers=num_layers,
            dim_feedforward=dim_ff,
            dropout=dropout,
            batch_first=True
        )
        self.out = nn.Linear(d_model, vocab_size)

    def make_tgt_mask(self, tgt_len):
        return torch.triu(torch.ones(tgt_len, tgt_len, device=device), diagonal=1).bool()

    def forward(self, src, tgt):
        src_key_padding = (src == PAD_ID)
        tgt_key_padding = (tgt == PAD_ID)
        tgt_mask = self.make_tgt_mask(tgt.size(1))

        src_e = self.pos(self.src_emb(src) * math.sqrt(self.d_model))
        tgt_e = self.pos(self.tgt_emb(tgt) * math.sqrt(self.d_model))

        h = self.tf(
            src_e, tgt_e,
            tgt_mask=tgt_mask,
            src_key_padding_mask=src_key_padding,
            tgt_key_padding_mask=tgt_key_padding,
            memory_key_padding_mask=src_key_padding
        )
        return self.out(h)

# Build + load model
vocab_size = tokenizer.get_vocab_size()
model = Seq2SeqTransformer(
    vocab_size=vocab_size,
    d_model=D_MODEL,
    nhead=NHEAD,
    num_layers=NUM_LAYERS,
    dim_ff=DIM_FF,
    dropout=DROPOUT
).to(device)

state_dict = torch.load(MODEL_PATH, map_location=device)
model.load_state_dict(state_dict)
model.eval()

@torch.no_grad()
def generate_hint(code_text: str, state: str, attempt: int, max_new_tokens: int = 80):
    state = (state or "CONFUSE").upper()
    if state not in ["FOCUS", "CONFUSE", "OVERLOAD"]:
        state = "CONFUSE"

    attempt = int(attempt)
    if attempt not in [1, 2, 3]:
        attempt = 1

    src_text = f"<STATE_{state}> <ATTEMPT_{attempt}>\n{code_text}"
    src = torch.tensor([encode(src_text, MAX_INP_LEN)], dtype=torch.long).to(device)

    tgt = torch.tensor([[BOS_ID]], dtype=torch.long).to(device)

    for _ in range(max_new_tokens):
        logits = model(src, tgt)
        next_id = torch.argmax(logits[:, -1, :], dim=-1, keepdim=True)
        tgt = torch.cat([tgt, next_id], dim=1)
        if next_id.item() == EOS_ID:
            break

    return decode(tgt[0].tolist())

# ---------- API ----------
app = FastAPI(title="C Hint API (Local)")

class HintRequest(BaseModel):
    code: str
    state: str
    attempt: int = 1
    max_new_tokens: int = 80

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/generate")
def generate(req: HintRequest):
    hint = generate_hint(req.code, req.state, req.attempt, req.max_new_tokens)
    return {"hint": hint}
