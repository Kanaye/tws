import { h, render, Component } from "preact";
import Tws from "../../";
import Dexie from "dexie";
import VirtualList from "preact-virtual-list";
import { DateTime } from "luxon";
import "./styles.less";
const listener = function (m) {
	this.setState({
		history: this.state.history.concat([m])
	});
};

const renderPrivmsg = (m) => {
	const send = DateTime.fromMillis(Number(m.tags["tmi-sent-ts"]));
	return (
		<div class="message" title={m.raw}>
			<span class="date">[{send.setZone('Europe/Berlin').toFormat('TT')}]</span>
			<span class="nick" style={{ color: m.tags.color }}>{m.tags['display-name'] || m.prefix.user}</span>
			<span class="channel">{m.params[0]}</span>:
            <span class="message">{m.params[1]}</span>
		</div>
	);
}

class TwitchChatList extends Component {
	constructor() {
		super();
		this.state = { history: [], ping: null };
		this.onPrivmsg = listener.bind(this);
		this.onPong = (ping) => this.setState({ ping });
	}

	componentWillMount() {
		const { tws } = this.props;
		tws.twitch.on('privmsg', this.onPrivmsg);
		tws.on('pong', this.onPong);
	}

	componentWillUnmount() {
		const { tws } = this.props;
		tws.twitch.off('privmsg', this.onPrivmsg);
		tws.off('pong', this.onPong);
	}

	render(_, { history, ping }) {
		return (
			<div>
				<p>Ping: {null && ping.toFixed(3)}ms</p>
				<VirtualList class="message-list" overscanCount={150} data={history} renderRow={renderPrivmsg} />
			</div>);
	}
}

async function main() {
	const tws = new Tws();
	window.tws = tws;
	const db = new Dexie('log');
	window.db = db;
	db.version(2).stores({
		raw: '++id,text,type,date,msgtype'
	});
	tws.on('raw-send', (r) => {
		if (window.log) {
			console.groupCollapsed('<<<');
			console.log(r);
			console.groupEnd();
		}
		db.raw.add({
			text: r.message,
			type: "outgoing",
			date: (new Date()).toJSON()
		});

	});
	tws.on('error', (e) => { debugger; });
	tws.on('receive', (r) => {
		if (window.log) {
			if (r.command === "PRIVMSG") {
				console.groupCollapsed(`>>> %c ${r.tags['display-name'] || r.prefix.user}%c: [${r.params[0]}]%c: ${r.params[1]}`, `color: ${r.tags.color}`, 'color: #666;', 'color: inherit;');
			} else {
				console.groupCollapsed(`>>> '${r.raw}'`);
			}
			console.log(r);
			console.groupEnd();
		}
		const { raw: text, ...meta } = r;
		db.raw.add({
			text,
			meta,
			msgtype: meta.command,
			type: "incomming",
			date: (new Date()).toJSON()
		});
	});
	await tws.connect();
	await tws.join("#germandota");

	render(<TwitchChatList tws={tws} />, document.body);

	window.join = (channel) => {
		tws.join(`#${channel.trim().toLowerCase()}`)
			.then(() => console.log(`Joined ${channel}!`))
			.catch(() => console.log(`failed joining ${channel}!`))
	}
}

document.addEventListener('readystatechange', () => {
	if (document.readyState == 'interactive') {
		main().then(console.log).catch((e) => console.error(e));
	}
});