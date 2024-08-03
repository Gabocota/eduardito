#!/bin/bash
npm uninstall @distube/ytdl-core
npm install @distube/ytdl-core
exec node bot.js
