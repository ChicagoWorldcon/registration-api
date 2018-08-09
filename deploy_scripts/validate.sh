#!/bin/bash

has_memberships=$(curl -s -L http://localhost/api/purchase/prices | jq -r '. | has("memberships")')
if [[ "$has_memberships" == "true" ]]; then
    exit 0
else
    exit 1
fi
