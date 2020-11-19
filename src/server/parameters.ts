export function getParameters(header: string): string[] {
    const values: string[] = [];
    for (let i = 0; i < process.argv.length;) {
        if (process.argv[i ++] === header) {
            values.push(process.argv[i ++]);
        }
    }
    return values;
}

export function hasFlag(header: string): boolean {
    return process.argv.includes(header);
}