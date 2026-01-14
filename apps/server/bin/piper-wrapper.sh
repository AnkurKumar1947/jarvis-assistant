#!/bin/bash
# Piper wrapper script for Jarvis Assistant
export DYLD_LIBRARY_PATH="/Users/ankurkumar/Desktop/Celigo_repos/integrator-workers/jarvis-assistant/apps/server/scripts/../bin:$DYLD_LIBRARY_PATH"
export LD_LIBRARY_PATH="/Users/ankurkumar/Desktop/Celigo_repos/integrator-workers/jarvis-assistant/apps/server/scripts/../bin:$LD_LIBRARY_PATH"
"/Users/ankurkumar/Desktop/Celigo_repos/integrator-workers/jarvis-assistant/apps/server/scripts/../bin/piper" "$@"
