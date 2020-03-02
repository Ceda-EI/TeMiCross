import { join } from 'path';
import { readdirSync } from 'fs';
import { createInterface } from 'readline';
import parse from '../dataparser';

import {
	head,
	map,
	mapObjIndexed
} from 'ramda';

const loadMessages = type =>
	readdirSync(join(__dirname, `/${type}/messages`))
		.reduce((result, file) => ({
			...result,
			// eslint-disable-next-line global-require
			[file]: require(join(__dirname, `/${type}/messages`, file))
		}), {});

const getMessages = type => ({
	// eslint-disable-next-line global-require
	prefix: require(`./${type}/prefix`),
	messages: type === 'default'
		? loadMessages(type)
		: {
			...loadMessages('default'),
			...loadMessages(type)
		}
});

const fixType = t =>
	[ 'default', 'old-spigot' ].includes(t)
		? t
		: 'default';

const Parser = (type, stream) => {
	const { prefix, messages } = getMessages(fixType(type));
	const rl = createInterface({ input: stream });

	const handlers = mapObjIndexed((regexp, file) => ({
		regexp: new RegExp(prefix + regexp),
		type: head(file.split('.'))
	}), messages);

	rl.on('line', line =>
		map(handler => {
			const result = handler.regexp.exec(line);
			if (handler.type === 'data') {
				return result && rl.emit(handler.type, {
					...result.groups,
					data: parse(result.groups.data),
					type: handler.type
				});
			}
			return result && rl.emit(handler.type, {
				...result.groups,
				type: handler.type
			});
		}, handlers));

	return rl;
};

export default Parser;
