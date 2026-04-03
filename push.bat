@echo off
set GIT_BIN="C:\Program Files\Git\cmd\git.exe"
%GIT_BIN% add .
%GIT_BIN% commit -m "Implement optional photos, fix mobile layout, restrict home timeline, enforce JP maps"
%GIT_BIN% push
