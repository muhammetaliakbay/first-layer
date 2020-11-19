#!/usr/bin/node

import {node} from "./node";
import {getParameters} from "./parameters";

console.log('First Layer Node / ' + node.identity);

function connectInitials() {
    getParameters('--connect').forEach(
        (url) => {
            node.connect(url).catch(err => void 0);
        }
    );
}
connectInitials();
setInterval(connectInitials, 10000);

import './listeners';
import './commander';
