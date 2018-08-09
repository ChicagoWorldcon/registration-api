#!/bin/bash

cd /opt/registration/registration-api
find . -name wait-for-it.sh -exec chmod -v +x {} \;
chmod -v +x dc

