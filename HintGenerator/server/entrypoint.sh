#!/bin/bash

# Read API key from Docker secret if available
if [ -f /run/secrets/api_key ]; then
    export key=$(cat /run/secrets/api_key)
fi

# Run uvicorn
exec uvicorn main:app --host 0.0.0.0 --port 8000
