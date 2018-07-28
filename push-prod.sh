#!/bin/bash

HERE=$(unset CDPATH; cd $(dirname $0); pwd)
output() {
    (
        cd $HERE/../infrastructure
        terraform output $1
    )
}

git push

host=$(output reg_public_dns)
ssh ec2-user@$host "(cd /opt/registration/registration-api && git pull)"
ssh ec2-user@$host "sudo systemctl restart registration" 
