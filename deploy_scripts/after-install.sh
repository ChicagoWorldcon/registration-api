#!/bin/bash

chown -R ec2-user /opt/registration/registration-api
cd /opt/registration/registration-api
find . -name wait-for-it.sh -exec chmod -v +x {} \;
chmod -v +x dc

