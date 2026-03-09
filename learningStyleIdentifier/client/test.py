import random
from fastapi import FastAPI

app = FastAPI()

@app.get("/current_vark")
def get_vark():
    return {"vark": random.choice(["A","K"])}