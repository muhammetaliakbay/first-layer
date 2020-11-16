const stringLiteralsRegex = /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/gm;
function hideStringLiterals(text: string): string {
    return text.replace(stringLiteralsRegex, literal => '?'.repeat(literal.length))
}
const mostInnerBlockRegex = /{[^{}]*}|\[[^\[\]]*\]/gm;
function hideBlocks(text: string): string {
    let alive: boolean;
    do {
        alive = false;
        text = text.replace(
            mostInnerBlockRegex,
            block => {
                alive = true;
                return '?'.repeat(block.length);
            }
        )
    } while (alive);

    return text;
}

function splitJSONs(jsons: string): string[] {
    const template = hideBlocks(hideStringLiterals(jsons));

    if (jsons.length !== template.length) {
        throw new Error('BUG.');
    }

    const parts: string[] = [];

    const templatePartsRegex = /([^\s]+)/gm; // must be compiled for every time
    let match: RegExpExecArray | null;
    while ((match = templatePartsRegex.exec(template)) != null) {
        const index = match.index;
        const length = match[0].length;

        parts.push(jsons.substr(index, length));
    }

    return parts;
}

const realJsonFirstChars = ["'", '"', '{', '['];
export function parseJSONs(jsons: string): any[] {
    const parts = splitJSONs(jsons);

    return parts.map(
        part => {
            const firstChar = part[0];
            if (part.startsWith('16#')) {
                return Buffer.from(part.substr(3), 'hex');
            } else if (part.startsWith('64#')) {
                return Buffer.from(part.substr(3), 'base64');
            } else if (realJsonFirstChars.includes(firstChar)) {
                return JSON.parse(part);
            } else {
                const number = Number(part);
                if (isNaN(number)) {
                    return part;
                } else {
                    return number;
                }
            }
        }
    );
}