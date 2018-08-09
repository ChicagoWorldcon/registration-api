#!/bin/bash

while true; do
    currently=$(systemctl is-active registration)
    if [ "$currently" == "active" ]; then
        break
    fi
    echo "Waiting for systemd to think our service is active; is currently $currently"
    sleep 1
done

has_memberships=$(curl -k -s -L http://localhost/api/purchase/prices | jq -r '. | has("memberships")')
if [[ "$has_memberships" == "true" ]]; then
    exit 0
else
    exit 1
fi
