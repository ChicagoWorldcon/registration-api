#!/bin/bash

while true; do
    currently=$(systemctl is-active registration)
    if [ "$currently" == "active" ]; then
        break
    fi
    echo "Waiting for systemd to think our service is active; is currently $currently"
    sleep 1
done

service_up() {
    local has_memberships=$(curl -k -s -L http://localhost/api/purchase/prices | jq -r '. | has("memberships")')
    if [[ "$has_memberships" == "true" ]]; then
        return 0
    else
        return 1
    fi
}

export -f service_up
until timeout 300 bash -c service_up; do
    echo "Trying again..."
done
