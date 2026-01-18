#!/bin/bash
set -e
gcc compute_route.c -o compute_route -lm
echo "✅ Native C algorithm compiled: ./compute_route"


