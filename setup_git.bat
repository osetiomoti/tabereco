@echo off
set GIT_BIN="C:\Program Files\Git\cmd\git.exe"
%GIT_BIN% init
%GIT_BIN% config user.name "garizo0423-stack"
%GIT_BIN% config user.email "garizo0423@github.com"
%GIT_BIN% add .
%GIT_BIN% commit -m "Initial commit for MoguReco"
%GIT_BIN% branch -M main
%GIT_BIN% remote add origin https://github.com/garizo0423-stack/tabereco.git
%GIT_BIN% push -u origin main
