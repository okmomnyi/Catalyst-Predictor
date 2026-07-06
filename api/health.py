import os
import sys

# Ensure backend package is importable
sys.path.append(os.path.join(os.path.dirname(__file__), ".." , "backend"))

from flask import Flask, jsonify

app = Flask(__name__)


@app.route('/', methods=['GET'])
def handler():
    return jsonify({
        "status": "ok",
        "model": os.getenv("MODEL_ID", "deepseek-ai/deepseek-r1"),
        "version": "1.0.0",
    })
