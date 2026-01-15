#!/bin/bash
# Keep Mac awake - managed by PM2
# This just runs caffeinate which prevents sleep
exec caffeinate -s -i -d
