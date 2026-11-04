#!/bin/bash
# v.sh <course> <from> <to> : show todo lines as  n | english | arabic
awk -F'\t' -v a=$2 -v b=$3 '$1>=a && $1<=b {print $1"|"$3"|"$4}' "$(dirname $0)/$1/todo.tsv"
