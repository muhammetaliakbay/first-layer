#!/usr/bin/node

import * as cluster from "cluster";

if (cluster.isMaster) {
    import('./server-master');
} else {
    import('./server-worker');
}
