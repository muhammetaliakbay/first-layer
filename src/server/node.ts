import {createLayerNode} from "../layer-node";
import {hasFlag} from "./parameters";

const noDiscover = hasFlag('--no-discover');
if (noDiscover) {
    console.log('--no-discover');
}

export const node = createLayerNode({
    discoverConnections: !noDiscover
});
