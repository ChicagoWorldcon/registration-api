#!/bin/bash

HERE=$(unset CDPATH; cd $(dirname $0); pwd)
output() {
    (
        cd $HERE/../infrastructure
        terraform output $1
    )
}

ssh ec2-user@$(output reg_public_dns) "(cd registration-api && git pull)"

scp $HERE/docker-compose.aws.yml ec2-user@$(output reg_public_dns):registration-api/docker-compose.aws.yml

