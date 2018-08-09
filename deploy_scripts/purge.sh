#!/bin/bash

# If the directory exists, purge it
if [ -d /opt/registration/registration-api ]; then
    sudo rm -rf /opt/registration/registration-api
fi
