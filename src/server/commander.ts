import {DataListener} from "../subject";
import {SubjectAddress} from "../subject-address";
import readline from "readline";
import {parseJSONs} from "../human";
import {getParameters} from "./parameters";
import {node} from "./node";

const dataListener: DataListener = (subjectAddress, data, hops) => {
    console.log(subjectAddress.toString(), '0x' + data.toString('hex'), hops.length + ' h.');
};

function subscribe(address: SubjectAddress) {
    node.interest(address, dataListener, 5);
}

function unsubscribe(address: SubjectAddress) {
    node.interest(address, dataListener, 0);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '#1LNode> '
});

rl.prompt();
rl.on('line', async line => {

    try {
        const parameters = parseJSONs(line);

        if (parameters.length > 0) {
            const [cmd, ...args] = parameters;

            if (cmd === 'connect') {
                const url: string = args[0];
                const connection = await node.connect(url);
                console.log('Connected ' + connection.identity.bytes.toString('hex'));
            } else if (cmd === 'pub') {
                const address = args[0] instanceof Buffer ? new SubjectAddress(args[0]) : await SubjectAddress.resolve(args[0]);
                const data = args[1] instanceof Buffer ? args[1] : Buffer.from(args[1], 'utf8');
                node.publish(address, data, []);
            } else if (cmd === 'sub') {
                const address = args[0] instanceof Buffer ? new SubjectAddress(args[0]) : await SubjectAddress.resolve(args[0]);
                subscribe(address);
            } else if (cmd === 'unsub') {
                const address = args[0] instanceof Buffer ? new SubjectAddress(args[0]) : await SubjectAddress.resolve(args[0]);
                unsubscribe(address);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        rl.prompt();
    }
});

getParameters('--sub').forEach(
    async (text) => {
        const params = parseJSONs(text);
        const address = params[0] instanceof Buffer ? new SubjectAddress(params[0]) : await SubjectAddress.resolve(params[0]);
        subscribe(address);
    }
);
